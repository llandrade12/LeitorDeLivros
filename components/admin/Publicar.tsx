"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, BookPlus, Check, CheckCircle2, CircleAlert, FileUp, ImagePlus, LoaderCircle, Plus, Trash2, UploadCloud, X } from "lucide-react";
import {
  alternarPublicadoSerie,
  atualizarCapitulo,
  criarCapitulo,
  criarSerieRapida,
  definirCapa,
  prepararUploadCapa,
  salvarPersonagem,
  vincularPersonagem,
} from "@/lib/acoes/admin-hqs";
import { enviarArquivo } from "@/lib/enviar-arquivo";
import { PreviaHeroi, SeletorCor, subirImagemHeroi, type HeroiAdmin } from "./GerenciarHerois";
import { CORES_HEROI } from "@/lib/tipos";
import { enviarPdfParaCapitulo } from "@/lib/upload-capitulo";
import { Alerta } from "@/components/Alerta";
import { cx } from "@/lib/util";

export type SerieOpcao = { id: string; titulo: string; slug: string; publicado: boolean; proximo: number; capitulos: number };

type Item = {
  chave: string;
  arquivo: File;
  numero: string;
  titulo: string;
  estado: "aguardando" | "enviando" | "ok" | "erro";
  pct: number;
  msg?: string;
};

/** "minha-hq_cap 03.pdf" → { titulo: "minha hq cap 03" } — e ordena cap 2 antes de cap 10 */
const limparNome = (n: string) => n.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").trim();
const ordemNatural = (a: File, b: File) => a.name.localeCompare(b.name, "pt-BR", { numeric: true, sensitivity: "base" });

const TIPOS_IMG: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function enviarImagemSerie(serieId: string, f: File, tipo: "capa" | "banner") {
  const ext = TIPOS_IMG[f.type];
  if (!ext) throw new Error(`${tipo === "capa" ? "Capa" : "Banner"}: use JPG, PNG ou WebP.`);
  const prep = await prepararUploadCapa(serieId, ext, tipo);
  if ("erro" in prep) throw new Error(prep.erro);
  await enviarArquivo(prep.destino, f);
  const r = await definirCapa(serieId, prep.destino.caminho, tipo);
  if ("erro" in r) throw new Error(r.erro);
}

type HeroiNovo = { chave: string; nome: string; cor: string; arquivo: File | null; previa: string | null };

