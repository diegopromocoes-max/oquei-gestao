import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração oficial do projeto Oquei Telecom
export const firebaseConfig = {
  apiKey: "AIzaSyCKM8PhyHZd73MWn2LoRjWuPd8U7NDAjzM",
  authDomain: "oquei-ecossistema.firebaseapp.com",
  projectId: "oquei-ecossistema",
  storageBucket: "oquei-ecossistema.firebasestorage.app",
  messagingSenderId: "264066173238",
  appId: "1:264066173238:web:ec1cfb2ebcea84d8f48b97"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
