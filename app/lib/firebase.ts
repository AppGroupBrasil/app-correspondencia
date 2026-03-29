// app/lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

/**
 * Configuração do Firebase
 * As credenciais são carregadas via variáveis de ambiente (acesso direto obrigatório para Next.js)
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// Validação usa os valores já resolvidos (process.env[key] dinâmico não funciona no browser)
const requiredKeys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"] as const;
const missingFirebaseEnv = requiredKeys.filter((key) => !firebaseConfig[key]);
const isDemoMode = process.env.NEXT_PUBLIC_DEMO === "true";
const isConfigured = missingFirebaseEnv.length === 0;

if (!isDemoMode && !isConfigured) {
  const message = `[Firebase] Variáveis obrigatórias ausentes: ${missingFirebaseEnv.join(", ")}`;

  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  }

  if (globalThis.window !== undefined) {
    console.warn(message);
    console.warn(
      "[Firebase] Configure o arquivo .env.local com base no .env.example"
    );
  }
}

// Inicializa o Firebase App (singleton)
const existingApps = getApps();
const app: FirebaseApp = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);

// Inicializa os serviços do Firebase
const firebaseServices = (() => {
  try {
    return {
      auth: getAuth(app),
      db: getFirestore(app),
      storage: getStorage(app),
    };
  } catch (error) {
    console.error("[Firebase] Erro ao inicializar serviços:", error);
    return {
      auth: {} as Auth,
      db: {} as Firestore,
      storage: {} as FirebaseStorage,
    };
  }
})();

const { auth, db, storage } = firebaseServices;

export { app, auth, db, storage, isConfigured };
