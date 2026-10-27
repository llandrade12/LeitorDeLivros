"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  List,
  Maximize,
  Minimize,
  Minus,
  Plus,
  Settings2,
  X,
} from "lucide-react";
import type { DadosLeitura } from "@/lib/biblioteca";
import type { Marcador } from "@/lib/tipos";
import { rotuloCapitulo } from "@/lib/rotulos";
import { removerMarcador, renovarPaginas, salvarMarcador, salvarProgresso } from "@/lib/acoes/leitor";
import { atualizarPaginaBaixado, guardarProgressoPendente } from "@/lib/offline";
import { BotaoBaixar } from "./BotaoBaixar";
import { cx } from "@/lib/util";

type Modo = "unica" | "dupla" | "vertical";
type Direcao = "ltr" | "rtl";
type Tema = "preto" | "escuro" | "claro" | "papel";
type Ajuste = "altura" | "largura";
type Filtro = "normal" | "sepia" | "noturno" | "cinza" | "contraste";
type Prefs = { modo: Modo; direcao: Direcao; tema: Tema; ajuste: Ajuste; filtro: Filtro; brilho: number };

const PADRAO: Prefs = { modo: "unica", direcao: "ltr", tema: "preto", ajuste: "altura", filtro: "normal", brilho: 100 };
const CHAVE_PREFS = "leitor-prefs";
const FUNDO: Record<Tema, string> = { preto: "#000000", escuro: "#13131c", claro: "#eceef2", papel: "#efe4cc" };

/** Filtros de tela aplicados às páginas */
const FILTRO_CSS: Record<Filtro, string> = {
  normal: "",
  sepia: "sepia(.55) contrast(.95)",
  noturno: "sepia(.35) saturate(.8) brightness(.78)",
  cinza: "grayscale(1)",
  contraste: "contrast(1.25) saturate(1.1)",
};

function lerPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE_PREFS) ?? "{}");
    return { ...PADRAO, ...p };
  } catch {
    return PADRAO;
  }
}

/** Página dupla: a 1ª fica sozinha (capa), depois 2-3, 4-5… */
const inicioDupla = (p: number) => (p <= 1 ? 1 : p % 2 === 0 ? p : p - 1);

