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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firebase on module load for better performance in serverless
try:
    # Force initialization of Firebase by getting the client
    db = get_firestore_client()
    logger.info("Firebase initialized successfully in auth.py")
    
    # Check if we can make an auth call to verify setup
    test_uid = "test-uid-for-verification"
    try:
        # This will fail with a reasonable error if auth is properly initialized
        auth.get_user(test_uid)
    except auth.UserNotFoundError:
        # This is good! Auth is working but user doesn't exist
        logger.info("Firebase Auth verified successfully")
    except Exception as e:
        # Some other error occurred with auth
        logger.warning(f"Firebase Auth call failed but not fatally: {e}")
except Exception as e:
    # Log error but don't crash - we'll handle this in the request handlers
    logger.error(f"Failed to initialize Firebase in auth.py: {e}")
    logger.error(traceback.format_exc())

# Function to safely decode a JWT token without failing on malformation
def safe_decode_token(token):
    """Safely decode a JWT token without raising exceptions for format issues"""
    try:
        # Basic structure check
        if not token or len(token.split('.')) != 3:
            logger.warning("Token is not a valid JWT format (need 3 parts)")
            return None
            
        # Try to decode the payload part (middle)
        payload = token.split('.')[1]
        # Add padding if needed
        padding = len(payload) % 4
        if padding:
            payload += '=' * (4 - padding)
        
        try:
            import base64
            decoded = json.loads(base64.urlsafe_b64decode(payload).decode('utf-8'))
            logger.info(f"JWT payload preview: issuer={decoded.get('iss', 'unknown')}, subject={decoded.get('sub', 'unknown')}")
            return decoded
        except Exception as e:
            logger.warning(f"Could not decode JWT payload: {e}")
            return None
    except Exception as e:
        logger.warning(f"Error during token inspection: {e}")
        return None

# Verify a token directly with Google
def verify_with_google(token):
    try:
        # Use Google's token info endpoint as a fallback
        response = requests.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={token}",
            timeout=5
        )
        
        if response.status_code == 200:
            token_info = response.json()
            logger.info(f"Token verified with Google: {token_info.get('email', 'unknown')}")
            return token_info
        else:
            logger.warning(f"Google token verification failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error verifying token with Google: {e}")
        return None

# Context manager for timing operations
class TimingContext:
    def __init__(self, operation_name):
        self.operation_name = operation_name
        
    def __enter__(self):
        self.start_time = time.time()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        execution_time = time.time() - self.start_time
        logger.info(f"{self.operation_name} took {execution_time:.2f} seconds")

# Verify Firebase ID token with extensive error handling and diagnostics
async def verify_token(authorization: Optional[str] = Header(None)):
    # Special debugging logic for Vercel environment
    IS_VERCEL = os.environ.get('VERCEL') == '1'
    if IS_VERCEL:
        logger.info("Running in Vercel environment")
    
    # Full request logging in debug mode
    logger.debug(f"Authorization header received: {authorization[:20]}..." if authorization else "None")
    
    if not authorization:
        logger.warning("Authorization header missing")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
        )
    
    try:
        with TimingContext("Token verification"):
            # Extract the token from the Authorization header
            token = None
            if " " in authorization:
                scheme, token = authorization.split(" ", 1)
                if scheme.lower() != "bearer":
                    logger.warning(f"Invalid authentication scheme: {scheme}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid authentication scheme, expected 'Bearer'",
                    )
            else:
                token = authorization
                logger.info("Authorization header provided without scheme, assuming Bearer")
                
            # Check token format
            if not token or token == "null" or token == "undefined":
                logger.warning("Token is null, undefined, or empty")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, 
                    detail="Invalid token: token is null or undefined"
                )
                
            # Do basic token inspection for debugging
            token_data = safe_decode_token(token)
            if token_data:
                logger.info(f"Token looks like a valid JWT, issued for: {token_data.get('email', 'unknown')}")
            else:
                logger.warning("Token does not appear to be a valid JWT")
            
            # Verify the token
            try:
                # Verify with Firebase Auth
                decoded_token = auth.verify_id_token(token)
                
                # Log successful verification
                user_email = decoded_token.get("email", "unknown")
                user_id = decoded_token.get("uid", "unknown")
                logger.info(f"Successfully verified token for user: {user_email} (ID: {user_id})")
                
                # Ensure we have at least a UID
                if not decoded_token.get("uid"):
                    logger.error("Token verified but no UID found in decoded token")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid token: missing user ID",
                    )
                
                return {
                    "uid": decoded_token["uid"],
                    "email": decoded_token.get("email", ""),
                    "name": decoded_token.get("name", ""),
                    "picture": decoded_token.get("picture", "")
                }
            except ValueError as e:
                logger.error(f"Invalid token format: {e}")
                # Try fallback verification with Google
                google_info = verify_with_google(token)
                if google_info and google_info.get('sub'):
                    logger.info(f"Successfully verified with Google fallback: {google_info.get('email')}")
                    return {
                        "uid": google_info.get('sub'),
                        "email": google_info.get('email', ''),
                        "name": google_info.get('name', ''),
                        "picture": google_info.get('picture', '')
                    }
                
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid token format: {str(e)}",
                )
            except auth.InvalidIdTokenError as e:
                logger.error(f"Invalid ID token: {e}")
                # Try fallback verification with Google
                google_info = verify_with_google(token)
                if google_info and google_info.get('sub'):
                    logger.info(f"Successfully verified with Google fallback: {google_info.get('email')}")
                    return {
                        "uid": google_info.get('sub'),
                        "email": google_info.get('email', ''),
                        "name": google_info.get('name', ''),
                        "picture": google_info.get('picture', '')
                    }
                    
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid ID token: {str(e)}",
                )
            except auth.ExpiredIdTokenError:
                logger.error("Firebase ID token has expired")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Firebase ID token has expired. Please login again.",
                )
            except auth.RevokedIdTokenError:
                logger.error("Firebase ID token has been revoked")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Firebase ID token has been revoked",
                )
            except auth.CertificateFetchError as e:
                logger.error(f"Failed to fetch certificates: {e}")
                # Try fallback verification with Google
                google_info = verify_with_google(token)
                if google_info and google_info.get('sub'):
                    logger.info(f"Successfully verified with Google fallback: {google_info.get('email')}")
                    return {
                        "uid": google_info.get('sub'),
                        "email": google_info.get('email', ''),
                        "name": google_info.get('name', ''),
                        "picture": google_info.get('picture', '')
                    }
                
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Authentication server temporarily unavailable",
                )
    except HTTPException:
        raise
    except Exception as e:
        error_details = traceback.format_exc()
        logger.error(f"Authentication error: {e}")
        logger.error(f"Error details:\n{error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}",
        )

# Dependency for protected routes
async def get_current_user(user_data = Depends(verify_token)):
    if not user_data or "uid" not in user_data:
        logger.error("User data missing or invalid after token verification")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User authentication failed",
        )
    return user_data 