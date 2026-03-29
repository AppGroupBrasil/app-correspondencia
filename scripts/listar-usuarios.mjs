import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

// Tenta logar com contas conhecidas de admin
const admins = [
  { email: "administrativo@gapseguranca.com.br", senha: null },
  { email: "teste@gap.com", senha: null },
];

async function listar() {
  // Busca todos os condomínios
  const condSnap = await getDocs(collection(db, "condominios"));
  const condominios = {};
  condSnap.forEach(d => { condominios[d.id] = d.data().nome || d.id; });

  console.log("\n🏢 CONDOMÍNIOS CADASTRADOS (excluindo Goiabeira)\n");
  console.log("─".repeat(60));
  const lista = [];
  condSnap.forEach(d => {
    const nome = d.data().nome || "-";
    if (nome.toLowerCase().includes("goiabeira")) return;
    lista.push({ id: d.id, nome, cnpj: d.data().cnpj || "-", status: d.data().status || "-" });
  });

  lista.sort((a, b) => a.nome.localeCompare(b.nome));
  lista.forEach((c, i) => {
    console.log(`${i + 1}. ${c.nome}`);
    console.log(`   CNPJ: ${c.cnpj} | Status: ${c.status} | ID: ${c.id}`);
  });
  console.log(`\nTotal: ${lista.length} condomínio(s)`);
  process.exit(0);
}

listar().catch(err => { console.error("❌", err.message); process.exit(1); });
