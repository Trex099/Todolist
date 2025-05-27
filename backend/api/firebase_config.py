import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import logging
import traceback
from pathlib import Path
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables to maintain state between serverless invocations
_firestore_client = None
_firebase_app = None

# Check if running in Vercel environment
IS_VERCEL = os.environ.get('VERCEL') == '1'

# Initialize Firebase Admin
def initialize_firebase():
    global _firestore_client
    global _firebase_app
    
    # Return existing client if already initialized
    if _firestore_client:
        logger.info("Reusing existing Firestore client")
        return _firestore_client
    
    try:
        # Prepare credentials
        cred = None
        cred_source = None
        
        # Strategy 1: Use embedded credentials in Vercel environment variables
        if IS_VERCEL:
            logger.info("Running in Vercel environment")
            if os.environ.get("FIREBASE_SERVICE_ACCOUNT"):
                try:
                    cred_dict = json.loads(os.environ.get("FIREBASE_SERVICE_ACCOUNT"))
                    cred = credentials.Certificate(cred_dict)
                    cred_source = "FIREBASE_SERVICE_ACCOUNT environment variable"
                    logger.info(f"Using Firebase credentials from {cred_source}")
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse FIREBASE_SERVICE_ACCOUNT: {e}")
        
        # Strategy 2: Check for service account file in the current directory
        if not cred:
            try:
                # In a serverless environment, the working directory should contain our code
                creds_file = Path(__file__).parent / "firebase-credentials.json"
                if creds_file.exists():
                    cred = credentials.Certificate(str(creds_file))
                    cred_source = str(creds_file)
                    logger.info(f"Using Firebase credentials from {cred_source}")
            except Exception as e:
                logger.error(f"Error loading credentials file: {e}")
        
        # Strategy 3: Look in parent directories (for local development)
        if not cred:
            # Also check for the specific credentials file we saw in the project root
            root_creds_file = Path(__file__).parent.parent.parent / "todo-a124a-firebase-adminsdk-fbsvc-cb837ed8d9.json"
            if root_creds_file.exists():
                try:
                    cred = credentials.Certificate(str(root_creds_file))
                    cred_source = str(root_creds_file)
                    logger.info(f"Using Firebase credentials from {cred_source}")
                except Exception as e:
                    logger.error(f"Failed to load credentials from {root_creds_file}: {e}")
            
            # Look in parent directories for any firebase json files
            if not cred:
                for directory in [
                    Path(__file__).parent.parent,  # backend
                    Path(__file__).parent.parent.parent,  # root
                ]:
                    for file in directory.glob("*firebase*.json"):
                        try:
                            cred = credentials.Certificate(str(file))
                            cred_source = str(file)
                            logger.info(f"Using Firebase credentials from {cred_source}")
                            break
                        except Exception as e:
                            logger.error(f"Failed to load credentials from {file}: {e}")
                    if cred:
                        break
        
        # Strategy 4: Use GOOGLE_APPLICATION_CREDENTIALS
        if not cred and os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            try:
                path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
                cred = credentials.Certificate(path)
                cred_source = f"GOOGLE_APPLICATION_CREDENTIALS ({path})"
                logger.info(f"Using Firebase credentials from {cred_source}")
            except Exception as e:
                logger.error(f"Failed to load credentials from GOOGLE_APPLICATION_CREDENTIALS: {e}")
        
        # Initialize app only if we have credentials
        if cred:
            # Check if Firebase app is already initialized
            if not firebase_admin._apps:
                logger.info(f"Initializing new Firebase app with credentials from {cred_source}")
                _firebase_app = firebase_admin.initialize_app(cred)
            else:
                logger.info("Firebase app already initialized")
                _firebase_app = firebase_admin.get_app()
            
            # Get and cache Firestore client
            _firestore_client = firestore.client(_firebase_app)
            logger.info("Successfully initialized Firestore client")
            return _firestore_client
        else:
            raise ValueError("No Firebase credentials found")
    
    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f"Firebase initialization error: {e}\n{error_detail}")
        
        # Reraise with more detailed error message
        raise RuntimeError(f"Firebase initialization failed: {str(e)}")

# Function to get Firestore client with detailed error handling
def get_firestore_client():
    try:
        return initialize_firebase()
    except Exception as e:
        logger.error(f"Error getting Firestore client: {e}")
        logger.error(traceback.format_exc())
        raise 