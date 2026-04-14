"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  onSelect: (data: {
    condominioId: string;
    blocoId: string;
    moradorId: string;
  }) => void;
}

interface Condominio {
  id: string;
  nome: string;
  [key: string]: any;
}

interface Bloco {
  id: string;
  nome: string;
  [key: string]: any;
}

interface Morador {
  id: string;
  nome: string;
  unidadeNome?: string;
  apartamento?: string;
  [key: string]: any;
}

export default function SelectCondominioBlocoMorador({ onSelect }: Props) {
  const { role, condominioId: userCondominioId } = useAuth() as any;
  
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [moradores, setMoradores] = useState<Morador[]>([]);

  const [selectedCondominio, setSelectedCondominio] = useState("");
  const [selectedBloco, setSelectedBloco] = useState("");
  const [selectedMorador, setSelectedMorador] = useState("");

  // ✅ Ref para evitar loop de re-render causado por onSelect no dependency array
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; });

  const getCleanName = (text: string) => {
    return (text || "").replace(/"/g, '').trim(); 
  };

  // ✅ Carrega condomínios
  useEffect(() => {
    const carregarCondominios = async () => {
      try {
        if (role === "adminMaster" || role === "admin") {
          const { data, error } = await supabase.from("condominios").select("*");
          if (error) throw error;
          const lista = (data || []) as Condominio[];
          
          lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
          setCondominios(lista);
        } else {
          if (userCondominioId) {
              const { data, error } = await supabase
                .from("condominios")
                .select("*")
                .eq("id", userCondominioId)
                .single();

              if (!error && data) {
                  setCondominios([data as Condominio]); 
                  setSelectedCondominio(userCondominioId); 
              } else {
                  setCondominios([]);
              }
          } else {
              setCondominios([]);
          }
        }
      } catch (error) {
        console.error("❌ Erro ao buscar condomínios:", error);
      }
    };
    carregarCondominios();
  }, [role, userCondominioId]);

  // ✅ Carrega blocos
  const carregarBlocos = useCallback(async (condominioId: string) => {
    if (!condominioId) {
      setBlocos([]);
      setMoradores([]);
      setSelectedBloco("");
      setSelectedMorador("");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("blocos")
        .select("*")
        .eq("condominio_id", condominioId);
      if (error) throw error;
      const lista = (data || []) as Bloco[];

      // 🔥 Ordenação Natural para Blocos
      lista.sort((a, b) => {
         return getCleanName(a.nome).localeCompare(getCleanName(b.nome), "pt-BR", { numeric: true, sensitivity: "base" });
      });

      setBlocos(lista);
      setMoradores([]);
      setSelectedBloco("");
      setSelectedMorador("");
    } catch (error) {
      console.error("❌ Erro ao buscar blocos:", error);
    }
  }, []);

  // ✅ Carrega moradores
  const carregarMoradores = useCallback(async (blocoId: string, condominioId: string) => {
    if (!blocoId || !condominioId) {
      setMoradores([]);
      setSelectedMorador("");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("condominio_id", condominioId)
        .eq("bloco_id", blocoId)
        .eq("role", "morador");
      if (error) throw error;
      const lista = (data || []).map((d: any) => ({
        ...d,
        unidadeNome: d.unidade_nome,
      })) as Morador[];

      // 🔥 Ordenação Natural para Unidades/Apartamentos
      lista.sort((a, b) => {
         const aptoA = getCleanName(a.unidadeNome || a.apartamento || "");
         const aptoB = getCleanName(b.unidadeNome || b.apartamento || "");
         
         const compare = aptoA.localeCompare(aptoB, "pt-BR", { numeric: true, sensitivity: "base" });
         if (compare !== 0) return compare;

         return getCleanName(a.nome).localeCompare(getCleanName(b.nome), "pt-BR");
      });

      setMoradores(lista);
      setSelectedMorador("");
    } catch (error) {
      console.error("❌ Erro ao buscar moradores:", error);
    }
  }, []);

  useEffect(() => {
    if (selectedCondominio) {
      carregarBlocos(selectedCondominio);
    }
  }, [selectedCondominio, carregarBlocos]);

  useEffect(() => {
    if (selectedBloco && selectedCondominio) {
      carregarMoradores(selectedBloco, selectedCondominio);
    }
  }, [selectedBloco, selectedCondominio, carregarMoradores]);

  useEffect(() => {
    if (typeof onSelectRef.current === 'function') {
      onSelectRef.current({
        condominioId: selectedCondominio,
        blocoId: selectedBloco,
        moradorId: selectedMorador,
      });
    }
  }, [selectedCondominio, selectedBloco, selectedMorador]);

  return (
    <div className="space-y-4">
      {/* Seletor de Condomínio */}
      <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Condomínio</label>
          <select
            value={selectedCondominio}
            onChange={(e) => setSelectedCondominio(e.target.value)}
            disabled={condominios.length === 1 && (role === 'responsavel' || role === 'porteiro')} 
            className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Selecione um condomínio</option>
            {condominios.map((c) => (
              <option key={c.id} value={c.id}>
                {getCleanName(c.nome)}
              </option>
            ))}
          </select>
        </div>

      {/* Seletor de Bloco */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">Bloco</label>
        <select
          value={selectedBloco}
          onChange={(e) => setSelectedBloco(e.target.value)}
          disabled={!selectedCondominio}
          className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">Selecione um bloco</option>
          {blocos.map((b) => (
            <option key={b.id} value={b.id}>
              {getCleanName(b.nome)} 
            </option>
          ))}
        </select>
      </div>

      {/* Seletor de Morador */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">Morador</label>
        <select
          value={selectedMorador}
          onChange={(e) => setSelectedMorador(e.target.value)}
          disabled={!selectedBloco}
          className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">Selecione um morador</option>
          {moradores.map((m) => (
            <option key={m.id} value={m.id}>
              {m.unidadeNome || m.apartamento || "S/N"} - {m.nome}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}