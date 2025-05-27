import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import logging
import traceback
from pathlib import Path
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Global variables to maintain state between serverless invocations
_firestore_client = None
_firebase_app = None

# Check if running in Vercel environment
IS_VERCEL = os.environ.get('VERCEL') == '1'

# Initialize Firebase Admin
def initialize_firebase():
    global _firestore_client, _firebase_app
    logger.debug("Attempting to initialize Firebase...")

    if _firestore_client:
        logger.debug("Reusing existing Firestore client.")
        return _firestore_client

    logger.debug(f"Firebase app already initialized: {bool(firebase_admin._apps)}")
    if firebase_admin._apps:
        logger.debug(f"Getting existing Firebase app: {firebase_admin._apps[0].name}")
        _firebase_app = firebase_admin.get_app()
        _firestore_client = firestore.client(_firebase_app)
        logger.debug("Successfully got Firestore client from existing app.")
        return _firestore_client

    try:
        cred = None
        cred_source = "Unknown"
        logger.debug(f"IS_VERCEL environment: {IS_VERCEL}")

        if IS_VERCEL:
            logger.debug("Attempting Vercel FIREBASE_SERVICE_ACCOUNT strategy.")
            firebase_service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
            if firebase_service_account_json:
                try:
                    cred_dict = json.loads(firebase_service_account_json)
                    cred = credentials.Certificate(cred_dict)
                    cred_source = "FIREBASE_SERVICE_ACCOUNT env var"
                    logger.info(f"Successfully parsed credentials from {cred_source}")
                except json.JSONDecodeError as e:
                    logger.error(f"JSONDecodeError parsing FIREBASE_SERVICE_ACCOUNT: {e}. Content preview: {firebase_service_account_json[:100]}...", exc_info=True)
                except Exception as e:
                    logger.error(f"Exception parsing FIREBASE_SERVICE_ACCOUNT: {e}", exc_info=True)
            else:
                logger.warning("FIREBASE_SERVICE_ACCOUNT env var not found in Vercel.")

        if not cred:
            logger.debug("Attempting local firebase-credentials.json strategy.")
            creds_file = Path(__file__).parent / "firebase-credentials.json"
            if creds_file.exists():
                try:
                    cred = credentials.Certificate(str(creds_file))
                    cred_source = f"local file: {creds_file}"
                    logger.info(f"Successfully loaded credentials from {cred_source}")
                except Exception as e:
                    logger.error(f"Exception loading credentials from {creds_file}: {e}", exc_info=True)
            else:
                logger.debug(f"Local credentials file not found: {creds_file}")

        if not cred:
            logger.debug("Attempting root credentials file strategy.")
            root_creds_file = Path(__file__).parent.parent.parent / "todo-a124a-firebase-adminsdk-fbsvc-cb837ed8d9.json"
            if root_creds_file.exists():
                try:
                    cred = credentials.Certificate(str(root_creds_file))
                    cred_source = f"root file: {root_creds_file}"
                    logger.info(f"Successfully loaded credentials from {cred_source}")
                except Exception as e:
                    logger.error(f"Exception loading credentials from {root_creds_file}: {e}", exc_info=True)
            else:
                logger.debug(f"Root credentials file not found: {root_creds_file}")
        
        if not cred and os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            gac_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            logger.debug(f"Attempting GOOGLE_APPLICATION_CREDENTIALS strategy: {gac_path}")
            try:
                cred = credentials.Certificate(gac_path)
                cred_source = f"GOOGLE_APPLICATION_CREDENTIALS ({gac_path})"
                logger.info(f"Successfully loaded credentials from {cred_source}")
            except Exception as e:
                logger.error(f"Exception loading credentials from GOOGLE_APPLICATION_CREDENTIALS ({gac_path}): {e}", exc_info=True)

        if cred:
            logger.info(f"Initializing Firebase app with credentials from: {cred_source}")
            try:
                _firebase_app = firebase_admin.initialize_app(cred)
                logger.info(f"Firebase app '{_firebase_app.name}' initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Firebase app with {cred_source}: {e}", exc_info=True)
                raise RuntimeError(f"Firebase app initialization failed with {cred_source}: {str(e)}")
            
            try:
                _firestore_client = firestore.client(_firebase_app)
                logger.info("Firestore client obtained successfully.")
            except Exception as e:
                logger.error(f"Failed to get Firestore client: {e}", exc_info=True)
                raise RuntimeError(f"Firestore client creation failed: {str(e)}")
            
            return _firestore_client
        else:
            logger.error("No Firebase credentials found after checking all strategies.")
            raise ValueError("No Firebase credentials found. Ensure FIREBASE_SERVICE_ACCOUNT (JSON content) or a credentials file is correctly set up.")

    except Exception as e:
        logger.critical(f"CRITICAL: Firebase initialization failed: {e}\n{traceback.format_exc()}", exc_info=True)
        raise RuntimeError(f"Firebase initialization failed catastrophically: {str(e)}")

# Function to get Firestore client with detailed error handling
def get_firestore_client():
    logger.debug("get_firestore_client called.")
    try:
        client = initialize_firebase()
        if client:
            logger.debug("Successfully returned Firestore client from get_firestore_client.")
            return client
        else:
            logger.error("initialize_firebase returned None, which is unexpected.")
            raise RuntimeError("Failed to get Firestore client: initialization returned no client.")
    except Exception as e:
        logger.error(f"Error in get_firestore_client: {e}", exc_info=True)
        raise 