from fastapi import Depends, HTTPException, status, Header
from typing import Optional
import firebase_admin
from firebase_admin import auth
from firebase_config import get_firestore_client
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get Firestore client to ensure Firebase is initialized
try:
    db = get_firestore_client()
    logger.info("Firebase initialized successfully in auth.py")
except Exception as e:
    logger.error(f"Failed to initialize Firebase in auth.py: {e}")
    logger.error(traceback.format_exc())

# Verify Firebase ID token
async def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization:
        logger.warning("Authorization header missing")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
        )
    
    try:
        # Extract the token from the Authorization header
        token = None
        if " " in authorization:
            scheme, token = authorization.split(" ", 1)
            if scheme.lower() != "bearer":
                logger.warning(f"Invalid authentication scheme: {scheme}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication scheme",
                )
        else:
            token = authorization
            
        logger.info("Attempting to verify Firebase token")
            
        # Verify the token
        try:
            decoded_token = auth.verify_id_token(token)
            logger.info(f"Successfully verified token for user: {decoded_token.get('email', 'unknown')}")
            
            return {
                "uid": decoded_token["uid"],
                "email": decoded_token.get("email", ""),
                "name": decoded_token.get("name", "")
            }
        except ValueError as e:
            logger.error(f"Invalid token format: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token format: {str(e)}",
            )
        except auth.InvalidIdTokenError as e:
            logger.error(f"Invalid ID token: {e}")
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}",
        )

# Dependency for protected routes
async def get_current_user(user_data = Depends(verify_token)):
    return user_data 