"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { db, auth } from "@/app/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { 
  updateEmail, 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  deleteUser 
} from "firebase/auth";
import { User, Mail, Phone, Lock, Trash2, Save, ArrowLeft } from "lucide-react";
import withAuth from "@/components/withAuth";

function MinhaContaPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Modal de confirmação de exclusão
  const [modalExcluir, setModalExcluir] = useState(false);
  const [senhaExcluir, setSenhaExcluir] = useState("");

  useEffect(() => {
    if (user) {
      setNome(user.nome || "");
      setEmail(user.email || "");
      setTelefone(user.telefone || "");
    }
  }, [user]);

  const getRoleLabel = (role: string) => {
    const roles: { [key: string]: string } = {
      porteiro: "Porteiro",
      responsavel: "Responsável",
      morador: "Morador",
      admin: "Admin",
      adminMaster: "Admin Master",
    };
    return roles[role] || role;
  };

  const handleSalvar = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError("");
      setMessage("");

      // Atualizar dados no Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        nome,
        telefone,
      });

      // Atualizar email se mudou
      if (email !== user.email && auth.currentUser) {
        if (!senhaAtual) {
          setError("Para alterar o email, informe sua senha atual");
          setLoading(false);
          return;
        }

        const credential = EmailAuthProvider.credential(user.email, senhaAtual);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updateEmail(auth.currentUser, email);
        await updateDoc(userRef, { email });
      }

      // Atualizar senha se informada
      if (novaSenha) {
        if (novaSenha !== confirmarSenha) {
          setError("As senhas não coincidem");
          setLoading(false);
          return;
        }

        if (novaSenha.length < 6) {
          setError("A senha deve ter no mínimo 6 caracteres");
          setLoading(false);
          return;
        }

        if (!senhaAtual) {
          setError("Para alterar a senha, informe sua senha atual");
          setLoading(false);
          return;
        }

        if (auth.currentUser) {
          const credential = EmailAuthProvider.credential(user.email, senhaAtual);
          await reauthenticateWithCredential(auth.currentUser, credential);
          await updatePassword(auth.currentUser, novaSenha);
        }

        setSenhaAtual("");
        setNovaSenha("");
        setConfirmarSenha("");
      }

      setMessage("Dados atualizados com sucesso!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      if (err.code === "auth/wrong-password") {
        setError("Senha atual incorreta");
      } else if (err.code === "auth/email-already-in-use") {
        setError("Este email já está em uso");
      } else {
        setError("Erro ao salvar dados. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirConta = async () => {
    if (!user || !auth.currentUser) return;

    try {
      setLoading(true);
      setError("");

      if (!senhaExcluir) {
        setError("Informe sua senha para confirmar");
        setLoading(false);
        return;
      }

      // Reautenticar
      const credential = EmailAuthProvider.credential(user.email, senhaExcluir);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Excluir dados do Firestore
      await deleteDoc(doc(db, "users", user.uid));

      // Excluir conta do Firebase Auth
      await deleteUser(auth.currentUser);

      alert("Conta excluída com sucesso!");
      router.push("/login");
    } catch (err: any) {
      console.error("Erro ao excluir conta:", err);
      if (err.code === "auth/wrong-password") {
        setError("Senha incorreta");
      } else {
        setError("Erro ao excluir conta. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    // AJUSTE: Padding top dinâmico para respeitar o entalhe do iPhone
    <div 
      className="min-h-screen bg-gray-50 pb-12 px-4"
      style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top))' }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 p-2 -ml-2 rounded-lg active:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Minha Conta</h1>
          <p className="text-gray-600 mt-1">Gerencie suas informações pessoais</p>
        </div>

        {/* Card de Perfil */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <User size={32} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.nome}</h2>
              <p className="text-sm text-gray-600">Perfil: {getRoleLabel(user.role)}</p>
            </div>
          </div>

          {/* Mensagens */}
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Formulário */}
          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User size={16} className="inline mr-2" />
                Nome Completo
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Seu nome completo"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail size={16} className="inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="seu@email.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Para alterar o email, você precisará informar sua senha atual
              </p>
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone size={16} className="inline mr-2" />
                Telefone
              </label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="(00) 00000-0000"
              />
            </div>

            {/* Divisor */}
            <div className="border-t pt-4 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Alterar Senha</h3>

              {/* Senha Atual */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Lock size={16} className="inline mr-2" />
                  Senha Atual
                </label>
                <input
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Digite sua senha atual"
                />
              </div>

              {/* Nova Senha */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Lock size={16} className="inline mr-2" />
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Digite a nova senha (mínimo 6 caracteres)"
                />
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Lock size={16} className="inline mr-2" />
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Digite novamente a nova senha"
                />
              </div>
            </div>

            {/* Botão Salvar */}
            <button
              onClick={handleSalvar}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>

        {/* Excluir Conta (só para morador) */}
        {user.role === "morador" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Zona de Perigo</h3>
            <p className="text-sm text-red-700 mb-4">
              Ao excluir sua conta, todos os seus dados serão permanentemente removidos. Esta ação não pode ser desfeita.
            </p>
            <button
              onClick={() => setModalExcluir(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition"
            >
              <Trash2 size={18} />
              Excluir Minha Conta
            </button>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {modalExcluir && (
          // AJUSTE: Adicionado overflow-y-auto para evitar problemas com teclado no mobile
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmar Exclusão</h3>
              <p className="text-gray-700 mb-4">
                Tem certeza que deseja excluir sua conta? Esta ação é <strong>irreversível</strong>.
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Digite sua senha para confirmar
                </label>
                <input
                  type="password"
                  value={senhaExcluir}
                  onChange={(e) => setSenhaExcluir(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Sua senha"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setModalExcluir(false);
                    setSenhaExcluir("");
                    setError("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExcluirConta}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {loading ? "Excluindo..." : "Excluir Conta"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(MinhaContaPage, ["porteiro", "responsavel", "morador", "admin", "adminMaster"]);