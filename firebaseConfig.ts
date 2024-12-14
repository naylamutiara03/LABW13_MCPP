// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAX_0izZmmiN3DpOQcUrST4BEQc0xT5GU0",
  authDomain: "labw12-mcpp.firebaseapp.com",
  projectId: "labw12-mcpp",
  storageBucket: "labw12-mcpp.appspot.com",
  messagingSenderId: "24526351781",
  appId: "1:24526351781:web:ab1d9e5f3a8a87f5d78c4c"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

export const firestoreDB = getFirestore(app);

export const storage = getStorage(app);
