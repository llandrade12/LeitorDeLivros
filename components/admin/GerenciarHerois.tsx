"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { excluirPersonagem, prepararUploadPersonagem, salvarPersonagem, vincularPersonagem } from "@/lib/acoes/admin-hqs";
import { enviarArquivo } from "@/lib/enviar-arquivo";
import { Alerta } from "@/components/Alerta";
import { CORES_HEROI } from "@/lib/tipos";
import { cx } from "@/lib/util";

export type HeroiAdmin = { id: string; nome: string; cor: string; imagemUrl: string | null; series: string[] };
export type HqOpcao = { id: string; titulo: string };

const TIPOS: Record<string, string> = { "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg" };

export async function subirImagemHeroi(f: File) {
  const ext = TIPOS[f.type];
  if (!ext) throw new Error("Use PNG (de preferência com fundo transparente), WebP ou JPG.");
  if (f.size > 8 * 1024 * 1024) throw new Error("A imagem passa de 8 MB.");
  const prep = await prepararUploadPersonagem(ext);
  if ("erro" in prep) throw new Error(prep.erro);
  await enviarArquivo(prep.destino, f);
  return prep.destino.caminho;
}

export function PreviaHeroi({ cor, url, nome, tamanho = "md" }: { cor: string; url: string | null; nome: string; tamanho?: "sm" | "md" }) {
  return (
    <div className={cx("relative shrink-0", tamanho === "sm" ? "h-20 w-14" : "h-28 w-20")}>
      <span className="absolute inset-x-0 bottom-1 mx-auto aspect-square w-[92%] rounded-full" style={{ background: cor }} />
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="absolute inset-0 size-full object-contain object-bottom" />
      ) : (
        <span className="absolute inset-x-0 bottom-5 text-center text-xl font-black text-white">{nome.charAt(0).toUpperCase() || "?"}</span>
      )}
    </div>
  );
}

