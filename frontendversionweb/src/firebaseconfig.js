// firebaseconfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCP1qGEC32JdAdaQ3pk3xgNq32vYXPqB70",
  authDomain: "chatderm-a65c0.firebaseapp.com",
  projectId: "chatderm-a65c0",
  storageBucket: "chatderm-a65c0.firebasestorage.app",
  messagingSenderId: "1038720370031",
  appId: "1:1038720370031:web:c8769db7517ab15da8549a",
  measurementId: "G-0PKKSCF9BJ"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
