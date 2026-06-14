"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

const ROTA_POR_ROLE: Record<string, string> = {
  morador: "/dashboard-morador",
  responsavel: "/dashboard-responsavel",
  porteiro: "/dashboard-porteiro",
  adminMaster: "/dashboard-master",
  admin: "/dashboard-admin",
};

// Recebe ?token=<JWT curto da central>, troca por sessão GoTrue e entra direto.
export default function SsoPage() {
  const router = useRouter();
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setErro(true);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/sso", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) throw new Error("sso");
        const { token_hash, role } = await res.json();

        const { error } = await supabase.auth.verifyOtp({ token_hash, type: "magiclink" });
        if (error) throw error;

        router.replace(ROTA_POR_ROLE[role] || "/dashboard-morador");
      } catch {
        setErro(true);
      }
    })();
  }, [router]);

  if (erro) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16 }}>
        <p>Não foi possível entrar pelo login único.</p>
        <button
          onClick={() => router.replace("/login")}
          style={{ padding: "8px 20px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}
        >
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ width: 32, height: 32, border: "4px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
