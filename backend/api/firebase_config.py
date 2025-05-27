import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import logging
from pathlib import Path
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firebase Admin
def initialize_firebase():
    try:
        # Check if we already have an app initialized
        if firebase_admin._apps:
            logger.info("Firebase app already initialized")
            return firestore.client()

        # Find the right credentials file - check in different locations
        service_account_path = None
        
        # Option 1: Absolute path from environment variable
        if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            path = Path(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"))
            if path.exists():
                service_account_path = str(path)
                logger.info(f"Using credentials from GOOGLE_APPLICATION_CREDENTIALS: {service_account_path}")
        
        # Option 2: Look for credentials in project root
        if not service_account_path:
            root_dir = Path(__file__).parent.parent.parent
            for file in root_dir.glob("*firebase*.json"):
                service_account_path = str(file)
                logger.info(f"Found Firebase credentials at: {service_account_path}")
                break
        
        # Option 3: Look for credentials in backend directory
        if not service_account_path:
            backend_dir = Path(__file__).parent.parent
            for file in backend_dir.glob("*firebase*.json"):
                service_account_path = str(file)
                logger.info(f"Found Firebase credentials at: {service_account_path}")
                break
                
        # Option 4: Check current directory
        if not service_account_path:
            api_dir = Path(__file__).parent
            for file in api_dir.glob("*firebase*.json"):
                service_account_path = str(file)
                logger.info(f"Found Firebase credentials at: {service_account_path}")
                break
                
        # Initialize with credentials if found
        if service_account_path:
            logger.info(f"Initializing Firebase with credentials: {service_account_path}")
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
        else:
            # Try to get credentials from environment variable
            cred_json = os.environ.get("FIREBASE_CREDENTIALS")
            if cred_json:
                logger.info("Using Firebase credentials from environment variable")
                try:
                    cred_dict = json.loads(cred_json)
                    cred = credentials.Certificate(cred_dict)
                    firebase_admin.initialize_app(cred)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse FIREBASE_CREDENTIALS: {e}")
                    raise
            else:
                # Last resort - try to initialize without credentials (for emulator usage)
                logger.warning("No Firebase credentials found! Initializing without credentials.")
                firebase_admin.initialize_app()
        
        # Return Firestore client
        return firestore.client()
    
    except Exception as e:
        logger.error(f"Firebase initialization error: {e}")
        raise

# Function to get Firestore client
def get_firestore_client():
    return initialize_firebase() 