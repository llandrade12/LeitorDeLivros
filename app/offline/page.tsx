"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, CloudDownload, HardDrive, LoaderCircle, Trash2, Wifi, WifiOff } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Leitor } from "@/components/leitor/Leitor";
import type { DadosLeitura } from "@/lib/biblioteca";
import type { Capitulo } from "@/lib/tipos";
import {
  cacheDoCapitulo,
  listarBaixados,
  paginasLocais,
  removerBaixado,
  suportaOffline,
  tamanhoLegivel,
  urlPaginaOffline,
  type CapituloBaixado,
} from "@/lib/offline";
import { cx } from "@/lib/util";

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const f = () => setOnline(navigator.onLine);
    f();
    window.addEventListener("online", f);
    window.addEventListener("offline", f);
    return () => {
      window.removeEventListener("online", f);
      window.removeEventListener("offline", f);
    };
  }, []);
  return online;
}

/** Capa = 1ª página guardada no aparelho */
function CapaLocal({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    caches
      .open(cacheDoCapitulo(id))
      .then((c) => c.match(urlPaginaOffline(id, 1)))
      .then((r) => r?.blob())
      .then((b) => {
        if (b) {
          u = URL.createObjectURL(b);
          setUrl(u);
        }
      })
      .catch(() => {});
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="size-full object-cover" />
  ) : (
    <div className="grid size-full place-items-center bg-superficie text-suave">
      <BookOpen size={18} />
    </div>
  );
}

export default function BaixadosPage() {
  const online = useOnline();
  const [lista, setLista] = useState<CapituloBaixado[] | null>(null);
  const [lendo, setLendo] = useState<{ dados: DadosLeitura; nome: string } | null>(null);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  const recarregar = useCallback(() => {
    if (!suportaOffline()) return setLista([]);
    listarBaixados().then(setLista).catch(() => setLista([]));
  }, []);
  useEffect(recarregar, [recarregar]);

  const porSerie = useMemo(() => {
    const m = new Map<string, CapituloBaixado[]>();
    for (const c of lista ?? []) m.set(c.serieTitulo, [...(m.get(c.serieTitulo) ?? []), c]);
    return [...m.entries()];
  }, [lista]);
  const totalBytes = (lista ?? []).reduce((t, c) => t + c.bytes, 0);

  async function abrir(c: CapituloBaixado) {
    setErro("");
    setAbrindo(c.id);
    try {
      const paginas = await paginasLocais(c.id, c.total);
      if (paginas.some((p) => !p)) throw new Error("Algumas páginas sumiram do aparelho. Baixe o capítulo de novo.");
      const agora = new Date().toISOString();
      const capitulo = {
        id: c.id,
        series_id: c.serieId,
        numero: c.numero,
        titulo: c.titulo,
        total_paginas: c.total,
      } as Capitulo;
      setLendo({
        nome: c.nomeLeitor,
        dados: {
          capitulo,
          serie: { id: c.serieId, titulo: c.serieTitulo, slug: c.serieSlug },
          paginas,
          paginaInicial: c.concluido && c.pagina >= c.total ? 1 : Math.min(Math.max(c.pagina, 1), c.total),
          concluido: c.concluido,
          marcadores: c.marcadores.map((m) => ({
            id: `local-${m.pagina}`,
            user_id: "",
            chapter_id: c.id,
            pagina: m.pagina,
            nota: m.nota,
            criado_em: agora,
          })),
          anterior: null,
          proximo: null,
        },
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui abrir.");
    } finally {
      setAbrindo(null);
    }
  }

  function fecharLeitor() {
    lendo?.dados.paginas.forEach((u) => URL.revokeObjectURL(u));
    setLendo(null);
    recarregar();
  }

  if (lendo) return <Leitor dados={lendo.dados} nomeLeitor={lendo.nome} offline={{ aoSair: fecharLeitor }} />;

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 pb-16 pt-6">
      <header className="mb-8 flex items-center gap-3">
        <Logo tamanho="sm" />
        <span
          className={cx(
            "ml-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
            online ? "border-sucesso/30 text-sucesso" : "border-borda text-suave",
          )}
        >
          {online ? <Wifi size={13} /> : <WifiOff size={13} />}
          {online ? "Online" : "Offline"}
        </span>
      </header>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CloudDownload className="text-primaria" /> Baixados
          </h1>
          <p className="mt-1 text-sm text-suave">Capítulos guardados neste aparelho para ler sem internet.</p>
        </div>
        {online && (
          <Link href="/" className="btn-secundario">
            <ArrowLeft size={16} /> Voltar ao início
          </Link>
        )}
      </div>

      {erro && <p className="mb-4 rounded-xl border border-perigo/30 bg-perigo/10 p-3 text-sm text-perigo">{erro}</p>}

      {lista === null ? (
        <div className="grid place-items-center py-20 text-suave">
          <LoaderCircle className="animate-spin" />
        </div>
      ) : !suportaOffline() ? (
        <p className="cartao p-6 text-sm text-suave">Este navegador não permite leitura offline. Use o app instalado no Chrome ou Safari.</p>
      ) : lista.length === 0 ? (
        <div className="cartao grid place-items-center px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-superficie text-primaria">
            <CloudDownload size={26} />
          </span>
          <p className="mt-4 font-semibold">Nada baixado ainda</p>
          <p className="mt-1 max-w-sm text-sm text-suave">
            Na página de uma HQ, toque em <b>Baixar</b> ao lado do capítulo (ou no ícone ⬇ dentro do leitor).
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {porSerie.map(([titulo, caps]) => (
            <section key={titulo} className="space-y-3">
              <h2 className="text-lg font-bold">{titulo}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {caps.map((c) => {
                  const pct = c.concluido ? 100 : Math.round((Math.min(c.pagina, c.total) / c.total) * 100);
                  const dias = Math.max(0, Math.ceil((c.expiraEm - Date.now()) / 864e5));
                  return (
                    <li key={c.id} className="cartao flex items-center gap-3 p-3">
                      <button onClick={() => abrir(c)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg">
                          <CapaLocal id={c.id} />
                          {abrindo === c.id && (
                            <span className="absolute inset-0 grid place-items-center bg-black/60">
                              <LoaderCircle size={18} className="animate-spin" />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="block truncate text-sm font-semibold">{c.rotulo}</span>
                          <span className="block text-xs text-suave">
                            {c.concluido ? "Lido" : c.pagina > 1 ? `Página ${c.pagina} de ${c.total}` : `${c.total} páginas`} · {tamanhoLegivel(c.bytes)}
                          </span>
                          <span className="block h-1 overflow-hidden rounded-full bg-superficie">
                            <span className="block h-full rounded-full bg-primaria" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="block text-[11px] text-suave/80">Disponível por mais {dias} dia(s)</span>
                        </span>
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Remover ${c.rotulo} do aparelho?`)) return;
                          await removerBaixado(c.id);
                          recarregar();
                        }}
                        className="grid size-9 shrink-0 place-items-center rounded-full text-suave hover:bg-perigo/10 hover:text-perigo"
                        aria-label="Remover do aparelho"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <p className="flex items-center gap-2 text-xs text-suave">
            <HardDrive size={14} /> Usando {tamanhoLegivel(totalBytes)} neste aparelho. O prazo renova sozinho sempre que você abre o app com internet.
          </p>
        </div>
      )}
    </main>
  );
}
