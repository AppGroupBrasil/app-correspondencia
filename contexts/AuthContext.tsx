"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { MENSAGENS } from "@/constants/porteiro.constants";

export interface UserData {
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

export interface UseAuthReturn {
  uid?: string;
  role?: "adminMaster" | "responsavel" | "porteiro" | "morador" | "admin";
  condominioId: string;
  user?: UserData;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

const DEMO = process.env.NEXT_PUBLIC_DEMO === "true";
const CACHE_KEY = "app_user_cache";
const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
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
    if (globalThis.window !== undefined) {
      localStorage.removeItem(CACHE_KEY);
    }
  }, []);

  const loadUserProfile = useCallback(
    async (authUser: { id: string; email?: string | null }) => {
      setUid(authUser.id);

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profileError || !profile) {
        setError("Usuário sem perfil cadastrado.");
        await supabase.auth.signOut();
        clearAuthState();
        return;
      }

      const userData: UserData = {
        uid: authUser.id,
        email: authUser.email || profile.email || "",
        nome: profile.nome || "",
        telefone: profile.telefone || "",
        role: profile.role,
        condominioId: profile.condominio_id || "",
        apartamento: profile.apartamento,
        bloco: profile.bloco_nome,
        ativo: profile.ativo !== false,
      };

      setRole(profile.role);
      setCondominioId(profile.condominio_id || "");
      setUser(userData);
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          uid: userData.uid,
          nome: userData.nome,
          condominioId: userData.condominioId,
        })
      );
      setError(null);
    },
    [clearAuthState]
  );

  const syncAuthState = useCallback(
    async (sessionUser?: { id: string; email?: string | null } | null) => {
      try {
        if (!sessionUser) {
          clearAuthState();
          setLoading(false);
          return;
        }

        await loadUserProfile(sessionUser);
      } catch (err) {
        console.error("Erro ao verificar autenticação:", err);
        setError(MENSAGENS?.ERRO?.AUTENTICACAO || "Erro de autenticação.");
        clearAuthState();
      } finally {
        setLoading(false);
      }
    },
    [clearAuthState, loadUserProfile]
  );

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      clearAuthState();
      router.replace("/");
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
  }, [router, clearAuthState]);

  useEffect(() => {
    let isMounted = true;

    if (DEMO) {
      const demoUser: UserData = {
        uid: "demo-uid",
        email: "demo@exemplo.com",
        nome: "Usuário Demo",
        telefone: "(11) 99999-9999",
        role: "responsavel",
        condominioId: "demo-condominio",
      };

      setUid(demoUser.uid);
      setRole(demoUser.role);
      setCondominioId(demoUser.condominioId);
      setUser(demoUser);
      setLoading(false);
      return;
    }

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.uid) setUid(parsed.uid);
        if (parsed.condominioId) setCondominioId(parsed.condominioId);
      } catch {
        console.error("Cache inválido");
      }
    }

    const initialize = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Erro ao carregar sessão atual:", sessionError);
      }
      if (!isMounted) return;
      await syncAuthState(data.session?.user);
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      void syncAuthState(session?.user);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncAuthState]);

  const value = useMemo<UseAuthReturn>(
    () => ({ uid, role, condominioId, user, loading, error, logout }),
    [uid, role, condominioId, user, loading, error, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
