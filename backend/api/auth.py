from fastapi import Depends, HTTPException, status, Header
from typing import Optional
import firebase_admin
from firebase_admin import auth
from firebase_config import get_firestore_client
import logging
import traceback
import time
import json
import os
import requests

# Configure logging - set to DEBUG for detailed output
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Attempt Firebase initialization on module load, but gracefully handle failure
try:
    logger.debug("Attempting to get Firestore client in auth.py at module load...")
    db = get_firestore_client() 
    if db:
        logger.info("Firebase initialized and Firestore client obtained successfully in auth.py module load.")
    else:
        logger.warning("Firestore client was None after get_firestore_client() call in auth.py module load.")
    
    # Minimal auth check
    try:
        auth.get_user("non-existent-uid-for-init-check") # This should fail with UserNotFoundError
        logger.info("Firebase Auth seems to be working (get_user test).")
    except auth.UserNotFoundError:
        logger.info("Firebase Auth UserNotFoundError on test UID is EXPECTED and indicates auth is likely working.")
    except firebase_admin.exceptions.FirebaseError as fe:
        logger.error(f"FirebaseError during auth init check: {fe}. This might indicate a problem with the Admin SDK setup.", exc_info=True)
    except Exception as e:
        logger.error(f"Unexpected error during auth init check: {e}", exc_info=True)

except Exception as e:
    logger.error(f"CRITICAL: Failed to initialize Firebase or Firestore in auth.py module load: {e}", exc_info=True)
    # Not raising here to allow app to start and report errors via API if possible

# Function to safely decode a JWT token without failing on malformation
def safe_decode_token(token):
    logger.debug(f"safe_decode_token called for token: {token[:30]}..." if token else "None")
    try:
        if not token or not isinstance(token, str) or len(token.split('.')) != 3:
            logger.warning(f"Token is not a valid JWT format. Length: {len(token) if token else 'N/A'}, Parts: {len(token.split('.')) if token and isinstance(token, str) else 'N/A'}")
            return None
        payload_b64 = token.split('.')[1]
        padding = len(payload_b64) % 4
        if padding:
            payload_b64 += '=' * (4 - padding)
        import base64
        decoded_payload = base64.urlsafe_b64decode(payload_b64).decode('utf-8')
        decoded = json.loads(decoded_payload)
        logger.debug(f"JWT payload decoded: issuer={decoded.get('iss')}, subject={decoded.get('sub')}, email={decoded.get('email')}")
        return decoded
    except Exception as e:
        logger.error(f"Could not decode JWT payload: {e}. Token snippet: {token[:30] if token else 'N/A'}...", exc_info=True)
        return None

# Verify a token directly with Google
def verify_with_google(token):
    logger.debug(f"verify_with_google called for token: {token[:30]}..." if token else "None")
    try:
        response = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}", timeout=5)
        logger.debug(f"Google tokeninfo response status: {response.status_code}, content: {response.text[:200]}")
        if response.status_code == 200:
            token_info = response.json()
            logger.info(f"Token successfully verified with Google: email={token_info.get('email')}, sub={token_info.get('sub')}")
            return token_info
        else:
            logger.warning(f"Google token verification failed: {response.status_code} - {response.text}")
            return None
    except requests.exceptions.Timeout:
        logger.error("Timeout verifying token with Google.", exc_info=True)
        return None
    except Exception as e:
        logger.error(f"Error verifying token with Google: {e}", exc_info=True)
        return None

# Context manager for timing operations
class TimingContext:
    def __init__(self, operation_name):
        self.operation_name = operation_name
        
    def __enter__(self):
        self.start_time = time.time()
        logger.debug(f"Starting operation: {self.operation_name}")
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        execution_time = time.time() - self.start_time
        logger.debug(f"Finished operation: {self.operation_name} in {execution_time:.4f}s. Success: {not exc_type}")

