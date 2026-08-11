"use client";

import { useEffect, useRef } from "react";
import {
  lerRascunho,
  limparRascunho,
  liberarRecarga,
  salvarRascunho,
  travarRecarga,
} from "@/utils/rascunho";

interface OpcoesRascunho<T> {
  /** Chave do formulário. Use uma por tela (e por registro, quando fizer sentido). */
  chave: string;
  /** O que está em tela agora, já em formato serializável. */
  dados: T;
  /** Falso quando o formulário está vazio ou o registro já foi enviado. */
  ativo: boolean;
  /** Recebe o que foi recuperado do armazenamento, uma única vez, na montagem. */
  restaurar: (dados: T) => void;
  /** Alternativa enxuta para quando o rascunho completo não couber na cota. */
  versaoLeve?: (dados: T) => T;
}

/**
 * Mantém o formulário salvo enquanto está sendo preenchido e trava recargas
 * automáticas nesse intervalo. Some sozinho quando `ativo` vira falso — que é
 * como o registro concluído deixa de reaparecer na próxima abertura da tela.
 */
export function useRascunho<T>({ chave, dados, ativo, restaurar, versaoLeve }: OpcoesRascunho<T>) {
  const restaurarRef = useRef(restaurar);
  restaurarRef.current = restaurar;

  const versaoLeveRef = useRef(versaoLeve);
  versaoLeveRef.current = versaoLeve;

  const dadosRef = useRef(dados);
  dadosRef.current = dados;

  // Na montagem `ativo` ainda é falso: o que foi restaurado só chega no render
  // seguinte. Sem esta marca o efeito de baixo apagaria o rascunho que acabou
  // de ser lido — e um formulário restaurado que não reative a gravação (só um
  // campo preenchido, por exemplo) perderia o registro de vez.
  const jaEsteveAtivo = useRef(false);

  useEffect(() => {
    jaEsteveAtivo.current = false;
    const salvo = lerRascunho<T>(chave);
    if (salvo) restaurarRef.current(salvo);
  }, [chave]);

  useEffect(() => {
    if (!ativo) {
      if (!jaEsteveAtivo.current) return;
      liberarRecarga(chave);
      limparRascunho(chave);
      return;
    }

    jaEsteveAtivo.current = true;
    travarRecarga(chave);
    // Espaço entre digitação e gravação: sem isto cada tecla serializaria as
    // fotos em base64 junto.
    const id = setTimeout(() => {
      const leve = versaoLeveRef.current;
      salvarRascunho(chave, dadosRef.current, leve ? () => leve(dadosRef.current) : undefined);
    }, 500);

    return () => clearTimeout(id);
  }, [chave, ativo, dados]);

  useEffect(() => () => liberarRecarga(chave), [chave]);
}
