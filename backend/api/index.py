from fastapi import FastAPI, APIRouter, Depends, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from mangum import Mangum

# Create the main app
app = FastAPI()

# Create a router with no prefix for Vercel
api_router = APIRouter()

# Load environment variables
load_dotenv()

# MongoDB connection (handle for serverless)
mongo_client = None
db = None

async def get_db():
    global mongo_client, db
    if not mongo_client:
        try:
            mongo_url = os.environ.get('MONGO_URL', 'mongodb+srv://user:password@cluster.mongodb.net/todolist')
            mongo_client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
            # Verify connection
            await mongo_client.admin.command('ismaster')
            db = mongo_client[os.environ.get('DB_NAME', 'todolist')]
            logging.info("Connected to MongoDB")
        except Exception as e:
            logging.error(f"Failed to connect to MongoDB: {e}")
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

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Hello from Vercel serverless function"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate, db=Depends(get_db)):
    try:
        status_dict = input.dict()
        status_obj = StatusCheck(**status_dict)
        await db.status_checks.insert_one(status_obj.dict())
        return status_obj
    except Exception as e:
        logging.error(f"Error creating status check: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(db=Depends(get_db)):
    try:
        status_checks = await db.status_checks.find().to_list(1000)
        return [StatusCheck(**status_check) for status_check in status_checks]
    except Exception as e:
        logging.error(f"Error getting status checks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Todo API endpoints
@api_router.post("/todos", response_model=TodoItem)
async def create_todo(todo: TodoItemCreate, db=Depends(get_db)):
    try:
        todo_dict = todo.dict()
        todo_obj = TodoItem(**todo_dict)
        todo_data = todo_obj.dict()
        await db.todos.insert_one(todo_data)
        return todo_obj
    except Exception as e:
        logging.error(f"Error creating todo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/todos", response_model=List[TodoItem])
async def get_todos(db=Depends(get_db)):
    try:
        todos = await db.todos.find().to_list(1000)
        return [TodoItem(**todo) for todo in todos]
    except Exception as e:
        logging.error(f"Error getting todos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/todos/{todo_id}", response_model=TodoItem)
async def get_todo(todo_id: str, db=Depends(get_db)):
    try:
        todo = await db.todos.find_one({"id": todo_id})
        if not todo:
            raise HTTPException(status_code=404, detail=f"Todo with id {todo_id} not found")
        return TodoItem(**todo)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting todo {todo_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/todos/{todo_id}", response_model=TodoItem)
async def update_todo(todo_id: str, todo: TodoItemCreate, db=Depends(get_db)):
    try:
        todo_dict = todo.dict()
        todo_dict["updatedAt"] = datetime.utcnow()
        result = await db.todos.update_one({"id": todo_id}, {"$set": todo_dict})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail=f"Todo with id {todo_id} not found")
        updated_todo = await db.todos.find_one({"id": todo_id})
        return TodoItem(**updated_todo)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating todo {todo_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/todos/{todo_id}")
async def delete_todo(todo_id: str, db=Depends(get_db)):
    try:
        result = await db.todos.delete_one({"id": todo_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"Todo with id {todo_id} not found")
        return {"message": "Todo deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting todo {todo_id}: {e}")
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Handler for Vercel serverless function
handler = Mangum(app) 