/** Campo de imagem com prévia (capa vertical ou banner horizontal) */
function CampoImagem({
  rotulo,
  dica,
  arquivo,
  onChange,
  formato,
  disabled,
}: {
  rotulo: string;
  dica: string;
  arquivo: File | null;
  onChange: (f: File | null) => void;
  formato: "capa" | "banner";
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const url = useMemo(() => (arquivo ? URL.createObjectURL(arquivo) : null), [arquivo]);
  return (
    <div className="space-y-1.5">
      <p className="rotulo">{rotulo}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className={cx(
          "relative grid w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-borda bg-fundo text-xs text-suave transition hover:border-primaria/60",
          formato === "capa" ? "aspect-[2/3]" : "aspect-[16/9]",
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 p-2 text-center">
            <ImagePlus size={18} /> {dica}
          </span>
        )}
      </button>
      {arquivo && (
        <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 text-xs text-suave hover:text-perigo">
          <X size={12} /> remover
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function Publicar({
  series,
  serieInicial,
  herois = [],
}: {
  series: SerieOpcao[];
  serieInicial?: string;
  herois?: HeroiAdmin[];
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [destino, setDestino] = useState<"existente" | "nova">(series.length && serieInicial !== "nova" ? "existente" : "nova");
  const [serieId, setSerieId] = useState(serieInicial && series.some((s) => s.id === serieInicial) ? serieInicial : (series[0]?.id ?? ""));
  const [novaTitulo, setNovaTitulo] = useState("");
  const [novaAutor, setNovaAutor] = useState("");
  const [novaSinopse, setNovaSinopse] = useState("");
  const [capa, setCapa] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [heroisSel, setHeroisSel] = useState<string[]>([]);
  const [heroisNovos, setHeroisNovos] = useState<HeroiNovo[]>([]);
  const refHeroi = useRef<HTMLInputElement>(null);
  const [heroiEditando, setHeroiEditando] = useState<string | null>(null);
  const [completa, setCompleta] = useState(false);
  const [publicar, setPublicar] = useState(true);
  const [itens, setItens] = useState<Item[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState("");
  const [fim, setFim] = useState<{ slug: string; id: string; ok: number; falhas: number } | null>(null);

  const serie = series.find((s) => s.id === serieId);
  const inicio = destino === "existente" ? (serie?.proximo ?? 1) : 1;
  const ehCompleta = destino === "nova" && completa && itens.length === 1;

  // Renumera quando muda a HQ ou a lista
  const numerados = useMemo(
    () => itens.map((it, i) => ({ ...it, numero: it.numero === "" ? "" : it.numero })),
    [itens],
  );

  function adicionar(lista: FileList | File[]) {
    setErro("");
    setFim(null);
    const pdfs = [...lista].filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name)).sort(ordemNatural);
    if (!pdfs.length) return setErro("Escolha arquivos PDF.");
    setItens((atual) => {
      const base = atual.length;
      const novos = pdfs.map((f, k) => ({
        chave: `${f.name}-${f.size}-${Date.now()}-${k}`,
        arquivo: f,
        numero: String(inicio + base + k),
        titulo: "",
        estado: "aguardando" as const,
        pct: 0,
      }));
      if (destino === "nova" && !novaTitulo && !base) setNovaTitulo(limparNome(pdfs[0].name).replace(/\s*(cap(itulo)?\.?\s*)?\d+$/i, "").trim());
      return [...atual, ...novos];
    });
  }

  function renumerar(lista: Item[], a = inicio) {
    return lista.map((it, i) => ({ ...it, numero: String(a + i) }));
  }
  const mudar = (chave: string, campos: Partial<Item>) => setItens((l) => l.map((it) => (it.chave === chave ? { ...it, ...campos } : it)));
  const mover = (i: number, d: -1 | 1) =>
    setItens((l) => {
      const n = [...l];
      const j = i + d;
      if (j < 0 || j >= n.length) return l;
      [n[i], n[j]] = [n[j], n[i]];
      return renumerar(n);
    });

  async function publicarTudo() {
    setErro("");
    setFim(null);
    if (!itens.length) return setErro("Adicione pelo menos um PDF.");
    if (destino === "existente" && !serieId) return setErro("Escolha a HQ.");
    if (destino === "nova" && !novaTitulo.trim()) return setErro("Dê um título para a HQ nova.");

    setRodando(true);
    let alvoId = serieId;
    let alvoSlug = serie?.slug ?? "";
    try {
      if (destino === "nova") {
        const r = await criarSerieRapida(novaTitulo, novaAutor, publicar, novaSinopse);
        if ("erro" in r) throw new Error(r.erro);
        alvoId = r.id;
        alvoSlug = r.slug;
        // Capa, banner e heróis (opcionais)
        if (capa) await enviarImagemSerie(alvoId, capa, "capa");
        if (banner) await enviarImagemSerie(alvoId, banner, "banner");
        for (const hid of heroisSel) await vincularPersonagem(hid, alvoId, true);
        for (const h of heroisNovos) {
          if (!h.nome.trim()) continue;
          const imagem_path = h.arquivo ? await subirImagemHeroi(h.arquivo) : null;
          const rh = await salvarPersonagem({ nome: h.nome, cor: h.cor, imagem_path, series: [alvoId] });
          if ("erro" in rh) throw new Error(rh.erro);
        }
      }
      let ok = 0;
      let falhas = 0;
      for (const it of itens) {
        if (it.estado === "ok") continue;
        mudar(it.chave, { estado: "enviando", pct: 0, msg: "Preparando…" });
        try {
          const numero = ehCompleta ? "" : it.numero.trim() || "#";
          const titulo = ehCompleta ? it.titulo.trim() || "Edição única" : it.titulo;
          const cap = await criarCapitulo(alvoId, numero, titulo);
          if ("erro" in cap) throw new Error(cap.erro);
          const paginas = await enviarPdfParaCapitulo(it.arquivo, cap.id, (p) =>
            mudar(it.chave, {
              pct: p.total ? Math.round(((p.convertidas + p.enviadas) / (p.total * 2)) * 100) : 2,
              msg:
                p.fase === "lendo"
                  ? "Abrindo o PDF…"
                  : p.fase === "finalizando"
                    ? "Finalizando…"
                    : `Página ${p.convertidas} de ${p.total}`,
            }),
          );
          if (publicar) await atualizarCapitulo(cap.id, { publicado: true });
          mudar(it.chave, { estado: "ok", pct: 100, msg: `${paginas} páginas${publicar ? " · publicado" : " · rascunho"}` });
          ok++;
        } catch (e) {
          falhas++;
          mudar(it.chave, { estado: "erro", msg: e instanceof Error ? e.message : "Falhou" });
        }
      }
      if (publicar && ok > 0 && destino === "existente" && serie && !serie.publicado) await alternarPublicadoSerie(alvoId, true);
      setFim({ slug: alvoSlug, id: alvoId, ok, falhas });
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao publicar.");
    } finally {
      setRodando(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
      {/* Para onde vai */}
      <section className="cartao space-y-5 p-5">
        <h2 className="font-semibold">1. Onde publicar</h2>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-fundo p-1">
          {(
            [
              ["existente", "HQ que já existe"],
              ["nova", "HQ nova"],
            ] as const
          ).map(([v, r]) => (
            <button
              key={v}
              type="button"
              disabled={rodando || (v === "existente" && !series.length)}
              onClick={() => {
                setDestino(v);
                setItens((l) => renumerar(l, v === "existente" ? (serie?.proximo ?? 1) : 1));
              }}
              aria-pressed={destino === v}
              className={cx("h-10 rounded-lg text-sm transition disabled:opacity-40", destino === v ? "bg-superficie font-medium" : "text-suave hover:text-texto")}
            >
              {r}
            </button>
          ))}
        </div>

        {destino === "existente" ? (
          <div>
            <label className="rotulo" htmlFor="serie">HQ</label>
            <div className="campo">
              <select
                id="serie"
                value={serieId}
                disabled={rodando}
                onChange={(e) => {
                  setSerieId(e.target.value);
                  const s = series.find((x) => x.id === e.target.value);
                  setItens((l) => renumerar(l, s?.proximo ?? 1));
                }}
                className="bg-painel"
              >
                {series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.titulo} ({s.capitulos} cap.){s.publicado ? "" : " · rascunho"}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-xs text-suave">O próximo capítulo será o nº {serie?.proximo ?? 1}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="rotulo" htmlFor="nt">Título da HQ</label>
              <div className="campo">
                <input id="nt" value={novaTitulo} disabled={rodando} onChange={(e) => setNovaTitulo(e.target.value)} placeholder="Ex.: O Último Sentinela" />
              </div>
            </div>
            <div>
              <label className="rotulo" htmlFor="na">Autor (opcional)</label>
              <div className="campo">
                <input id="na" value={novaAutor} disabled={rodando} onChange={(e) => setNovaAutor(e.target.value)} placeholder="Seu nome" />
              </div>
            </div>
            <label className={cx("flex items-start gap-3 text-sm", itens.length > 1 && "opacity-50")}>
              <input type="checkbox" checked={completa} disabled={rodando || itens.length > 1} onChange={(e) => setCompleta(e.target.checked)} className="mt-0.5 size-4 accent-primaria" />
              <span>
                É uma HQ completa (edição única)
                <span className="block text-xs text-suave">Um PDF só, sem número de capítulo.</span>
              </span>
            </label>

            <div>
              <label className="rotulo" htmlFor="ns">Sinopse (opcional)</label>
              <textarea
                id="ns"
                rows={3}
                value={novaSinopse}
                disabled={rodando}
                onChange={(e) => setNovaSinopse(e.target.value)}
                placeholder="Do que se trata a história…"
                className="w-full rounded-xl border border-borda bg-painel p-3 text-sm outline-none placeholder:text-suave focus:border-primaria"
              />
            </div>

            <div className="grid grid-cols-[5.5rem_1fr] gap-3">
              <CampoImagem rotulo="Capa" dica="Opcional · sem ela, usa a 1ª página" arquivo={capa} onChange={setCapa} formato="capa" disabled={rodando} />
              <CampoImagem rotulo="Banner do destaque" dica="Opcional · arte larga" arquivo={banner} onChange={setBanner} formato="banner" disabled={rodando} />
            </div>

            <div className="space-y-2">
              <p className="rotulo">Heróis desta HQ (opcional)</p>
              {herois.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {herois.map((h) => {
                    const on = heroisSel.includes(h.id);
                    return (
                      <button
                        key={h.id}
                        type="button"
                        disabled={rodando}
                        onClick={() => setHeroisSel((l) => (on ? l.filter((x) => x !== h.id) : [...l, h.id]))}
                        className={cx(
                          "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs transition",
                          on ? "border-primaria bg-primaria/15 text-texto" : "border-borda text-suave hover:text-texto",
                        )}
                      >
                        <span className="grid size-6 place-items-center overflow-hidden rounded-full" style={{ background: h.cor }}>
                          {h.imagemUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={h.imagemUrl} alt="" className="size-full object-cover object-top" />
                          ) : (
                            <span className="text-[10px] font-bold text-white">{h.nome.charAt(0)}</span>
                          )}
                        </span>
                        {h.nome}
                        {on && <Check size={12} className="text-primaria" />}
                      </button>
                    );
                  })}
                </div>
              )}
              {heroisNovos.map((h) => (
                <div key={h.chave} className="flex items-center gap-3 rounded-xl border border-borda p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHeroiEditando(h.chave);
                      refHeroi.current?.click();
                    }}
                    aria-label="Imagem do herói"
                  >
                    <PreviaHeroi cor={h.cor} url={h.previa} nome={h.nome} tamanho="sm" />
                  </button>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="campo h-9 px-3">
                      <input
                        value={h.nome}
                        disabled={rodando}
                        onChange={(e) => setHeroisNovos((l) => l.map((x) => (x.chave === h.chave ? { ...x, nome: e.target.value } : x)))}
                        placeholder="Nome do herói"
                      />
                    </div>
                    <SeletorCor valor={h.cor} onChange={(c) => setHeroisNovos((l) => l.map((x) => (x.chave === h.chave ? { ...x, cor: c } : x)))} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setHeroisNovos((l) => l.filter((x) => x.chave !== h.chave))}
                    className="text-suave hover:text-perigo"
                    aria-label="Remover"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={rodando}
                onClick={() =>
                  setHeroisNovos((l) => [
                    ...l,
                    { chave: String(Date.now()), nome: "", cor: CORES_HEROI[(herois.length + l.length) % CORES_HEROI.length], arquivo: null, previa: null },
                  ])
                }
                className="btn-secundario h-9 w-full text-xs"
              >
                <Plus size={14} /> Novo herói
              </button>
              <input
                ref={refHeroi}
                type="file"
                accept="image/png,image/webp,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  if (!heroiEditando) return;
                  setHeroisNovos((l) =>
                    l.map((x) => (x.chave === heroiEditando ? { ...x, arquivo: f, previa: f ? URL.createObjectURL(f) : null } : x)),
                  );
                  setHeroiEditando(null);
                }}
              />
            </div>
          </div>
        )}

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-borda p-4">
          <span>
            <span className="block text-sm font-medium">Publicar agora</span>
            <span className="block text-xs text-suave">Desligado: fica como rascunho, só você vê.</span>
          </span>
          <input type="checkbox" checked={publicar} disabled={rodando} onChange={(e) => setPublicar(e.target.checked)} className="peer sr-only" />
          <span className="relative h-6 w-11 shrink-0 rounded-full bg-superficie transition peer-checked:bg-primaria after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
        </label>
      </section>

      {/* Arquivos */}
      <section className="space-y-4">
        <div className="cartao space-y-4 p-5">
          <h2 className="font-semibold">2. PDFs {destino === "nova" && completa ? "" : "(cada um vira um capítulo)"}</h2>
          <div
            role="button"
            tabIndex={0}
            onClick={() => !rodando && input.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !rodando && input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              if (!rodando && e.dataTransfer.files?.length) adicionar(e.dataTransfer.files);
            }}
            className={cx(
              "grid cursor-pointer place-items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition",
              arrastando ? "border-primaria bg-primaria/10" : "border-borda hover:border-primaria/60 hover:bg-superficie/40",
            )}
          >
            <UploadCloud size={30} className="text-primaria" />
            <span className="font-semibold">Arraste um ou vários PDFs aqui</span>
            <span className="text-xs text-suave">ou clique para escolher · até 300 MB cada · a ordem segue o nome do arquivo</span>
            <input
              ref={input}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) adicionar(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {erro && <Alerta tipo="erro" titulo={erro} />}

          {numerados.length > 0 && (
            <ol className="space-y-2">
              {numerados.map((it, i) => (
                <li key={it.chave} className="rounded-xl border border-borda bg-fundo p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-superficie">
                      {it.estado === "ok" ? (
                        <CheckCircle2 size={16} className="text-sucesso" />
                      ) : it.estado === "erro" ? (
                        <CircleAlert size={16} className="text-perigo" />
                      ) : it.estado === "enviando" ? (
                        <LoaderCircle size={16} className="animate-spin text-primaria" />
                      ) : (
                        <FileUp size={16} className="text-suave" />
                      )}
                    </span>
                    {!ehCompleta && (
                      <div className="campo h-9 w-20 px-2">
                        <input
                          aria-label="Número do capítulo"
                          value={it.numero}
                          disabled={rodando || it.estado === "ok"}
                          onChange={(e) => mudar(it.chave, { numero: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="campo h-9 min-w-40 flex-1 px-3">
                      <input
                        aria-label="Título do capítulo"
                        value={it.titulo}
                        disabled={rodando || it.estado === "ok"}
                        onChange={(e) => mudar(it.chave, { titulo: e.target.value })}
                        placeholder={ehCompleta ? "Edição única" : "Título (opcional)"}
                      />
                    </div>
                    {!rodando && it.estado !== "ok" && (
                      <div className="flex gap-1">
                        <button onClick={() => mover(i, -1)} disabled={i === 0} className="btn-secundario h-9 w-9 px-0" aria-label="Subir">
                          <ArrowUp size={14} />
                        </button>
                        <button onClick={() => mover(i, 1)} disabled={i === numerados.length - 1} className="btn-secundario h-9 w-9 px-0" aria-label="Descer">
                          <ArrowDown size={14} />
                        </button>
                        <button onClick={() => setItens((l) => renumerar(l.filter((x) => x.chave !== it.chave)))} className="btn-perigo h-9 w-9 px-0" aria-label="Tirar da lista">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 truncate text-xs text-suave">
                    {it.arquivo.name} · {(it.arquivo.size / 1024 / 1024).toFixed(1)} MB {it.msg ? `· ${it.msg}` : ""}
                  </p>
                  {it.estado === "enviando" && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-superficie">
                      <div className="h-full rounded-full bg-primaria transition-all" style={{ width: `${it.pct}%` }} />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        {fim && (
          <Alerta tipo={fim.falhas ? "erro" : "ok"} titulo={fim.falhas ? `${fim.ok} enviado(s), ${fim.falhas} com erro` : "Tudo publicado!"}>
            <span className="mt-2 flex flex-wrap gap-3">
              <Link href={`/serie/${fim.slug}`} className="link">Ver a HQ</Link>
              <Link href={`/admin/hqs/${fim.id}`} className="link">Editar capa, heróis e detalhes</Link>
              <button
                onClick={() => {
                  setItens([]);
                  setFim(null);
                  setCapa(null);
                  setBanner(null);
                  setHeroisSel([]);
                  setHeroisNovos([]);
                  setNovaSinopse("");
                }}
                className="link"
              >
                Publicar mais
              </button>
            </span>
          </Alerta>
        )}

        <button onClick={publicarTudo} disabled={rodando || !itens.length || itens.every((i) => i.estado === "ok")} className="btn-primario h-12 w-full text-base">
          {rodando ? <LoaderCircle size={18} className="animate-spin" /> : <BookPlus size={18} />}
          {rodando ? "Publicando… não feche esta aba" : `Publicar ${itens.filter((i) => i.estado !== "ok").length || ""} ${ehCompleta ? "HQ" : "capítulo(s)"}`}
        </button>
      </section>
    </div>
  );
}
