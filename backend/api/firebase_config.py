import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import logging
from pathlib import Path
from dotenv import load_dotenv

# Initialize Firebase Admin
def initialize_firebase():
    try:
        # Check if we already have an app initialized
        if not firebase_admin._apps:
            # Try to get service account from environment variable first
            cred_json = os.environ.get("FIREBASE_CREDENTIALS")
            
            if cred_json:
                # Parse service account JSON from environment variable
                try:
                    cred_dict = json.loads(cred_json)
                    cred = credentials.Certificate(cred_dict)
                except json.JSONDecodeError:
                    logging.error("Failed to parse FIREBASE_CREDENTIALS environment variable")
                    raise
            else:
                # Fall back to service account file
                service_account_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
                
                if service_account_path and Path(service_account_path).exists():
                    cred = credentials.Certificate(service_account_path)
                else:
                    # Last resort - look for a credentials file in the project
                    creds_file = Path(__file__).parent / "firebase-credentials.json"
                    if creds_file.exists():
                        cred = credentials.Certificate(str(creds_file))
                    else:
                        # If no credentials are found, try to initialize with default app (for Firebase emulator)
                        firebase_admin.initialize_app()
                        return firestore.client()
            
            # Initialize app with credential
            firebase_admin.initialize_app(cred)
        
        # Return Firestore client
        return firestore.client()
    
    except Exception as e:
        logging.error(f"Firebase initialization error: {e}")
        raise

# Function to get Firestore client
def get_firestore_client():
    return initialize_firebase() 