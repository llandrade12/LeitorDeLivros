import "server-only";
import { clienteDados } from "@/lib/supabase/dados";
import { assinar, EXPIRA_CAPA_S } from "@/lib/storage";
import type { Personagem } from "@/lib/tipos";

export type HeroiResumo = Personagem & {
  imagemUrl: string | null;
  series: string[]; // HQs em que o herói aparece (só as que o leitor vê)
  serieSlug: string | null; // 1ª HQ, para o link
  serieTitulo: string | null;
};

/** Heróis visíveis para o usuário (o RLS filtra). Com seriesIds, só os dessas HQs. */
export async function carregarPersonagens(seriesIds?: string[]): Promise<HeroiResumo[]> {
  const db = await clienteDados();
  const [{ data, error }, { data: v }, { data: s }] = await Promise.all([
    db.from("personagens").select("*").order("ordem").order("criado_em"),
    db.from("personagens_series").select("personagem_id,series_id"),
    db.from("series").select("id,slug,titulo"),
  ]);
  if (error) return []; // tabelas ainda não criadas (rode 0004 e 0005)
  const vinculos = (v ?? []) as { personagem_id: string; series_id: string }[];
  const series = new Map(((s ?? []) as { id: string; slug: string; titulo: string }[]).map((x) => [x.id, x]));
  let lista = (data ?? []) as Personagem[];
  const daHq = (id: string) => vinculos.filter((x) => x.personagem_id === id && series.has(x.series_id)).map((x) => x.series_id);
  if (seriesIds) {
    const alvo = new Set(seriesIds);
    lista = lista.filter((p) => daHq(p.id).some((sid) => alvo.has(sid)));
  }
  const urls = await assinar(lista.map((p) => p.imagem_path), EXPIRA_CAPA_S);
  return lista.map((p) => {
    const ids = daHq(p.id);
    const primeira = series.get((seriesIds && ids.find((i) => seriesIds.includes(i))) || ids[0] || "");
    return {
      ...p,
      imagemUrl: urls.get(p.imagem_path ?? "") ?? null,
      series: ids,
      serieSlug: primeira?.slug ?? null,
      serieTitulo: primeira?.titulo ?? null,
    };
  });
}
