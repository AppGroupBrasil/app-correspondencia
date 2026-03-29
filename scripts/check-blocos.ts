import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// 🔍 Mostra as variáveis carregadas (debug)
console.log("🔧 Lendo variáveis de ambiente...");
console.log("API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log("PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log("AUTH_DOMAIN:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);

// 🚨 Verifica se alguma variável está faltando
const requiredVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

const missing = requiredVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error("❌ Variáveis ausentes:", missing.join(', '));
  process.exit(1);
}

// ✅ Inicializa Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ Busca blocos e condomínios
(async () => {
  console.log("🔍 Verificando blocos e condomínios no Firestore...");
  const blocos = await getDocs(collection(db, "blocos"));
  const conds = await getDocs(collection(db, "condominios"));

  console.log(`✅ ${conds.size} condomínios encontrados.`);
  console.log(`✅ ${blocos.size} blocos encontrados.`);

  blocos.forEach(doc => {
    const data = doc.data();
    if (!data.condominioId) {
      console.log(`⚠️  Bloco ${doc.id} sem condominioId`);
    } else {
      console.log(`🏢 Bloco ${doc.id} → condominioId: ${data.condominioId}`);
    }
  });
})();
