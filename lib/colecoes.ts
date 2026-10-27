import "server-only";
import { clienteDados } from "@/lib/supabase/dados";
import type { Colecao } from "@/lib/tipos";

export type ColecaoComItens = Colecao & { series: string[] };

export async function carregarColecoes(userId: string): Promise<ColecaoComItens[]> {
  const db = await clienteDados();
  const { data: c } = await db.from("colecoes").select("*").eq("user_id", userId).order("criado_em");
  const colecoes = (c ?? []) as Colecao[];
  if (!colecoes.length) return [];
  const { data: itens } = await db
    .from("colecao_itens")
    .select("colecao_id,series_id,adicionado_em")
    .in(
      "colecao_id",
      colecoes.map((x) => x.id),
    )
    .order("adicionado_em", { ascending: false });
  const lista = (itens ?? []) as { colecao_id: string; series_id: string }[];
  return colecoes.map((x) => ({ ...x, series: lista.filter((i) => i.colecao_id === x.id).map((i) => i.series_id) }));
}
