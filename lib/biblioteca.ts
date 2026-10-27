import "server-only";
import { clienteDados } from "@/lib/supabase/dados";
import { assinar, caminhosPaginas, EXPIRA_CAPA_S, EXPIRA_PAGINA_S } from "@/lib/storage";
import { rotuloCapitulo } from "@/lib/rotulos";
import type { Capitulo, EstadoLeitura, Marcador, Progresso, Serie } from "@/lib/tipos";

export type ResumoCapitulo = {
  id: string;
  numero: string;
  titulo: string;
  ordem: number;
  total_paginas: number;
  publicado: boolean;
  estado: EstadoLeitura;
  pagina: number;
  percentual: number;
  lidoEm: string | null;
};

export type ResumoSerie = Serie & {
  capaUrl: string | null;
  bannerUrl: string | null;
  mediaNota: number | null;
  totalNotas: number;
  minhaNota: number | null;
  capitulos: ResumoCapitulo[];
  estado: EstadoLeitura;
  percentual: number;
  lidos: number;
  favorito: boolean;
  continuar: ResumoCapitulo | null;
  ultimaLeitura: string | null;
  atualizadoConteudo: string;
};

type CapLeve = Pick<
  Capitulo,
  "id" | "series_id" | "numero" | "titulo" | "ordem" | "total_paginas" | "publicado" | "capa_path" | "atualizado_em"
>;

const maior = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);


/** Tudo que o leitor pode ver, já com progresso, favoritos, notas e capas assinadas.
 *  Séries "em breve" (ainda não publicadas) ficam de fora, a não ser com incluirEmBreve. */
export async function carregarBiblioteca(
  userId: string,
  { incluirEmBreve = false }: { incluirEmBreve?: boolean } = {},
): Promise<ResumoSerie[]> {
  const db = await clienteDados();
  const [rSeries, rCaps, rProg, rFav, rNotas] = await Promise.all([
    db.from("series").select("*").order("ordem").order("criado_em", { ascending: false }),
    db
      .from("chapters")
      .select("id,series_id,numero,titulo,ordem,total_paginas,publicado,capa_path,atualizado_em")
      .gt("total_paginas", 0)
      .order("ordem"),
    db.from("reading_progress").select("*").eq("user_id", userId),
    db.from("favorites").select("series_id").eq("user_id", userId),
    db.from("ratings").select("series_id,user_id,nota"),
  ]);

  const todas = (rSeries.data ?? []) as Serie[];
  const series = incluirEmBreve ? todas : todas.filter((s) => !(s.em_breve && !s.publicado) || s.publicado);
  const notas = (rNotas.data ?? []) as { series_id: string; user_id: string; nota: number }[];
  const caps = (rCaps.data ?? []) as CapLeve[];
  const progresso = new Map(((rProg.data ?? []) as Progresso[]).map((p) => [p.chapter_id, p]));
  const favoritos = new Set(((rFav.data ?? []) as { series_id: string }[]).map((f) => f.series_id));

  const capsPorSerie = new Map<string, CapLeve[]>();
  for (const c of caps) {
    const lista = capsPorSerie.get(c.series_id) ?? [];
    lista.push(c);
    capsPorSerie.set(c.series_id, lista);
  }

  const capaDe = (s: Serie) => s.capa_path ?? capsPorSerie.get(s.id)?.[0]?.capa_path ?? null;
  const urls = await assinar([...series.map(capaDe), ...series.map((s) => s.banner_path)], EXPIRA_CAPA_S);

  return series.map((s) => {
    let ultimaLeitura: string | null = null;
    let atualizadoConteudo = s.atualizado_em;

    const capitulos: ResumoCapitulo[] = (capsPorSerie.get(s.id) ?? []).map((c) => {
      const p = progresso.get(c.id);
      const pagina = p ? Math.min(p.ultima_pagina, c.total_paginas) : 0;
      const estado: EstadoLeitura = p?.concluido ? "concluido" : p ? "em_leitura" : "nao_iniciado";
      ultimaLeitura = maior(ultimaLeitura, p?.atualizado_em ?? null);
      atualizadoConteudo = maior(atualizadoConteudo, c.atualizado_em) ?? atualizadoConteudo;
      return {
        id: c.id,
        numero: c.numero,
        titulo: c.titulo,
        ordem: c.ordem,
        total_paginas: c.total_paginas,
        publicado: c.publicado,
        estado,
        pagina,
        percentual: estado === "concluido" ? 100 : Math.round((pagina / c.total_paginas) * 100),
        lidoEm: p?.atualizado_em ?? null,
      };
    });

    const lidos = capitulos.filter((c) => c.estado === "concluido").length;
    const algumProgresso = capitulos.some((c) => c.estado !== "nao_iniciado");
    const estado: EstadoLeitura =
      capitulos.length > 0 && lidos === capitulos.length ? "concluido" : algumProgresso ? "em_leitura" : "nao_iniciado";

    const emLeitura = capitulos
      .filter((c) => c.estado === "em_leitura")
      .sort((a, b) => (b.lidoEm ?? "").localeCompare(a.lidoEm ?? ""))[0];
    const ultimoLidoIdx = capitulos.map((c) => c.estado).lastIndexOf("concluido");
    const continuar =
      emLeitura ??
      capitulos.slice(ultimoLidoIdx + 1).find((c) => c.estado === "nao_iniciado") ??
      capitulos[0] ??
      null;

    const somaPercentual = capitulos.reduce((t, c) => t + c.percentual, 0);
    const daSerie = notas.filter((n) => n.series_id === s.id);

    return {
      ...s,
      capaUrl: urls.get(capaDe(s) ?? "") ?? null,
      bannerUrl: urls.get(s.banner_path ?? "") ?? null,
      mediaNota: daSerie.length ? Math.round((daSerie.reduce((t, n) => t + n.nota, 0) / daSerie.length) * 10) / 10 : null,
      totalNotas: daSerie.length,
      minhaNota: daSerie.find((n) => n.user_id === userId)?.nota ?? null,
      capitulos,
      estado,
      percentual: capitulos.length ? Math.round(somaPercentual / capitulos.length) : 0,
      lidos,
      favorito: favoritos.has(s.id),
      continuar,
      ultimaLeitura,
      atualizadoConteudo,
    };
  });
}

