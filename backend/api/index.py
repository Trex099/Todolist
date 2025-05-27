from fastapi import FastAPI, APIRouter, Depends, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from mangum import Mangum
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

# Import the Firebase configuration
from firebase_config import get_firestore_client
# Import authentication utilities
from auth import get_current_user

# Create the main app
app = FastAPI()

# Create a router with no prefix for Vercel
api_router = APIRouter()

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Firebase Firestore setup
db = None

async def get_db():
    global db
    if db is None:
        try:
            db = get_firestore_client()
            logger.info("Connected to Firestore")
        except Exception as e:
            logger.error(f"Failed to connect to Firestore: {e}")
            raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")
    return db

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class TodoItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str  # Added userId field to associate todos with users
    title: str
    category: str
    status: str
    priority: str
    description: str = ""
    dueDate: Optional[str] = None
    githubIssue: Optional[str] = None
    githubIssueData: Optional[Dict[str, Any]] = None
    estimatedHours: Optional[str] = None 
    actualHours: Optional[str] = None
    tags: List[str] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class TodoItemCreate(BaseModel):
    title: str
    category: str
    status: str
    priority: str
    description: str = ""
    dueDate: Optional[str] = None
    githubIssue: Optional[str] = None
    githubIssueData: Optional[Dict[str, Any]] = None
    estimatedHours: Optional[str] = None
    actualHours: Optional[str] = None
    tags: List[str] = []

class UserProfile(BaseModel):
    uid: str
    email: str
    name: Optional[str] = None
    photoURL: Optional[str] = None

# Helper functions for Firestore
def firestore_document_to_dict(doc):
    data = doc.to_dict()
    data['id'] = doc.id
    # Convert Firestore Timestamps to datetime objects
    if 'timestamp' in data and isinstance(data['timestamp'], firestore.SERVER_TIMESTAMP):
        data['timestamp'] = datetime.now()
    if 'createdAt' in data and isinstance(data['createdAt'], firestore.SERVER_TIMESTAMP):
        data['createdAt'] = datetime.now()
    if 'updatedAt' in data and isinstance(data['updatedAt'], firestore.SERVER_TIMESTAMP):
        data['updatedAt'] = datetime.now()
    return data

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Hello from Vercel serverless function with Firebase"}

# Auth endpoint to check authentication status
@api_router.get("/auth/me", response_model=UserProfile)
async def get_me(user_data = Depends(get_current_user)):
    return UserProfile(**user_data)

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate, db=Depends(get_db)):
    try:
        status_obj = StatusCheck(**input.dict())
        status_dict = status_obj.dict()
        
        # Remove id from dict to let Firestore generate it
        doc_id = status_dict.pop('id')
        
        # Add to Firestore
        db.collection('status_checks').document(doc_id).set({
            **status_dict,
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        
        return status_obj
    except Exception as e:
        logger.error(f"Error creating status check: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(db=Depends(get_db)):
    try:
        # Get all status checks
        status_checks_ref = db.collection('status_checks').limit(1000).get()
        return [StatusCheck(**firestore_document_to_dict(doc)) for doc in status_checks_ref]
    except Exception as e:
        logger.error(f"Error getting status checks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Protected Todo API endpoints
@api_router.post("/todos", response_model=TodoItem)
async def create_todo(todo: TodoItemCreate, user_data = Depends(get_current_user), db=Depends(get_db)):
    try:
        # Create a todo item with the user's ID
        todo_dict = todo.dict()
        todo_obj = TodoItem(userId=user_data["uid"], **todo_dict)
        todo_data = todo_obj.dict()
        
        # Remove id from dict to let Firestore generate it
        doc_id = todo_data.pop('id')
        
        # Store in Firestore with server timestamps
        doc_ref = db.collection('todos').document(doc_id)
        doc_ref.set({
            **todo_data,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        # Get the document back with the server timestamp
        doc = doc_ref.get()
        return TodoItem(id=doc.id, **firestore_document_to_dict(doc))
    except Exception as e:
        logger.error(f"Error creating todo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/todos", response_model=List[TodoItem])
async def get_todos(user_data = Depends(get_current_user), db=Depends(get_db)):
    try:
        # Get todos for the current user only
        userId = user_data["uid"]
        todos_ref = db.collection('todos').where("userId", "==", userId).limit(1000).get()
        return [TodoItem(**firestore_document_to_dict(doc)) for doc in todos_ref]
    except Exception as e:
        logger.error(f"Error getting todos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/todos/{todo_id}", response_model=TodoItem)
async def get_todo(todo_id: str, user_data = Depends(get_current_user), db=Depends(get_db)):
    try:
        # Get todo by ID
        doc_ref = db.collection('todos').document(todo_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail=f"Todo with id {todo_id} not found")
        
        # Check if the todo belongs to the current user
        todo_data = firestore_document_to_dict(doc)
        if todo_data.get('userId') != user_data["uid"]:
            raise HTTPException(status_code=403, detail="You don't have permission to access this todo")
            
        return TodoItem(**todo_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting todo {todo_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/todos/{todo_id}", response_model=TodoItem)
async def update_todo(todo_id: str, todo: TodoItemCreate, user_data = Depends(get_current_user), db=Depends(get_db)):
    try:
        # Check if document exists
        doc_ref = db.collection('todos').document(todo_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail=f"Todo with id {todo_id} not found")
        
        # Check if the todo belongs to the current user
        todo_data = firestore_document_to_dict(doc)
        if todo_data.get('userId') != user_data["uid"]:
            raise HTTPException(status_code=403, detail="You don't have permission to update this todo")
        
        # Update the document
        todo_dict = todo.dict()
        doc_ref.update({
            **todo_dict,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        # Get the updated document
        updated_doc = doc_ref.get()
        return TodoItem(id=todo_id, **firestore_document_to_dict(updated_doc))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating todo {todo_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/todos/{todo_id}")
async def delete_todo(todo_id: str, user_data = Depends(get_current_user), db=Depends(get_db)):
    try:
        # Check if document exists
        doc_ref = db.collection('todos').document(todo_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail=f"Todo with id {todo_id} not found")
        
        # Check if the todo belongs to the current user
        todo_data = firestore_document_to_dict(doc)
        if todo_data.get('userId') != user_data["uid"]:
            raise HTTPException(status_code=403, detail="You don't have permission to delete this todo")
        
        # Delete the document
        doc_ref.delete()
        return {"message": "Todo deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting todo {todo_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router, prefix="/api")

# Add CORS middleware with more relaxed settings for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["X-Total-Count"],
)

# Handler for Vercel serverless function
handler = Mangum(app) 