"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { ResumoSerie } from "@/lib/biblioteca";
import { CapaHQ } from "./CapaHQ";
import { cx } from "@/lib/util";

const FILTROS = [
  ["todas", "Todas"],
  ["em_leitura", "Em andamento"],
  ["nao_iniciado", "Não iniciadas"],
  ["concluido", "Concluídas"],
] as const;

type Filtro = (typeof FILTROS)[number][0];

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function GradeBiblioteca({
  series,
  vazio,
  buscaInicial = "",
  ordemInicial = "recentes",
}: {
  series: ResumoSerie[];
  vazio: string;
  buscaInicial?: string;
  ordemInicial?: string;
}) {
  const [busca, setBusca] = useState(buscaInicial);
  const [ordem, setOrdem] = useState(["recentes", "avaliacao", "az"].includes(ordemInicial) ? ordemInicial : "recentes");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(() => [...new Set(series.flatMap((s) => s.tags))].sort(), [series]);

  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    const lista = series.filter((s) => {
      if (filtro !== "todas" && s.estado !== filtro) return false;
      if (tag && !s.tags.includes(tag)) return false;
      if (!q) return true;
      return (
        normalizar(s.titulo).includes(q) ||
        normalizar(s.autor ?? "").includes(q) ||
        s.tags.some((t) => normalizar(t).includes(q))
      );
    });
    return [...lista].sort((a, b) => {
      if (ordem === "az") return a.titulo.localeCompare(b.titulo, "pt-BR");
      if (ordem === "avaliacao") return (b.mediaNota ?? -1) - (a.mediaNota ?? -1) || b.totalNotas - a.totalNotas;
      return b.atualizadoConteudo.localeCompare(a.atualizadoConteudo);
    });
  }, [series, busca, filtro, tag, ordem]);

  const contagem = (f: Filtro) => (f === "todas" ? series.length : series.filter((s) => s.estado === f).length);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="campo lg:max-w-md lg:flex-1">
          <Search size={18} className="shrink-0 text-suave" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por título, autor ou tag…" type="search" />
          {busca && (
            <button type="button" onClick={() => setBusca("")} aria-label="Limpar busca" className="text-suave hover:text-texto">
              <X size={16} />
            </button>
          )}
        </label>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0">
          {FILTROS.map(([v, r]) => (
            <button
              key={v}
              type="button"
              onClick={() => setFiltro(v)}
              aria-pressed={filtro === v}
              className={cx(
                "h-10 shrink-0 rounded-full border px-4 text-sm transition",
                filtro === v ? "border-primaria bg-primaria text-white" : "border-borda text-texto/80 hover:bg-superficie",
              )}
            >
              {r} <span className="opacity-60">{contagem(v)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-suave">
          Ordenar
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
            className="h-9 rounded-lg border border-borda bg-painel px-2 text-sm text-texto outline-none focus:border-primaria"
          >
            <option value="recentes">Mais recentes</option>
            <option value="avaliacao">Mais bem avaliadas</option>
            <option value="az">A–Z</option>
          </select>
        </label>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(tag === t ? null : t)}
              className={cx(
                "rounded-md px-2.5 py-1 text-xs transition",
                tag === t ? "bg-roxo text-white" : "bg-superficie text-suave hover:text-texto",
              )}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {visiveis.length === 0 ? (
        <p className="cartao p-10 text-center text-sm text-suave">{series.length ? "Nada encontrado com esses filtros." : vazio}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {visiveis.map((s) => (
            <li key={s.id}>
              <CapaHQ serie={s} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
