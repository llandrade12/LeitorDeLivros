"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, BookOpen, Eye, EyeOff, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import {
  atualizarCapitulo,
  criarCapitulo,
  excluirCapitulo,
  moverCapitulo,
} from "@/lib/acoes/admin-hqs";
import { EnviarPaginas } from "./EnviarPaginas";
import { Alerta } from "@/components/Alerta";
import { cx } from "@/lib/util";

export type CapAdmin = {
  id: string;
  numero: string;
  titulo: string;
  publicado: boolean;
  total_paginas: number;
  leitores: number;
};

export function ListaCapitulos({ serieId, capitulos }: { serieId: string; capitulos: CapAdmin[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const [novoNum, setNovoNum] = useState(String(capitulos.length + 1));
  const [novoTit, setNovoTit] = useState("");

  const rodar = (fn: () => Promise<{ erro?: string } | object>) =>
    iniciar(async () => {
      setErro("");
      const r = (await fn()) as { erro?: string };
      if (r?.erro) setErro(r.erro);
      router.refresh();
    });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Capítulos</h2>
        {pendente && <LoaderCircle size={18} className="animate-spin text-suave" />}
      </div>
      {erro && <Alerta tipo="erro" titulo={erro} />}

      {capitulos.length === 0 && (
        <p className="cartao p-5 text-sm text-suave">Nenhum capítulo ainda. Crie o primeiro abaixo e envie o PDF.</p>
      )}

      <ol className="space-y-3">
        {capitulos.map((c, i) => (
          <LinhaCapitulo
            key={c.id}
            cap={c}
            primeiro={i === 0}
            ultimo={i === capitulos.length - 1}
            pendente={pendente}
            rodar={rodar}
          />
        ))}
      </ol>

      <form
        className="cartao flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          rodar(async () => {
            const r = await criarCapitulo(serieId, novoNum, novoTit);
            if (!("erro" in r)) {
              setNovoTit("");
              setNovoNum(String(capitulos.length + 2));
            }
            return r;
          });
        }}
      >
        <div className="sm:w-28">
          <label className="rotulo">Número</label>
          <div className="campo">
            <input value={novoNum} onChange={(e) => setNovoNum(e.target.value)} placeholder="1" />
          </div>
        </div>
        <div className="flex-1">
          <label className="rotulo">Título (opcional)</label>
          <div className="campo">
            <input value={novoTit} onChange={(e) => setNovoTit(e.target.value)} placeholder="O começo" />
          </div>
        </div>
        <button disabled={pendente} className="btn-primario">
          <Plus size={16} /> Novo capítulo
        </button>
      </form>
    </section>
  );
}

function LinhaCapitulo({
  cap,
  primeiro,
  ultimo,
  pendente,
  rodar,
}: {
  cap: CapAdmin;
  primeiro: boolean;
  ultimo: boolean;
  pendente: boolean;
  rodar: (fn: () => Promise<object>) => void;
}) {
  const [numero, setNumero] = useState(cap.numero);
  const [titulo, setTitulo] = useState(cap.titulo);
  const alterado = numero !== cap.numero || titulo !== cap.titulo;

  return (
    <li className="cartao space-y-4 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-24">
          <label className="rotulo">Número</label>
          <div className="campo h-10">
            <input value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
        </div>
        <div className="min-w-40 flex-1">
          <label className="rotulo">Título</label>
          <div className="campo h-10">
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Sem título" />
          </div>
        </div>
        {alterado && (
          <button
            disabled={pendente}
            onClick={() => rodar(() => atualizarCapitulo(cap.id, { numero, titulo }))}
            className="btn-primario h-10 px-3 text-xs"
          >
            <Save size={14} /> Salvar
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={cx(
            "rounded-full px-2.5 py-1 font-medium",
            cap.publicado ? "bg-sucesso/15 text-sucesso" : "bg-alerta/15 text-alerta",
          )}
        >
          {cap.publicado ? "Publicado" : "Rascunho"}
        </span>
        <span className="rounded-full bg-superficie px-2.5 py-1 text-suave">
          {cap.total_paginas ? `${cap.total_paginas} páginas` : "Sem páginas"}
        </span>
        {cap.leitores > 0 && (
          <span className="rounded-full bg-superficie px-2.5 py-1 text-suave">{cap.leitores} lendo/leram</span>
        )}
        <div className="ml-auto flex flex-wrap gap-1.5">
          {cap.total_paginas > 0 && (
            <Link href={`/ler/${cap.id}`} className="btn-secundario h-8 px-2.5 text-xs" title="Abrir no leitor">
              <BookOpen size={14} />
            </Link>
          )}
          <button
            disabled={pendente || cap.total_paginas === 0}
            title={cap.total_paginas === 0 ? "Envie as páginas antes de publicar" : undefined}
            onClick={() => rodar(() => atualizarCapitulo(cap.id, { publicado: !cap.publicado }))}
            className="btn-secundario h-8 px-2.5 text-xs"
          >
            {cap.publicado ? <EyeOff size={14} /> : <Eye size={14} />}
            {cap.publicado ? "Despublicar" : "Publicar"}
          </button>
          <button
            disabled={pendente || primeiro}
            onClick={() => rodar(() => moverCapitulo(cap.id, -1))}
            className="btn-secundario h-8 w-8 px-0"
            aria-label="Subir"
          >
            <ArrowUp size={14} />
          </button>
          <button
            disabled={pendente || ultimo}
            onClick={() => rodar(() => moverCapitulo(cap.id, 1))}
            className="btn-secundario h-8 w-8 px-0"
            aria-label="Descer"
          >
            <ArrowDown size={14} />
          </button>
          <button
            disabled={pendente}
            onClick={() => {
              if (window.confirm("Excluir este capítulo, as páginas e o progresso dos leitores nele?"))
                rodar(() => excluirCapitulo(cap.id));
            }}
            className="btn-perigo h-8 w-8 px-0"
            aria-label="Excluir capítulo"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <EnviarPaginas capituloId={cap.id} temPaginas={cap.total_paginas > 0} />
    </li>
  );
}
