"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"; 
import { db } from "@/app/lib/firebase";
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

  const getCleanName = (text: string) => {
    return (text || "").replace(/"/g, '').trim(); 
  };

  // ✅ Carrega condomínios
  useEffect(() => {
    const carregarCondominios = async () => {
      try {
        if (role === "adminMaster" || role === "admin") {
          const snapshot = await getDocs(collection(db, "condominios"));
          const lista = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Condominio[];
          
          lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
          setCondominios(lista);
        } else {
          if (userCondominioId) {
              const condominioRef = doc(db, "condominios", userCondominioId);
              const docSnap = await getDoc(condominioRef);

              if (docSnap.exists()) {
                  setCondominios([{ id: docSnap.id, ...docSnap.data() } as Condominio]); 
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
      const q = query(
        collection(db, "blocos"),
        where("condominioId", "==", condominioId)
      );
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Bloco[];

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
  const carregarMoradores = useCallback(async (blocoId: string) => {
    if (!blocoId) {
      setMoradores([]);
      setSelectedMorador("");
      return;
    }

    try {
      const q = query(
        collection(db, "users"),
        where("blocoId", "==", blocoId), 
        where("role", "==", "morador")
      );
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
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
    if (selectedBloco) {
      carregarMoradores(selectedBloco);
    }
  }, [selectedBloco, carregarMoradores]);

  useEffect(() => {
    if (typeof onSelect === 'function') {
      onSelect({
        condominioId: selectedCondominio,
        blocoId: selectedBloco,
        moradorId: selectedMorador,
      });
    }
  }, [selectedCondominio, selectedBloco, selectedMorador, onSelect]);

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