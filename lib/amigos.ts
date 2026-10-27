import "server-only";
import { createClient } from "@/lib/supabase/server";
import { assinar, EXPIRA_CAPA_S } from "@/lib/storage";

export type Amigo = {
  id: string;
  nome: string;
  avatarUrl: string | null;
  ultimo_acesso: string | null;
  concluidos: number;
  serie_titulo: string | null;
  serie_slug: string | null;
  capitulo_id: string | null;
  capitulo_numero: string | null;
  capitulo_titulo: string | null;
  pagina: number | null;
  total: number | null;
  terminou: boolean | null;
  lido_em: string | null;
};

type Linha = Omit<Amigo, "avatarUrl"> & { avatar_path: string | null };

export async function carregarAmigos(meuId: string): Promise<Amigo[]> {
  void meuId;
  const { data } = await (await createClient()).rpc("listar_amigos");
  const linhas = (data ?? []) as Linha[];
  const urls = await assinar(linhas.map((l) => l.avatar_path), EXPIRA_CAPA_S);
  return linhas.map(({ avatar_path, ...l }) => ({
    ...l,
    concluidos: Number(l.concluidos ?? 0),
    avatarUrl: urls.get(avatar_path ?? "") ?? null,
  }));
}
