"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, FolderPlus, LoaderCircle, Plus } from "lucide-react";
import { alternarNaColecao, criarColecao } from "@/lib/acoes/leitor";
import { cx } from "@/lib/util";

export function BotaoColecao({
  serieId,
  colecoes,
}: {
  serieId: string;
  colecoes: { id: string; nome: string; tem: boolean }[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [pendente, iniciar] = useTransition();
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const f = (e: MouseEvent) => caixa.current && !caixa.current.contains(e.target as Node) && setAberto(false);
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);

  const qtd = colecoes.filter((c) => c.tem).length;

  return (
    <div ref={caixa} className="relative">
      <button type="button" onClick={() => setAberto((v) => !v)} className={cx("btn-secundario", qtd > 0 && "border-primaria/50 text-primaria")}>
        <FolderPlus size={16} /> {qtd > 0 ? `Em ${qtd} coleção(ões)` : "Adicionar à coleção"}
      </button>
      {aberto && (
        <div className="absolute left-0 top-12 z-30 w-72 space-y-2 rounded-2xl border border-borda bg-painel p-3 shadow-2xl">
          {colecoes.length === 0 && <p className="px-1 text-sm text-suave">Você ainda não tem coleções.</p>}
          {colecoes.map((c) => (
            <button
              key={c.id}
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  await alternarNaColecao(c.id, serieId, !c.tem);
                  router.refresh();
                })
              }
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-superficie"
            >
              <span className={cx("grid size-5 place-items-center rounded-md border", c.tem ? "border-primaria bg-primaria text-white" : "border-borda")}>
                {c.tem && <Check size={13} strokeWidth={3} />}
              </span>
              <span className="truncate">{c.nome}</span>
            </button>
          ))}
          <form
            className="flex gap-2 border-t border-borda/60 pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!nome.trim()) return;
              iniciar(async () => {
                await criarColecao(nome, serieId);
                setNome("");
                router.refresh();
              });
            }}
          >
            <div className="campo h-10 flex-1 px-3">
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nova coleção" maxLength={60} />
            </div>
            <button disabled={pendente || !nome.trim()} className="btn-primario h-10 w-10 px-0" aria-label="Criar coleção">
              {pendente ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