# Verify Firebase ID token with extensive error handling and diagnostics
async def verify_token(authorization: Optional[str] = Header(None)):
    logger.debug(f"verify_token called. Authorization header: {authorization[:30] if authorization else 'None'}...")
    if not firebase_admin._apps:
        logger.critical("Firebase Admin SDK is NOT INITIALIZED when verify_token is called. This is a SEVERE issue.")
        # Attempt re-initialization, though this is a band-aid
        try:
            get_firestore_client() # This will attempt to initialize
            logger.info("Re-attempted Firebase initialization from verify_token.")
            if not firebase_admin._apps:
                 logger.error("Re-initialization attempt FAILED from verify_token.")
                 raise HTTPException(status_code=503, detail="Firebase Admin SDK not initialized. Please try again later.")
        except Exception as reinit_e:
            logger.error(f"Error during re-initialization attempt: {reinit_e}", exc_info=True)
            raise HTTPException(status_code=503, detail="Firebase Admin SDK failed to initialize. Please try again later.")

    if not authorization:
        logger.warning("Authorization header missing")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")

    token = None
    try:
        with TimingContext("Token extraction and initial validation"):
            if " " in authorization:
                scheme, token = authorization.split(" ", 1)
                if scheme.lower() != "bearer":
                    logger.warning(f"Invalid authentication scheme: {scheme}. Expected 'Bearer'.")
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme, expected 'Bearer'")
            else:
                token = authorization
                logger.debug("Authorization header provided without scheme, assuming Bearer token.")

            if not token or token.lower() == "null" or token.lower() == "undefined":
                logger.warning(f"Token is null, undefined, or empty: '{token}'")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token: token is null, undefined or empty")
            
            logger.debug(f"Token extracted for verification: {token[:30]}...")
            token_data_preview = safe_decode_token(token)
            if not token_data_preview:
                logger.warning("Token could not be safely decoded (preview). This often indicates a malformed token.")
                # Don't raise yet, let verify_id_token handle it or Google fallback

        with TimingContext("Firebase Auth verify_id_token"):
            try:
                decoded_token = auth.verify_id_token(token)
                user_email = decoded_token.get("email", "unknown")
                user_id = decoded_token.get("uid", "unknown")
                logger.info(f"Successfully verified token with Firebase SDK for user: {user_email} (ID: {user_id})")
                if not user_id or user_id == "unknown":
                    logger.error("Token verified by Firebase SDK but UID is missing or invalid.")
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token: UID missing after Firebase verification")
                return {"uid": user_id, "email": user_email, "name": decoded_token.get("name", ""), "picture": decoded_token.get("picture", "")}
            except firebase_admin.exceptions.FirebaseError as fe:
                 # Broad catch for Firebase specific errors for better logging
                logger.error(f"FirebaseError during verify_id_token: {type(fe).__name__} - {fe}. Token: {token[:30]}...", exc_info=True)
                # Specific handling for common Firebase auth errors
                if isinstance(fe, auth.InvalidIdTokenError):
                    detail = f"Invalid ID token: {str(fe)} / Check token signature and project ID."
                elif isinstance(fe, auth.ExpiredIdTokenError):
                    detail = "Firebase ID token has expired. Please login again."
                elif isinstance(fe, auth.RevokedIdTokenError):
                    detail = "Firebase ID token has been revoked."
                elif isinstance(fe, auth.CertificateFetchError):
                    detail = "Could not fetch Firebase public keys. Check network or Firebase status."
                else:
                    detail = f"Firebase authentication error: {str(fe)}"
                
                logger.info("Attempting Google fallback due to Firebase SDK verification failure.")
                google_info = verify_with_google(token)
                if google_info and google_info.get('sub'):
                    logger.info(f"Successfully verified with Google fallback: {google_info.get('email')}")
                    return {"uid": google_info.get('sub'), "email": google_info.get('email', ''), "name": google_info.get('name', ''), "picture": google_info.get('picture', '')}
                else:
                    logger.warning("Google fallback also failed or returned no user info.")
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail) # Raise with original Firebase detail
            except ValueError as ve:
                # ValueError can be raised for non-string tokens or other issues before Firebase SDK calls
                logger.error(f"ValueError during token processing (possibly before Firebase SDK): {ve}. Token: {token[:30]}...", exc_info=True)
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token format or value: {str(ve)}")

    except HTTPException: # Re-raise HTTPExceptions directly
        raise
    except Exception as e:
        logger.critical(f"CRITICAL Unhandled exception in verify_token: {e}. Token: {token[:30] if token else 'N/A'}...", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Critical internal authentication error: {str(e)}")

# Dependency for protected routes
async def get_current_user(user_data = Depends(verify_token)):
    logger.debug(f"get_current_user called with user_data: {user_data}")
    if not user_data or not isinstance(user_data, dict) or "uid" not in user_data:
        logger.error(f"User data missing or invalid after token verification. Data: {user_data}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User authentication failed due to invalid data post-verification")
    logger.info(f"Current user identified: {user_data.get('email', user_data.get('uid'))}")
    return user_data 