from fastapi import FastAPI, APIRouter, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
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
        mongo_url = os.environ.get('MONGO_URL', 'mongodb+srv://user:password@cluster.mongodb.net/todolist')
        mongo_client = AsyncIOMotorClient(mongo_url)
        db = mongo_client[os.environ.get('DB_NAME', 'todolist')]
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
    dueDate: str = None
    tags: List[str] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class TodoItemCreate(BaseModel):
    title: str
    category: str
    status: str
    priority: str
    description: str = ""
    dueDate: str = None
    tags: List[str] = []

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Hello from Vercel serverless function"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate, db=Depends(get_db)):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(db=Depends(get_db)):
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Todo API endpoints
@api_router.post("/todos", response_model=TodoItem)
async def create_todo(todo: TodoItemCreate, db=Depends(get_db)):
    todo_dict = todo.dict()
    todo_obj = TodoItem(**todo_dict)
    await db.todos.insert_one(todo_obj.dict())
    return todo_obj

@api_router.get("/todos", response_model=List[TodoItem])
async def get_todos(db=Depends(get_db)):
    todos = await db.todos.find().to_list(1000)
    return [TodoItem(**todo) for todo in todos]

@api_router.get("/todos/{todo_id}", response_model=TodoItem)
async def get_todo(todo_id: str, db=Depends(get_db)):
    todo = await db.todos.find_one({"id": todo_id})
    return TodoItem(**todo)

@api_router.put("/todos/{todo_id}", response_model=TodoItem)
async def update_todo(todo_id: str, todo: TodoItemCreate, db=Depends(get_db)):
    todo_dict = todo.dict()
    todo_dict["updatedAt"] = datetime.utcnow()
    await db.todos.update_one({"id": todo_id}, {"$set": todo_dict})
    updated_todo = await db.todos.find_one({"id": todo_id})
    return TodoItem(**updated_todo)

@api_router.delete("/todos/{todo_id}")
async def delete_todo(todo_id: str, db=Depends(get_db)):
    await db.todos.delete_one({"id": todo_id})
    return {"message": "Todo deleted successfully"}

# Include the router in the main app
app.include_router(api_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Handler for Vercel serverless function
handler = Mangum(app) 