export function SeletorCor({ valor, onChange }: { valor: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CORES_HEROI.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Cor ${c}`}
          className={cx("size-6 rounded-full ring-offset-2 ring-offset-painel transition", valor === c && "ring-2 ring-white")}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

/** Cadastro de heróis + vínculo com HQs.
 *  Com serieAtual (na edição de uma HQ), mostra "Nesta HQ" em cada herói e
 *  o herói novo já entra vinculado a ela. */
export function GerenciarHerois({ herois, series, serieAtual }: { herois: HeroiAdmin[]; series: HqOpcao[]; serieAtual?: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES_HEROI[herois.length % CORES_HEROI.length]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [hqsNovo, setHqsNovo] = useState<string[]>(serieAtual ? [serieAtual] : []);
  const input = useRef<HTMLInputElement>(null);

  const rodar = (fn: () => Promise<unknown>) =>
    iniciar(async () => {
      setErro("");
      try {
        const r = (await fn()) as { erro?: string } | undefined;
        if (r?.erro) setErro(r.erro);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha");
      }
      router.refresh();
    });

  const nomeHq = new Map(series.map((s) => [s.id, s.titulo]));
  const ordenados = serieAtual
    ? [...herois].sort((a, b) => Number(b.series.includes(serieAtual)) - Number(a.series.includes(serieAtual)))
    : herois;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{serieAtual ? "Heróis desta HQ" : "Heróis"}</h2>
        {pendente && <LoaderCircle size={18} className="animate-spin text-suave" />}
      </div>
      <p className="text-xs text-suave">
        {serieAtual
          ? "Toque em \"Nesta HQ\" para vincular um herói já cadastrado, ou crie um novo abaixo. Um herói pode aparecer em várias HQs."
          : "Cadastre cada herói uma vez e marque em quais HQs ele aparece. PNG com fundo transparente fica igual ao mockup."}
      </p>
      {erro && <Alerta tipo="erro" titulo={erro} />}

      {ordenados.length > 0 && (
        <ul className="space-y-2">
          {ordenados.map((h) => {
            const aqui = serieAtual ? h.series.includes(serieAtual) : false;
            return (
              <li key={h.id} className={cx("cartao flex gap-4 p-3", serieAtual && !aqui && "opacity-70")}>
                <PreviaHeroi cor={h.cor} url={h.imagemUrl} nome={h.nome} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{h.nome}</p>
                    {serieAtual && (
                      <button
                        onClick={() => rodar(() => vincularPersonagem(h.id, serieAtual, !aqui))}
                        className={cx(
                          "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition",
                          aqui ? "border-primaria bg-primaria text-white" : "border-borda text-suave hover:text-texto",
                        )}
                      >
                        {aqui ? <Check size={12} /> : <Plus size={12} />} Nesta HQ
                      </button>
                    )}
                  </div>
                  <SeletorCor valor={h.cor} onChange={(c) => rodar(() => salvarPersonagem({ id: h.id, nome: h.nome, cor: c }))} />
                  {!serieAtual && (
                    <div className="flex flex-wrap gap-1.5">
                      {series.map((s) => {
                        const on = h.series.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => rodar(() => vincularPersonagem(h.id, s.id, !on))}
                            className={cx(
                              "rounded-full border px-2 py-0.5 text-[11px] transition",
                              on ? "border-primaria bg-primaria/20 text-primaria" : "border-borda text-suave hover:text-texto",
                            )}
                          >
                            {s.titulo}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {serieAtual && h.series.length > (aqui ? 1 : 0) && (
                    <p className="truncate text-[11px] text-suave">
                      Também em: {h.series.filter((i) => i !== serieAtual).map((i) => nomeHq.get(i) ?? "?").join(", ")}
                    </p>
                  )}
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-primaria">
                    <ImagePlus size={13} /> Trocar imagem
                    <input
                      type="file"
                      accept="image/png,image/webp,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) rodar(async () => salvarPersonagem({ id: h.id, nome: h.nome, cor: h.cor, imagem_path: await subirImagemHeroi(f) }));
                      }}
                    />
                  </label>
                </div>
                <button
                  onClick={() => window.confirm(`Excluir ${h.nome} de todas as HQs?`) && rodar(() => excluirPersonagem(h.id))}
                  className="btn-perigo h-9 w-9 shrink-0 px-0"
                  aria-label="Excluir herói"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="cartao space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          rodar(async () => {
            const imagem_path = arquivo ? await subirImagemHeroi(arquivo) : null;
            const r = await salvarPersonagem({ nome, cor, imagem_path, series: hqsNovo });
            if (!("erro" in r)) {
              setNome("");
              setArquivo(null);
              setPrevia(null);
              setHqsNovo(serieAtual ? [serieAtual] : []);
              setCor(CORES_HEROI[(herois.length + 1) % CORES_HEROI.length]);
            }
            return r;
          });
        }}
      >
        <p className="text-sm font-medium">Novo herói</p>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => input.current?.click()} className="rounded-xl transition hover:opacity-80" aria-label="Escolher imagem">
            <PreviaHeroi cor={cor} url={previa} nome={nome} />
          </button>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="campo h-10">
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do herói" maxLength={60} />
            </div>
            <SeletorCor valor={cor} onChange={setCor} />
            <button type="button" onClick={() => input.current?.click()} className="text-xs text-primaria">
              {arquivo ? `Imagem: ${arquivo.name}` : "Escolher imagem (PNG)"}
            </button>
          </div>
        </div>
        {!serieAtual && series.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-suave">Aparece nas HQs:</p>
            <div className="flex flex-wrap gap-1.5">
              {series.map((s) => {
                const on = hqsNovo.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setHqsNovo((l) => (on ? l.filter((x) => x !== s.id) : [...l, s.id]))}
                    className={cx(
                      "rounded-full border px-2.5 py-1 text-xs transition",
                      on ? "border-primaria bg-primaria/20 text-primaria" : "border-borda text-suave hover:text-texto",
                    )}
                  >
                    {s.titulo}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <input
          ref={input}
          type="file"
          accept="image/png,image/webp,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setArquivo(f ?? null);
            setPrevia(f ? URL.createObjectURL(f) : null);
          }}
        />
        <button disabled={pendente || !nome.trim()} className="btn-primario w-full">
          <Plus size={16} /> Adicionar herói
        </button>
      </form>
    </section>
  );
}
