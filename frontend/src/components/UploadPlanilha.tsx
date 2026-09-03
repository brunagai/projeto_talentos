"use client";

import { DragEvent, useRef, useState } from "react";

import Card from "./Card";
import { AlertErro } from "./AlertErro";
import ResultadosPlanilha from "./ResultadosPlanilha";
import type { PerfilTalentoData } from "./PerfilTalento";
import { apiFetch } from "../lib/api";

interface UploadMetricasResponse {
  arquivo: string;
  linhas_processadas: number;
  linhas_com_erro: number;
  erros: string[];
  metricas: {
    tipo: "agregada";
    media_tecnica: number;
    media_socioemocional: number;
    media_competencias: number;
    total_horas_dedicadas: number;
    quantidade_avaliacoes: number;
  };
  perfis?: PerfilTalentoData[];
}

const EXTENSOES_PERMITIDAS = [".csv", ".xlsx"];

function arquivoPermitido(nome: string): boolean {
  const nomeMinusculo = nome.toLowerCase();
  return EXTENSOES_PERMITIDAS.some((extensao) =>
    nomeMinusculo.endsWith(extensao),
  );
}

export function UploadPlanilha() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<UploadMetricasResponse | null>(
    null,
  );

  function selecionarArquivo(fileList: FileList | null) {
    const selecionado = fileList?.[0];
    if (!selecionado) {
      return;
    }

    if (!arquivoPermitido(selecionado.name)) {
      setErro("Formato não suportado. Envie arquivos .csv ou .xlsx.");
      setArquivo(null);
      setResultado(null);
      return;
    }

    setErro(null);
    setArquivo(selecionado);
    setResultado(null);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setArrastando(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setArrastando(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setArrastando(false);
    selecionarArquivo(event.dataTransfer.files);
  }

  async function handleUpload() {
    if (!arquivo) {
      setErro("Selecione uma planilha antes de enviar.");
      return;
    }

    setEnviando(true);
    setErro(null);

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);

      const data = await apiFetch<UploadMetricasResponse>("/avaliacoes/upload", {
        method: "POST",
        body: formData,
      });
      setResultado(data);
    } catch (error) {
      setResultado(null);
      setErro(
        error instanceof Error ? error.message : "Erro inesperado no upload.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Card accent className="mx-auto w-full max-w-2xl">
        <header className="mb-6">
          <h2 className="text-xl font-semibold text-primary">
            Upload de planilha
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Selecione ou arraste um arquivo .csv ou .xlsx para processar as
            avaliações em lote.
          </p>
        </header>

        <div
          role="button"
          tabIndex={0}
          aria-label="Selecionar ou soltar planilha CSV ou XLSX"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            arrastando
              ? "border-primary bg-primary/10"
              : "border-card-elevated bg-surface-muted hover:border-primary/40",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            onChange={(event) => selecionarArquivo(event.target.files)}
          />

          <p className="text-sm text-zinc-300">
            Arraste a planilha aqui ou clique para selecionar
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Formatos aceitos: .csv, .xlsx
          </p>

          {arquivo && (
            <p className="mt-4 text-sm font-medium text-primary">
              Arquivo selecionado: {arquivo.name}
            </p>
          )}
        </div>

        {erro && (
          <AlertErro className="mt-4 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
            {erro}
          </AlertErro>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!arquivo || enviando}
          className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? "Processando planilha..." : "Enviar planilha"}
        </button>
      </Card>

      {resultado && (
        <ResultadosPlanilha
          arquivo={resultado.arquivo}
          linhas_processadas={resultado.linhas_processadas}
          linhas_com_erro={resultado.linhas_com_erro}
          erros={resultado.erros}
          metricas={resultado.metricas}
          perfis={resultado.perfis ?? []}
        />
      )}
    </div>
  );
}

export default UploadPlanilha;
