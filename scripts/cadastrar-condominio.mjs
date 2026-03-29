import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc, setDoc, doc, Timestamp } from "firebase/firestore";

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

const dados = {
  email: "s@s.com",
  senha: "123456",
  nomeResponsavel: "Silva Santos",
  whatsapp: "81999618516",
  nomeCondominio: "Condomínio Residencial Primavera",
  cnpj: "12.345.678/0001-90",
  endereco: "Rua das Flores, 123, Bairro Boa Vista, Recife/PE, CEP: 50000-000",
};

async function cadastrar() {
  try {
    console.log("1️⃣  Autenticando usuário...");
    let uid;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, dados.email, dados.senha);
      uid = userCredential.user.uid;
      console.log("✅ Novo usuário criado:", uid);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        const userCredential = await signInWithEmailAndPassword(auth, dados.email, dados.senha);
        uid = userCredential.user.uid;
        console.log("✅ Login com conta existente:", uid);
      } else {
        throw err;
      }
    }

    console.log("2️⃣  Criando condomínio no Firestore...");
    const condominioRef = await addDoc(collection(db, "condominios"), {
      nome: dados.nomeCondominio,
      cnpj: dados.cnpj,
      endereco: dados.endereco,
      logoUrl: "",
      status: "ativo",
      criadoPor: uid,
      criadoEm: Timestamp.now(),
    });
    console.log("✅ Condomínio criado:", condominioRef.id);

    console.log("3️⃣  Salvando dados do responsável...");
    await setDoc(doc(db, "users", uid), {
      uid,
      nome: dados.nomeResponsavel,
      email: dados.email,
      whatsapp: dados.whatsapp,
      role: "responsavel",
      status: "ativo",
      condominioId: condominioRef.id,
      criadoEm: Timestamp.now(),
    });
    console.log("✅ Responsável salvo no Firestore");

    console.log("\n🎉 Cadastro concluído com sucesso!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:      ", dados.email);
    console.log("🔑 Senha:      ", dados.senha);
    console.log("🏢 Condomínio: ", dados.nomeCondominio);
    console.log("🆔 ID:         ", condominioRef.id);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erro:", err.message);
    process.exit(1);
  }
}

cadastrar();
