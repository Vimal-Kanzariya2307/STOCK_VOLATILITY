from datetime import datetime, timedelta, timezone

import jwt
from pymongo import ASCENDING, MongoClient
from pymongo.errors import DuplicateKeyError
from werkzeug.security import check_password_hash, generate_password_hash

from config import JWT_EXPIRY_HOURS, JWT_SECRET, MONGODB_DB, MONGODB_URI

_client = None
_db = None


def get_db():
    global _client, _db
    if _db is None:
        _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        _db = _client[MONGODB_DB]
        _db.users.create_index([("email", ASCENDING)], unique=True)
    return _db

#  get user details by email
def register_user(name, email, password):
    name = (name or "").strip()
    email = (email or "").strip().lower()
    password = password or ""

    if not name or not email or not password:
        return None, "All fields are required"
    if len(password) < 6:
        return None, "Password must be at least 6 characters"

    user_doc = {
        "name": name,
        "email": email,
        "password_hash": generate_password_hash(password),
        "created_at": datetime.now(timezone.utc),
    }

    try:
        result = get_db().users.insert_one(user_doc)
        return {
            "id": str(result.inserted_id),
            "name": name,
            "email": email,
        }, None
    except DuplicateKeyError:
        return None, "Email already registered"

#authenticate user with email and password
def authenticate_user(email, password):
    email = (email or "").strip().lower()
    password = password or ""

    user = get_db().users.find_one({"email": email})
    if not user or not check_password_hash(user["password_hash"], password):
        return None, None, "Invalid email or password"

    token = create_token(str(user["_id"]), user["email"], user["name"])
    user_info = {"name": user["name"], "email": user["email"]}
    return token, user_info, None

#create token for user with user_id, email and name
def create_token(user_id, email, name):
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

# It is use  Varification token
def verify_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return {
            "id": payload["sub"],
            "email": payload["email"],
            "name": payload["name"],
        }, None
    except jwt.ExpiredSignatureError:
        return None, "Session expired. Please login again."
    except jwt.InvalidTokenError:
        return None, "Invalid session. Please login again."
# hellow 
