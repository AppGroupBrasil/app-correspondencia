// scripts/fix-condominio-ids.ts
import "dotenv/config";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  where,
  query,
} from "firebase/firestore";

console.log("🔧 Corrigindo blocos com ID incorreto...");

// ✅ Carrega variáveis do .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error("❌ Variáveis de ambiente ausentes. Verifique o .env.local.");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

(async () => {
  try {
    const idErrado = "SlKLdPefTAWEVZXXjDu5"; // ❌ errado (l minúsculo)
    const idCorreto = "SIKLdPefTAWEVZXXjDu5"; // ✅ certo (I maiúsculo)

    const q = query(collection(db, "blocos"), where("condominioId", "==", idErrado));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("✅ Nenhum bloco com o ID errado foi encontrado.");
      process.exit(0);
    }

    console.log(`⚙️ Corrigindo ${snapshot.size} blocos...`);

    for (const docSnap of snapshot.docs) {
      const blocoRef = doc(db, "blocos", docSnap.id);
      await updateDoc(blocoRef, { condominioId: idCorreto });
      console.log(`✅ Corrigido: ${docSnap.id} → condominioId=${idCorreto}`);
    }

    console.log("🎉 Correção finalizada com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao corrigir blocos:", err);
  }
})();
