import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBU5ULvPOhNRYND2k-tg9EuOK4wotym5I8",
  authDomain: "correspondencia-9a73a.firebaseapp.com",
  projectId: "correspondencia-9a73a",
  storageBucket: "correspondencia-9a73a.firebasestorage.app",
  messagingSenderId: "999413422800",
  appId: "1:999413422800:web:cba5d9f7cbfab7784b5cd5",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function verificar() {
  console.log("🔍 Fazendo login com s@s.com...");
  const cred = await signInWithEmailAndPassword(auth, "s@s.com", "123456");
  const uid = cred.user.uid;
  console.log("✅ UID:", uid);

  console.log("\n🔍 Buscando documento em /users/" + uid);
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    console.log("✅ Documento users encontrado:");
    console.log(JSON.stringify(userDoc.data(), null, 2));
  } else {
    console.log("❌ Nenhum documento em /users/ para esse UID");
  }

  const condominioId = userDoc.data()?.condominioId;
  if (condominioId) {
    console.log("\n🔍 Buscando condomínio:", condominioId);
    const condDoc = await getDoc(doc(db, "condominios", condominioId));
    if (condDoc.exists()) {
      console.log("✅ Condomínio encontrado:");
      console.log(JSON.stringify(condDoc.data(), null, 2));
    } else {
      console.log("❌ Condomínio não encontrado no Firestore");
    }
  }

  process.exit(0);
}

verificar().catch(err => { console.error("❌", err.message); process.exit(1); });
