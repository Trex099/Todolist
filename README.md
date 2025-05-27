# Todo List Application

A full-stack Todo List application with React frontend and FastAPI backend, optimized for Vercel deployment.

## Project Structure

- `frontend/`: React application
- `backend/`: FastAPI server
  - `api/`: Serverless API endpoints for Vercel deployment

## Deployment to Vercel

### Prerequisites

1. [Vercel account](https://vercel.com/signup)
2. [Vercel CLI](https://vercel.com/download) (optional for local development)
3. MongoDB Atlas account (or other MongoDB provider)

### Setup Environment Variables

In your Vercel project settings, add the following environment variables:

- `MONGO_URL`: Your MongoDB connection string
- `DB_NAME`: Database name (default: "todolist")

### Deploy to Vercel

1. Link your GitHub repository:
   ```
   vercel link
   ```

2. Deploy the project:
   ```
   vercel
   ```

3. For production deployment:
   ```
   vercel --prod
   ```

Alternatively, you can deploy directly through the Vercel dashboard by connecting your GitHub repository.

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## API Endpoints

- `GET /api`: Welcome message
- `GET /api/todos`: Get all todos
- `POST /api/todos`: Create a new todo
- `GET /api/todos/{todo_id}`: Get a specific todo
- `PUT /api/todos/{todo_id}`: Update a todo
- `DELETE /api/todos/{todo_id}`: Delete a todo
