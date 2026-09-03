"use client";

import { useCallback, useEffect, useState } from "react";

import type { CargoReferencia } from "../components/matchmakingUtils";
import { apiFetch } from "../lib/api";

let cacheCargos: CargoReferencia[] | null = null;
let promessaCargos: Promise<CargoReferencia[]> | null = null;

export async function buscarCargosReferencia(
  forcarRecarga = false,
): Promise<CargoReferencia[]> {
  if (!forcarRecarga && cacheCargos) {
    return cacheCargos;
  }

  if (!forcarRecarga && promessaCargos) {
    return promessaCargos;
  }

  promessaCargos = apiFetch<CargoReferencia[]>("/matchmaking/cargos")
    .then((dados) => {
      cacheCargos = dados;
      return dados;
    })
    .finally(() => {
      promessaCargos = null;
    });

  return promessaCargos;
}

export interface UseCargosOptions {
  habilitado?: boolean;
  selecionarPrimeiro?: boolean;
}

export interface UseCargosResult {
  cargos: CargoReferencia[];
  carregando: boolean;
  erro: string | null;
  cargoInicial: string | null;
  recarregar: () => Promise<void>;
}

export function useCargos({
  habilitado = true,
  selecionarPrimeiro = false,
}: UseCargosOptions = {}): UseCargosResult {
  const [cargos, setCargos] = useState<CargoReferencia[]>(cacheCargos ?? []);
  const [carregando, setCarregando] = useState(habilitado && !cacheCargos);
  const [erro, setErro] = useState<string | null>(null);
  const [cargoInicial, setCargoInicial] = useState<string | null>(
    selecionarPrimeiro && cacheCargos?.length ? cacheCargos[0].cargo : null,
  );

  const recarregar = useCallback(async () => {
    if (!habilitado) {
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const dados = await buscarCargosReferencia(true);
      setCargos(dados);
      if (selecionarPrimeiro && dados.length > 0) {
        setCargoInicial(dados[0].cargo);
      }
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar cargos de referência.",
      );
    } finally {
      setCarregando(false);
    }
  }, [habilitado, selecionarPrimeiro]);

  useEffect(() => {
    if (!habilitado) {
      return;
    }

    if (cacheCargos) {
      setCargos(cacheCargos);
      if (selecionarPrimeiro && cacheCargos.length > 0) {
        setCargoInicial(cacheCargos[0].cargo);
      }
      setCarregando(false);
      return;
    }

    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setErro(null);

      try {
        const dados = await buscarCargosReferencia();
        if (!cancelado) {
          setCargos(dados);
          if (selecionarPrimeiro && dados.length > 0) {
            setCargoInicial(dados[0].cargo);
          }
        }
      } catch (error) {
        if (!cancelado) {
          setErro(
            error instanceof Error
              ? error.message
              : "Erro ao carregar cargos de referência.",
          );
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [habilitado, selecionarPrimeiro]);

  return { cargos, carregando, erro, cargoInicial, recarregar };
}
