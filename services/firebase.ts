import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCzWq_XEHaxvshzwt6OU-ub2Lcy3mJsd-Q",
  authDomain: "crm-f2.firebaseapp.com",
  projectId: "crm-f2",
  storageBucket: "crm-f2.firebasestorage.app",
  messagingSenderId: "311449379989",
  appId: "1:311449379989:web:8e3fb47b48c64b26b3279c",
  measurementId: "G-BLZ93EQV9X"
};

const app = firebase.initializeApp(firebaseConfig);

export const auth = app.auth();
export const db = app.firestore();
