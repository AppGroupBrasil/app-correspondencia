"use client"; // 👈 OBRIGATÓRIO NA PRIMEIRA LINHA

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";
// Certifique-se que o caminho da constante está correto ou remova se não usar
import { MENSAGENS } from "@/constants/porteiro.constants";

interface UserData {
  uid: string;
  email: string;
  nome: string;
  telefone?: string;
  role: "adminMaster" | "responsavel" | "porteiro" | "morador" | "admin";
  condominioId: string;
  apartamento?: string;
  bloco?: string;
  ativo?: boolean;
}

interface UseAuthReturn {
  uid?: string;
  role?: "adminMaster" | "responsavel" | "porteiro" | "morador" | "admin";
  condominioId: string;
  user?: UserData;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

const DEMO = process.env.NEXT_PUBLIC_DEMO === "true";
const CACHE_KEY = "app_user_cache"; // Chave para salvar no celular

export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  
  // Inicializa estados
  const [uid, setUid] = useState<string | undefined>(undefined);
  const [condominioId, setCondominioId] = useState<string>("");
  const [role, setRole] = useState<UserData["role"] | undefined>(undefined);
  const [user, setUser] = useState<UserData | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearAuthState = useCallback(() => {
    setUid(undefined);
    setRole(undefined);
    setCondominioId("");
    setUser(undefined);
    // Limpa o cache local ao sair
    if (typeof window !== "undefined") localStorage.removeItem(CACHE_KEY);
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      clearAuthState();
      router.replace("/"); 
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
  }, [router, clearAuthState]);

  useEffect(() => {
    // 1. MODO DEMO
    if (DEMO) {
      const demoUser: UserData = {
        uid: "demo-uid",
        email: "demo@exemplo.com",
        nome: "Usuário Demo",
        telefone: "(11) 99999-9999",
        role: "responsavel",
        condominioId: "demo-condominio",
      };
      setUid("demo-uid");
      setRole("responsavel");
      setCondominioId("demo-condominio");
      setUser(demoUser);
      setLoading(false);
      return;
    }

    // 2. OTIMIZAÇÃO MOBILE: Tenta carregar do cache instantaneamente
    // Isso evita a tela branca de "Carregando..." ao abrir o app
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached && loading) {
        try {
            const parsed = JSON.parse(cached);
            // Apenas uid e condominioId são restaurados do cache para evitar tela branca
            // role NÃO é restaurada do cache — aguarda validação do Firebase
            if (parsed.uid) setUid(parsed.uid);
            if (parsed.condominioId) setCondominioId(parsed.condominioId);
        } catch (e) { console.error("Cache inválido"); }
    }

    // 3. LISTENER DO FIREBASE
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          clearAuthState();
          setLoading(false);
          return;
        }

        setUid(firebaseUser.uid);

        // Busca dados atualizados no Firestore
        const ref = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("Usuário sem perfil cadastrado.");
          await signOut(auth);
          clearAuthState();
          setLoading(false);
          return;
        }

        const data = snap.data() as any;

        const userData: UserData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || data.email || "",
          nome: data.nome || "",
          telefone: data.telefone || "",
          role: data.role,
          condominioId: data.condominioId || "",
          apartamento: data.apartamento,
          bloco: data.bloco,
          ativo: data.ativo !== false,
        };

        // Atualiza estados
        setRole(data.role);
        setCondominioId(data.condominioId || "");
        setUser(userData);
        
        // Salva no cache apenas dados não-sensíveis para evitar tela branca no mobile
        // NUNCA cachear role — ela é sempre validada via Firestore no onAuthStateChanged
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          uid: userData.uid,
          nome: userData.nome,
          condominioId: userData.condominioId,
        }));
        
        setError(null);
      } catch (err) {
        console.error("Erro ao verificar autenticação:", err);
        setError(MENSAGENS?.ERRO?.AUTENTICACAO || "Erro de autenticação.");
        // Se der erro de rede (offline), mantemos o usuário logado com o cache
        if (!user) { 
            clearAuthState(); 
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router, clearAuthState]); // Removi 'loading' e 'user' das dependências para evitar loops

  return { uid, role, condominioId, user, loading, error, logout };
};