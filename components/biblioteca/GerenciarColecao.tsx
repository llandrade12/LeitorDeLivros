"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { alternarNaColecao, criarColecao, excluirColecao, renomearColecao } from "@/lib/acoes/leitor";

export function NovaColecao() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [pendente, iniciar] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!nome.trim()) return;
        iniciar(async () => {
          await criarColecao(nome);
          setNome("");
          router.refresh();
        });
      }}
    >
      <div className="campo h-11 flex-1">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da nova coleção (ex.: Para reler)" maxLength={60} />
      </div>
      <button disabled={pendente || !nome.trim()} className="btn-primario">
        {pendente ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} Criar
      </button>
    </form>
  );
}

export function AcoesColecao({ id, nome }: { id: string; nome: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nome);
  const [pendente, iniciar] = useTransition();

  if (editando) {
    return (
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          iniciar(async () => {
            await renomearColecao(id, valor);
            setEditando(false);
            router.refresh();
          });
        }}
      >
        <div className="campo h-10">
          <input value={valor} onChange={(e) => setValor(e.target.value)} maxLength={60} autoFocus />
        </div>
        <button disabled={pendente} className="btn-primario h-10">Salvar</button>
        <button type="button" onClick={() => setEditando(false)} className="btn-secundario h-10 w-10 px-0" aria-label="Cancelar">
          <X size={16} />
        </button>
      </form>
    );
  }
  return (
    <div className="flex gap-2">
      <button onClick={() => setEditando(true)} className="btn-secundario h-10">
        <Pencil size={15} /> Renomear
      </button>
      <button
        disabled={pendente}
        onClick={() => {
          if (!window.confirm(`Excluir a coleção "${nome}"? As HQs continuam na biblioteca.`)) return;
          iniciar(async () => {
            await excluirColecao(id);
            router.push("/colecoes");
            router.refresh();
          });
        }}
        className="btn-perigo h-10"
      >
        <Trash2 size={15} /> Excluir
      </button>
    </div>
  );
}

export function TirarDaColecao({ colecaoId, serieId }: { colecaoId: string; serieId: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <button
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          await alternarNaColecao(colecaoId, serieId, false);
          router.refresh();
        })
      }
      className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-black/70 text-white opacity-90 hover:bg-perigo"
      aria-label="Tirar da coleção"
      title="Tirar da coleção"
    >
      {pendente ? <LoaderCircle size={14} className="animate-spin" /> : <X size={14} />}
    </button>
  );
}
