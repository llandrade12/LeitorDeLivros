import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Circle, CircleDot, Pencil, Play } from "lucide-react";
import { exigirLeitor } from "@/lib/auth";
import { carregarBiblioteca } from "@/lib/biblioteca";
import { rotuloCapitulo } from "@/lib/rotulos";
import { ROTULO_STATUS } from "@/lib/tipos";
import { cx, dataHora } from "@/lib/util";
import { ImagemCapa } from "@/components/biblioteca/CapaHQ";
import { BotaoFavorito } from "@/components/biblioteca/BotaoFavorito";
import { BotaoConcluido } from "@/components/biblioteca/BotaoConcluido";
import { BotaoColecao } from "@/components/biblioteca/BotaoColecao";
import { BotaoBaixar } from "@/components/leitor/BotaoBaixar";
import { AvaliarSerie } from "@/components/biblioteca/Estrelas";
import { carregarColecoes } from "@/lib/colecoes";
import { carregarPersonagens } from "@/lib/personagens";
import { CartaoHeroi } from "@/components/biblioteca/Herois";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function SeriePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, perfil } = await exigirLeitor();
  const [todas, colecoes] = await Promise.all([carregarBiblioteca(user.id), carregarColecoes(user.id)]);
  const serie = todas.find((s) => s.slug === slug);
  if (!serie) notFound();
  const herois = await carregarPersonagens([serie.id]);

  const alvo = serie.continuar;
  const rotuloBotao =
    serie.estado === "nao_iniciado" ? "Começar a ler" : serie.estado === "concluido" ? "Ler de novo" : "Continuar lendo";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="relative isolate overflow-hidden rounded-3xl bg-painel ring-1 ring-white/5">
        <div className="absolute inset-0 -z-10 scale-110 opacity-40 blur-3xl">
          <ImagemCapa url={serie.capaUrl} titulo="" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-painel via-painel/70 to-painel/30" />

        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-10">
          <div className="mx-auto aspect-[2/3] w-44 shrink-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/10 sm:mx-0 sm:w-56">
            <ImagemCapa url={serie.capaUrl} titulo={serie.titulo} />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-primaria/20 px-2.5 py-1 font-medium text-primaria">{ROTULO_STATUS[serie.status]}</span>
              {!serie.publicado && <span className="rounded-full bg-alerta/20 px-2.5 py-1 font-medium text-alerta">Rascunho</span>}
              {serie.tags.map((t) => (
                <span key={t} className="rounded-full bg-superficie px-2.5 py-1 text-suave">
                  #{t}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              {serie.autor && <p className="text-sm text-texto/80">{serie.autor}</p>}
              <h1 className="text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">{serie.titulo}</h1>
            </div>
            <AvaliarSerie serieId={serie.id} minha={serie.minhaNota} media={serie.mediaNota} total={serie.totalNotas} />
            {serie.sinopse && <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-texto/80">{serie.sinopse}</p>}

            {serie.capitulos.length > 0 && (
              <div className="max-w-md space-y-1.5">
                <div className="flex justify-between text-xs text-suave">
                  <span>
                    {serie.lidos} de {serie.capitulos.length} capítulo(s) lidos
                  </span>
                  <span>{serie.percentual}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-superficie">
                  <div className="h-full rounded-full bg-primaria" style={{ width: `${serie.percentual}%` }} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {alvo && (
                <Link href={`/ler/${alvo.id}`} className="btn-primario h-12 rounded-full px-6">
                  <Play size={16} fill="currentColor" /> {rotuloBotao}
                </Link>
              )}
              <BotaoFavorito serieId={serie.id} favorito={serie.favorito} />
              <BotaoColecao
                serieId={serie.id}
                colecoes={colecoes.map((c) => ({ id: c.id, nome: c.nome, tem: c.series.includes(serie.id) }))}
              />
              {perfil.role === "admin" && (
                <Link href={`/admin/hqs/${serie.id}`} className="btn-secundario">
                  <Pencil size={16} /> Editar
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {herois.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Personagens</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {herois.map((h) => (
              <div key={h.id} className="w-28 shrink-0">
                <CartaoHeroi heroi={{ ...h, serieSlug: null }} tamanho="lg" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Capítulos</h2>
        {serie.capitulos.length === 0 ? (
          <p className="cartao p-6 text-sm text-suave">Ainda não há capítulos publicados.</p>
        ) : (
          <ol className="cartao divide-y divide-borda/60 overflow-hidden">
            {serie.capitulos.map((c) => (
              <li key={c.id} className="flex items-center gap-3 pr-3 transition hover:bg-superficie/40">
                <Link href={`/ler/${c.id}`} className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4">
                  <span
                    className={cx(
                      "grid size-9 shrink-0 place-items-center rounded-full",
                      c.estado === "concluido" && "bg-sucesso/15 text-sucesso",
                      c.estado === "em_leitura" && "bg-primaria/15 text-primaria",
                      c.estado === "nao_iniciado" && "bg-superficie text-suave",
                    )}
                  >
                    {c.estado === "concluido" ? <Check size={17} /> : c.estado === "em_leitura" ? <CircleDot size={17} /> : <Circle size={17} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {rotuloCapitulo(c)}
                      {!c.publicado && <span className="ml-2 text-xs text-alerta">(rascunho)</span>}
                    </span>
                    <span className="block text-xs text-suave">
                      {c.estado === "concluido"
                        ? "Lido"
                        : c.estado === "em_leitura"
                          ? `Página ${c.pagina} de ${c.total_paginas}`
                          : `${c.total_paginas} páginas`}
                      {c.lidoEm && ` · ${dataHora(c.lidoEm)}`}
                    </span>
                    {c.estado === "em_leitura" && (
                      <span className="mt-2 block h-1 max-w-xs overflow-hidden rounded-full bg-superficie">
                        <span className="block h-full rounded-full bg-primaria" style={{ width: `${c.percentual}%` }} />
                      </span>
                    )}
                  </span>
                </Link>
                <BotaoBaixar capituloId={c.id} />
                <BotaoConcluido capituloId={c.id} concluido={c.estado === "concluido"} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
