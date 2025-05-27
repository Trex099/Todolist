// Import the functions from the Firebase SDKs
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider,
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBaoqHtlrMIyAfWmcH1Hh9R948eqicrTEI",
  authDomain: "todo-a124a.firebaseapp.com",
  projectId: "todo-a124a",
  storageBucket: "todo-a124a.firebasestorage.app",
  messagingSenderId: "1077354135346",
  appId: "1:1077354135346:web:c0161f4de22ad39df7612b",
  measurementId: "G-QJCJCCWPXQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
export default app; 