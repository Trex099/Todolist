# Todo List Application

A full-stack Todo List application with React frontend and FastAPI backend with Firebase integration, optimized for Vercel deployment.

## Project Structure

- `frontend/`: React application
- `backend/`: FastAPI server
  - `api/`: Serverless API endpoints for Vercel deployment with Firebase integration

## Firebase Setup

### Prerequisites

1. [Firebase account](https://firebase.google.com/) - Create a new project if you don't have one
2. Firestore Database - Enable it in your Firebase project
3. Service Account credentials - Generate them from Project Settings > Service Accounts

### Steps to Set Up Firebase

1. Create a new project in the [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database (start in test mode for development)
3. Generate a new private key for your service account:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely

4. Set up environment variables for your Firebase credentials in Vercel:
   - `FIREBASE_CREDENTIALS`: Paste the entire JSON content of your service account key file
   - Or alternatively, set `GOOGLE_APPLICATION_CREDENTIALS` to the path of your service account file (local development only)

## Deployment to Vercel

### Prerequisites

1. [Vercel account](https://vercel.com/signup)
2. [Vercel CLI](https://vercel.com/download) (optional for local development)
3. Firebase project with Firestore enabled

### Setup Environment Variables

In your Vercel project settings, add the following environment variable:

- `FIREBASE_CREDENTIALS`: The entire JSON content of your Firebase service account credentials file

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

# Set your Firebase credentials
export GOOGLE_APPLICATION_CREDENTIALS="path/to/your/serviceAccountKey.json"

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
