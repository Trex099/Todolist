from fastapi import Depends, HTTPException, status, Header
from typing import Optional
import firebase_admin
from firebase_admin import auth
from firebase_config import get_firestore_client
import logging

logger = logging.getLogger(__name__)

# Verify Firebase ID token
async def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
        )
    
    try:
        # Extract the token from the Authorization header
        if " " in authorization:
            scheme, token = authorization.split()
            if scheme.lower() != "bearer":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication scheme",
                )
        else:
            token = authorization
        
        # Verify the token
        decoded_token = auth.verify_id_token(token)
        
        return {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email", ""),
            "name": decoded_token.get("name", "")
        }
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
        )

# Dependency for protected routes
async def get_current_user(user_data = Depends(verify_token)):
    return user_data 