export function Leitor({
  dados,
  nomeLeitor,
  offline,
}: {
  dados: DadosLeitura;
  nomeLeitor: string;
  /** Leitura sem internet (tela Baixados): sem chamadas ao servidor */
  offline?: { aoSair: () => void };
}) {
  const { capitulo, serie } = dados;
  const total = capitulo.total_paginas;

  const [paginas, setPaginas] = useState(dados.paginas);
  const [atual, setAtual] = useState(dados.paginaInicial);
  const [prefs, setPrefs] = useState<Prefs>(PADRAO);
  const [zoom, setZoom] = useState(1);
  const [interfaceVisivel, setInterfaceVisivel] = useState(true);
  const [painel, setPainel] = useState<null | "ajustes" | "marcadores">(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const [estreito, setEstreito] = useState(false);
  const [marcadores, setMarcadores] = useState<Marcador[]>(dados.marcadores);
  const [concluido, setConcluido] = useState(dados.concluido);
  const [irPara, setIrPara] = useState("");

  const area = useRef<HTMLDivElement>(null);
  const refsVertical = useRef<(HTMLDivElement | null)[]>([]);
  const renovando = useRef(false);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const rolandoPara = useRef(false);

  // Preferências salvas neste aparelho
  useEffect(() => {
    setPrefs(lerPrefs());
    const mq = window.matchMedia("(max-width: 767px)");
    const f = () => setEstreito(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  const mudarPrefs = (p: Partial<Prefs>) =>
    setPrefs((v) => {
      const n = { ...v, ...p };
      try {
        localStorage.setItem(CHAVE_PREFS, JSON.stringify(n));
      } catch {
        /* sem armazenamento */
      }
      return n;
    });

  const modo: Modo = prefs.modo === "dupla" && estreito ? "unica" : prefs.modo;
  const rtl = prefs.direcao === "rtl";

  // ---------- Navegação ----------
  const visiveis = useMemo(() => {
    if (modo !== "dupla") return [atual];
    const s = inicioDupla(atual);
    return s === 1 || s + 1 > total ? [s] : [s, s + 1];
  }, [modo, atual, total]);

  const irParaPagina = useCallback(
    (p: number) => {
      const alvo = Math.min(Math.max(1, Math.round(p)), total);
      setAtual(alvo);
      if (modo === "vertical") {
        rolandoPara.current = true;
        refsVertical.current[alvo - 1]?.scrollIntoView({ block: "start" });
        setTimeout(() => (rolandoPara.current = false), 300);
      } else {
        area.current?.scrollTo({ top: 0, left: 0 });
      }
    },
    [modo, total],
  );

  const proxima = useCallback(() => {
    if (modo === "dupla") {
      const s = inicioDupla(atual);
      irParaPagina(s === 1 ? 2 : s + 2);
    } else irParaPagina(atual + 1);
  }, [modo, atual, irParaPagina]);

  const anterior = useCallback(() => {
    if (modo === "dupla") {
      const s = inicioDupla(atual);
      irParaPagina(s <= 2 ? 1 : s - 2);
    } else irParaPagina(atual - 1);
  }, [modo, atual, irParaPagina]);

  const paraEsquerda = rtl ? proxima : anterior;
  const paraDireita = rtl ? anterior : proxima;

  // Teclado
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.closest("input, textarea")) return;
      if (e.key === "ArrowRight") paraDireita();
      else if (e.key === "ArrowLeft") paraEsquerda();
      else if (modo !== "vertical" && (e.key === " " || e.key === "PageDown")) {
        e.preventDefault();
        proxima();
      } else if (modo !== "vertical" && e.key === "PageUp") anterior();
      else if (e.key === "Home") irParaPagina(1);
      else if (e.key === "End") irParaPagina(total);
      else if (e.key.toLowerCase() === "f") alternarTelaCheia();
      else if (e.key === "Escape") setPainel(null);
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  // Rolagem contínua: descobre a página visível
  useEffect(() => {
    if (modo !== "vertical") return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (rolandoPara.current) return;
        const visivel = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const n = Number((visivel?.target as HTMLElement | undefined)?.dataset.pagina);
        if (n) setAtual(n);
      },
      { root: area.current, threshold: [0.25, 0.5, 0.75] },
    );
    refsVertical.current.forEach((el) => el && obs.observe(el));
    // ao entrar no modo, vai para a página atual
    refsVertical.current[atual - 1]?.scrollIntoView({ block: "start" });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  // ---------- Salvar progresso (com debounce) ----------
  const ultimaVisivel = Math.max(...visiveis);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (ultimaVisivel >= total) setConcluido(true);
      if (offline || !navigator.onLine) {
        // sem internet: guarda no aparelho e sincroniza quando a conexão voltar
        await guardarProgressoPendente(capitulo.id, ultimaVisivel, total).catch(() => {});
        return;
      }
      try {
        const r = await salvarProgresso(capitulo.id, ultimaVisivel, total);
        if ("concluido" in r && r.concluido) setConcluido(true);
        atualizarPaginaBaixado(capitulo.id, ultimaVisivel, total).catch(() => {});
      } catch {
        await guardarProgressoPendente(capitulo.id, ultimaVisivel, total).catch(() => {});
      }
    }, 800);
    return () => clearTimeout(t);
  }, [ultimaVisivel, capitulo.id, total, offline]);

  // ---------- Pré-carregar as próximas páginas ----------
  useEffect(() => {
    for (let i = ultimaVisivel; i < Math.min(ultimaVisivel + 4, total); i++) {
      const img = new Image();
      img.src = paginas[i];
    }
  }, [ultimaVisivel, paginas, total]);

  // URL assinada expirou → pede novas
  const aoFalharImagem = useCallback(async () => {
    if (offline || renovando.current) return;
    renovando.current = true;
    try {
      const r = await renovarPaginas(capitulo.id);
      if ("paginas" in r && r.paginas) setPaginas(r.paginas);
    } finally {
      setTimeout(() => (renovando.current = false), 5000);
    }
  }, [capitulo.id, offline]);

  // ---------- Tela cheia ----------
  function alternarTelaCheia() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }
  useEffect(() => {
    const f = () => setTelaCheia(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);

  // ---------- Toques e cliques ----------
  function cliqueNaArea(e: React.MouseEvent) {
    if (modo === "vertical") {
      setInterfaceVisivel((v) => !v);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    if (x < 0.3) paraEsquerda();
    else if (x > 0.7) paraDireita();
    else setInterfaceVisivel((v) => !v);
  }
  function inicioToque(e: React.TouchEvent) {
    if (e.touches.length !== 1) return (toque.current = null);
    toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function fimToque(e: React.TouchEvent) {
    const t = toque.current;
    toque.current = null;
    if (!t || modo === "vertical" || zoom > 1) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      // dedo para a esquerda = "virar a página" no sentido ocidental
      if (dx < 0) paraDireita();
      else paraEsquerda();
    }
  }

  // ---------- Marcadores ----------
  const marcadorAtual = marcadores.find((m) => visiveis.includes(m.pagina));
  async function alternarMarcador() {
    if (offline) return;
    if (marcadorAtual) {
      setMarcadores((l) => l.filter((m) => m.id !== marcadorAtual.id));
      await removerMarcador(marcadorAtual.id);
    } else {
      const r = await salvarMarcador(capitulo.id, atual, "");
      if ("marcador" in r && r.marcador) {
        const novo = r.marcador;
        setMarcadores((l) => [...l.filter((m) => m.pagina !== novo.pagina), novo].sort((a, b) => a.pagina - b.pagina));
        setPainel("marcadores");
      }
    }
  }
  async function salvarNota(m: Marcador, nota: string) {
    setMarcadores((l) => l.map((x) => (x.id === m.id ? { ...x, nota } : x)));
    if (!offline) await salvarMarcador(capitulo.id, m.pagina, nota);
  }

  // ---------- Render ----------
  const claro = prefs.tema === "claro" || prefs.tema === "papel";
  const filtroCss = [FILTRO_CSS[prefs.filtro] ?? "", prefs.brilho !== 100 ? `brightness(${prefs.brilho / 100})` : ""]
    .filter(Boolean)
    .join(" ");
  const naUltima = ultimaVisivel >= total;
  const pctBarra = total > 1 ? ((ultimaVisivel - 1) / (total - 1)) * 100 : 100;

  const imagem = (n: number, estilo?: React.CSSProperties, classe?: string, preguicoso = false) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={n}
      src={paginas[n - 1]}
      alt={`Página ${n}`}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onError={aoFalharImagem}
      decoding="async"
      loading={preguicoso ? "lazy" : "eager"}
      className={cx("select-none transition-[filter] duration-300", classe)}
      style={{ ...estilo, filter: filtroCss || undefined }}
    />
  );

  const marcaDagua = (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      <div className="absolute -inset-1/2 flex rotate-[-28deg] flex-wrap content-start gap-x-24 gap-y-28 opacity-[0.06]">
        {Array.from({ length: 80 }, (_, i) => (
          <span key={i} className={cx("text-sm font-semibold whitespace-nowrap", claro ? "text-black" : "text-white")}>
            {nomeLeitor}
          </span>
        ))}
      </div>
    </div>
  );

  const barraCor = claro ? "bg-white/90 text-zinc-900 border-zinc-200" : "bg-[#13131c]/90 text-texto border-white/10";

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: FUNDO[prefs.tema] }}>
      {/* Área de leitura */}
      <div
        ref={area}
        onClick={cliqueNaArea}
        onTouchStart={inicioToque}
        onTouchEnd={fimToque}
        className={cx("relative flex-1 overflow-auto overscroll-contain", modo !== "vertical" && "flex")}
      >
        {modo === "vertical" ? (
          <div className="mx-auto flex flex-col items-center py-14">
            {paginas.map((_, i) => (
              <div
                key={i}
                ref={(el) => {
                  refsVertical.current[i] = el;
                }}
                data-pagina={i + 1}
                className="relative w-full"
                style={{ maxWidth: `${Math.round(900 * zoom)}px` }}
              >
                {imagem(i + 1, { minHeight: "20vh" }, "block w-full bg-black/20", Math.abs(i + 1 - atual) > 2)}
              </div>
            ))}
            <FimCapitulo dados={dados} claro={claro} offline={offline} />
          </div>
        ) : (
          <div
            className={cx("relative m-auto flex shrink-0 items-center justify-center", rtl && "flex-row-reverse")}
            style={prefs.ajuste === "largura" ? { width: `${100 * zoom}%` } : { height: `${100 * zoom}%` }}
          >
            {visiveis.map((n) =>
              imagem(
                n,
                prefs.ajuste === "largura"
                  ? { width: `${100 / visiveis.length}%`, height: "auto" }
                  : { height: "100%", width: "auto", maxWidth: "none" },
                "block",
              ),
            )}
          </div>
        )}
        {marcaDagua}
      </div>

      {/* Barra superior */}
      <header
        className={cx(
          "absolute inset-x-0 top-0 z-20 flex h-14 items-center gap-2 border-b px-3 backdrop-blur transition-transform duration-200",
          barraCor,
          !interfaceVisivel && "-translate-y-full",
        )}
      >
        {offline ? (
          <button onClick={offline.aoSair} className="grid size-10 place-items-center rounded-full hover:bg-black/10" aria-label="Voltar aos baixados">
            <ArrowLeft size={20} />
          </button>
        ) : (
          <Link href={`/serie/${serie.slug}`} className="grid size-10 place-items-center rounded-full hover:bg-black/10" aria-label="Voltar">
            <ArrowLeft size={20} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{serie.titulo}</p>
          <p className="truncate text-xs opacity-70">
            {rotuloCapitulo(capitulo)}
            {concluido && " · ✓ lido"}
            {offline && " · offline"}
          </p>
        </div>
        {!offline && <BotaoBaixar capituloId={capitulo.id} compacto />}
        {!offline && (
          <BotaoIcone rotulo={marcadorAtual ? "Remover marcador" : "Marcar esta página"} onClick={alternarMarcador} ativo={Boolean(marcadorAtual)}>
            {marcadorAtual ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
          </BotaoIcone>
        )}
        <BotaoIcone rotulo="Marcadores" onClick={() => setPainel(painel === "marcadores" ? null : "marcadores")} ativo={painel === "marcadores"}>
          <List size={19} />
        </BotaoIcone>
        <BotaoIcone rotulo="Ajustes de leitura" onClick={() => setPainel(painel === "ajustes" ? null : "ajustes")} ativo={painel === "ajustes"}>
          <Settings2 size={19} />
        </BotaoIcone>
        <BotaoIcone rotulo={telaCheia ? "Sair da tela cheia" : "Tela cheia"} onClick={alternarTelaCheia} className="hidden sm:grid">
          {telaCheia ? <Minimize size={19} /> : <Maximize size={19} />}
        </BotaoIcone>
      </header>

      {/* Barra inferior */}
      <footer
        className={cx(
          "absolute inset-x-0 bottom-0 z-20 space-y-2 border-t px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-200",
          barraCor,
          !interfaceVisivel && "translate-y-full",
        )}
      >
        <div className="flex items-center gap-2">
          <BotaoIcone rotulo={rtl ? "Próxima" : "Anterior"} onClick={paraEsquerda}>
            <ChevronLeft size={20} />
          </BotaoIcone>
          <div
            role="slider"
            aria-label="Progresso do capítulo"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={ultimaVisivel}
            tabIndex={0}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              let x = (e.clientX - r.left) / r.width;
              if (rtl) x = 1 - x;
              irParaPagina(1 + x * (total - 1));
            }}
            className="group relative h-6 flex-1 cursor-pointer"
          >
            <div className={cx("absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full", claro ? "bg-zinc-300" : "bg-white/15")} />
            <div
              className={cx("absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primaria", rtl ? "right-0" : "left-0")}
              style={{ width: `${pctBarra}%` }}
            />
            <div
              className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primaria shadow ring-4 ring-primaria/25"
              style={{ left: `${rtl ? 100 - pctBarra : pctBarra}%` }}
            />
            {marcadores.map((m) => (
              <span
                key={m.id}
                className="absolute top-0 h-2 w-0.5 -translate-x-1/2 bg-amber-400"
                style={{ left: `${(((rtl ? total - m.pagina : m.pagina - 1) / Math.max(total - 1, 1)) * 100).toFixed(2)}%` }}
              />
            ))}
          </div>
          <BotaoIcone rotulo={rtl ? "Anterior" : "Próxima"} onClick={paraDireita}>
            <ChevronRight size={20} />
          </BotaoIcone>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="tabular-nums opacity-80">
            Página {visiveis.length > 1 ? `${visiveis[0]}–${visiveis[1]}` : atual} de {total}
          </span>
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(irPara);
              if (n) irParaPagina(n);
              setIrPara("");
            }}
          >
            <label htmlFor="ir-para" className="opacity-70">Ir para</label>
            <input
              id="ir-para"
              inputMode="numeric"
              value={irPara}
              onChange={(e) => setIrPara(e.target.value.replace(/\D/g, ""))}
              placeholder={String(atual)}
              className={cx("h-7 w-14 rounded-md border px-2 text-center outline-none focus:border-primaria", claro ? "border-zinc-300 bg-white" : "border-white/15 bg-black/30")}
            />
          </form>
          {naUltima && dados.proximo && !offline ? (
            <Link href={`/ler/${dados.proximo.id}`} className="rounded-full bg-primaria px-3 py-1.5 font-semibold text-white">
              Próximo capítulo →
            </Link>
          ) : (
            <span className="hidden opacity-60 sm:inline">← → teclado · F tela cheia</span>
          )}
        </div>
      </footer>

      {/* Painéis */}
      {painel && (
        <aside
          className={cx(
            "animar-entrada absolute right-3 top-16 z-30 max-h-[calc(100dvh-10rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border p-4 shadow-2xl backdrop-blur",
            claro ? "border-zinc-200 bg-white text-zinc-900" : "border-white/10 bg-[#1d1d2b] text-texto",
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{painel === "ajustes" ? "Ajustes de leitura" : "Marcadores"}</h2>
            <button onClick={() => setPainel(null)} aria-label="Fechar" className="opacity-60 hover:opacity-100">
              <X size={18} />
            </button>
          </div>

          {painel === "ajustes" ? (
            <div className="space-y-4 text-sm">
              <Opcoes
                titulo="Modo"
                valor={prefs.modo}
                opcoes={[
                  ["unica", "Página única"],
                  ["dupla", "Dupla"],
                  ["vertical", "Rolagem"],
                ]}
                onChange={(v) => mudarPrefs({ modo: v as Modo })}
                claro={claro}
              />
              {prefs.modo === "dupla" && estreito && (
                <p className="text-xs opacity-70">Na tela do celular a página dupla vira página única.</p>
              )}
              <Opcoes
                titulo="Direção de leitura"
                valor={prefs.direcao}
                opcoes={[
                  ["ltr", "Esquerda → direita"],
                  ["rtl", "Direita → esquerda (mangá)"],
                ]}
                onChange={(v) => mudarPrefs({ direcao: v as Direcao })}
                claro={claro}
              />
              {modo !== "vertical" && (
                <Opcoes
                  titulo="Ajustar"
                  valor={prefs.ajuste}
                  opcoes={[
                    ["altura", "À altura"],
                    ["largura", "À largura"],
                  ]}
                  onChange={(v) => mudarPrefs({ ajuste: v as Ajuste })}
                  claro={claro}
                />
              )}
              <div>
                <p className="mb-1.5 text-xs font-medium opacity-70">Zoom</p>
                <div className="flex items-center gap-2">
                  <BotaoIcone rotulo="Diminuir zoom" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}>
                    <Minus size={16} />
                  </BotaoIcone>
                  <button onClick={() => setZoom(1)} className="min-w-14 rounded-md px-2 py-1 text-center tabular-nums hover:bg-black/10">
                    {Math.round(zoom * 100)}%
                  </button>
                  <BotaoIcone rotulo="Aumentar zoom" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}>
                    <Plus size={16} />
                  </BotaoIcone>
                </div>
              </div>
              <Opcoes
                titulo="Fundo"
                valor={prefs.tema}
                opcoes={[
                  ["preto", "Preto"],
                  ["escuro", "Escuro"],
                  ["claro", "Claro"],
                  ["papel", "Papel"],
                ]}
                onChange={(v) => mudarPrefs({ tema: v as Tema })}
                claro={claro}
              />
              <Opcoes
                titulo="Visão na tela"
                valor={prefs.filtro}
                opcoes={[
                  ["normal", "Normal"],
                  ["sepia", "Sépia"],
                  ["noturno", "Noturno"],
                  ["cinza", "P&B"],
                  ["contraste", "Contraste"],
                ]}
                onChange={(v) => mudarPrefs({ filtro: v as Filtro })}
                claro={claro}
              />
              <div>
                <div className="mb-1.5 flex justify-between text-xs font-medium opacity-70">
                  <span>Brilho</span>
                  <span className="tabular-nums">{prefs.brilho}%</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={110}
                  step={5}
                  value={prefs.brilho}
                  onChange={(e) => mudarPrefs({ brilho: Number(e.target.value) })}
                  className="w-full accent-primaria"
                  aria-label="Brilho das páginas"
                />
              </div>
              <button
                onClick={() => mudarPrefs({ filtro: "normal", brilho: 100, tema: "preto" })}
                className="text-xs text-primaria"
              >
                Restaurar visão padrão
              </button>
              <button onClick={alternarTelaCheia} className="btn-secundario w-full sm:hidden">
                {telaCheia ? <Minimize size={16} /> : <Maximize size={16} />} Tela cheia
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {offline && <p className="text-xs opacity-70">Sem internet, os marcadores ficam só para consulta.</p>}
              {marcadores.length === 0 && !offline && (
                <p className="opacity-70">Toque no ícone de marcador no topo para salvar a página atual.</p>
              )}
              {marcadores.map((m) => (
                <div key={m.id} className={cx("space-y-2 rounded-xl border p-3", claro ? "border-zinc-200" : "border-white/10")}>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        irParaPagina(m.pagina);
                        if (estreito) setPainel(null);
                      }}
                      className="font-semibold text-primaria"
                    >
                      Página {m.pagina}
                    </button>
                    {!offline && (
                      <button
                        onClick={async () => {
                          setMarcadores((l) => l.filter((x) => x.id !== m.id));
                          await removerMarcador(m.id);
                        }}
                        className="text-xs opacity-60 hover:opacity-100"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <textarea
                    readOnly={Boolean(offline)}
                    defaultValue={m.nota}
                    placeholder="Nota (opcional)"
                    rows={2}
                    maxLength={500}
                    onBlur={(e) => e.target.value !== m.nota && salvarNota(m, e.target.value)}
                    className={cx("w-full rounded-lg border p-2 text-sm outline-none focus:border-primaria", claro ? "border-zinc-200 bg-zinc-50" : "border-white/10 bg-black/30")}
                  />
                </div>
              ))}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

function BotaoIcone({
  children,
  rotulo,
  onClick,
  ativo,
  className,
}: {
  children: React.ReactNode;
  rotulo: string;
  onClick: () => void;
  ativo?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={rotulo}
      title={rotulo}
      className={cx("grid size-10 shrink-0 place-items-center rounded-full transition hover:bg-black/10", ativo && "text-primaria", className)}
    >
      {children}
    </button>
  );
}

function Opcoes({
  titulo,
  valor,
  opcoes,
  onChange,
  claro,
}: {
  titulo: string;
  valor: string;
  opcoes: [string, string][];
  onChange: (v: string) => void;
  claro: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium opacity-70">{titulo}</p>
      <div className={cx("flex flex-wrap gap-1 rounded-xl p-1", claro ? "bg-zinc-100" : "bg-black/30")}>
        {opcoes.map(([v, r]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            aria-pressed={valor === v}
            className={cx(
              "flex-1 rounded-lg px-2 py-1.5 text-xs transition",
              valor === v ? "bg-primaria font-semibold text-white" : "opacity-75 hover:opacity-100",
            )}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

function FimCapitulo({ dados, claro, offline }: { dados: DadosLeitura; claro: boolean; offline?: { aoSair: () => void } }) {
  if (offline) {
    return (
      <div className={cx("mx-4 my-10 w-full max-w-md space-y-3 rounded-2xl border p-6 text-center", claro ? "border-zinc-300 text-zinc-900" : "border-white/10 text-texto")}>
        <p className="text-lg font-bold">Fim do capítulo</p>
        <button onClick={offline.aoSair} className="btn-primario">
          Voltar aos baixados
        </button>
      </div>
    );
  }
  return (
    <div className={cx("mx-4 my-10 w-full max-w-md space-y-3 rounded-2xl border p-6 text-center", claro ? "border-zinc-300 text-zinc-900" : "border-white/10 text-texto")}>
      <p className="text-lg font-bold">Fim do capítulo</p>
      <div className="flex flex-wrap justify-center gap-2">
        {dados.proximo ? (
          <Link href={`/ler/${dados.proximo.id}`} className="btn-primario">
            {dados.proximo.rotulo} →
          </Link>
        ) : (
          <p className="text-sm opacity-70">Você chegou ao último capítulo publicado.</p>
        )}
        <Link href={`/serie/${dados.serie.slug}`} className="btn-secundario">
          Voltar à série
        </Link>
      </div>
    </div>
  );
}