export type DadosLeitura = {
  capitulo: Capitulo;
  serie: Pick<Serie, "id" | "titulo" | "slug">;
  paginas: string[];
  paginaInicial: number;
  concluido: boolean;
  marcadores: Marcador[];
  anterior: { id: string; rotulo: string } | null;
  proximo: { id: string; rotulo: string } | null;
};

/** Dados de um capítulo para o leitor. null = não existe ou sem acesso. */
export async function carregarLeitura(capituloId: string, userId: string): Promise<DadosLeitura | null> {
  const db = await clienteDados();
  const { data: cap } = await db.from("chapters").select("*").eq("id", capituloId).maybeSingle();
  const capitulo = cap as Capitulo | null;
  if (!capitulo || capitulo.total_paginas < 1) return null;

  const [rSerie, rIrmaos, rProg, rMarc] = await Promise.all([
    db.from("series").select("id,titulo,slug").eq("id", capitulo.series_id).maybeSingle(),
    db
      .from("chapters")
      .select("id,numero,titulo,ordem")
      .eq("series_id", capitulo.series_id)
      .gt("total_paginas", 0)
      .order("ordem"),
    db.from("reading_progress").select("*").eq("user_id", userId).eq("chapter_id", capituloId).maybeSingle(),
    db.from("bookmarks").select("*").eq("user_id", userId).eq("chapter_id", capituloId).order("pagina"),
  ]);

  const serie = rSerie.data as DadosLeitura["serie"] | null;
  if (!serie) return null;

  const irmaos = (rIrmaos.data ?? []) as Pick<Capitulo, "id" | "numero" | "titulo" | "ordem">[];
  const idx = irmaos.findIndex((c) => c.id === capituloId);
  const vizinho = (c?: (typeof irmaos)[number]) => (c ? { id: c.id, rotulo: rotuloCapitulo(c) } : null);

  const prog = rProg.data as Progresso | null;
  const caminhos = caminhosPaginas(capitulo);
  const urls = await assinar(caminhos, EXPIRA_PAGINA_S);

  let paginaInicial = prog ? Math.min(Math.max(prog.ultima_pagina, 1), capitulo.total_paginas) : 1;
  // Já terminou? Recomeça do início ao abrir de novo.
  if (prog?.concluido && paginaInicial >= capitulo.total_paginas) paginaInicial = 1;

  return {
    capitulo,
    serie,
    paginas: caminhos.map((c) => urls.get(c) ?? ""),
    paginaInicial,
    concluido: Boolean(prog?.concluido),
    marcadores: (rMarc.data ?? []) as Marcador[],
    anterior: idx > 0 ? vizinho(irmaos[idx - 1]) : null,
    proximo: idx >= 0 ? vizinho(irmaos[idx + 1]) : null,
  };
}
