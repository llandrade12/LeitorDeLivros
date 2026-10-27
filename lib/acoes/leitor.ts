"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import { clienteDados } from "@/lib/supabase/dados";
import { assinar, caminhosPaginas, EXPIRA_PAGINA_S } from "@/lib/storage";
import type { Capitulo, Marcador } from "@/lib/tipos";

async function usuario() {
  const s = await getSessao();
  if (!s?.perfil?.ativo) throw new Error("Sessão expirada");
  return s.user.id;
}

const inteiro = (n: unknown, min = 1) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v >= min ? v : min;
};

/** Salva a página atual. Marca como concluído ao chegar na última. */
export async function salvarProgresso(capituloId: string, pagina: number, total: number) {
  const userId = await usuario();
  const db = await clienteDados();
  const p = inteiro(pagina);
  const terminou = p >= inteiro(total);
  const dados: Record<string, unknown> = { user_id: userId, chapter_id: capituloId, ultima_pagina: p };
  if (terminou) {
    dados.concluido = true;
    dados.concluido_em = new Date().toISOString();
  }
  const { error } = await db.from("reading_progress").upsert(dados, { onConflict: "user_id,chapter_id" });
  if (error) return { erro: error.message };
  return { ok: true, concluido: terminou };
}

export async function marcarConcluido(capituloId: string, concluido: boolean) {
  const userId = await usuario();
  const db = await clienteDados();
  const { error } = await db.from("reading_progress").upsert(
    {
      user_id: userId,
      chapter_id: capituloId,
      concluido,
      concluido_em: concluido ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,chapter_id" },
  );
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function alternarFavorito(serieId: string, favoritar: boolean) {
  const userId = await usuario();
  const db = await clienteDados();
  const { error } = favoritar
    ? await db.from("favorites").upsert({ user_id: userId, series_id: serieId }, { onConflict: "user_id,series_id" })
    : await db.from("favorites").delete().eq("user_id", userId).eq("series_id", serieId);
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { ok: true, favorito: favoritar };
}

export async function salvarMarcador(capituloId: string, pagina: number, nota: string) {
  const userId = await usuario();
  const db = await clienteDados();
  const { data, error } = await db
    .from("bookmarks")
    .upsert(
      { user_id: userId, chapter_id: capituloId, pagina: inteiro(pagina), nota: nota.slice(0, 500) },
      { onConflict: "user_id,chapter_id,pagina" },
    )
    .select("*")
    .single();
  if (error) return { erro: error.message };
  return { ok: true, marcador: data as Marcador };
}

export async function removerMarcador(marcadorId: string) {
  const userId = await usuario();
  const db = await clienteDados();
  const { error } = await db.from("bookmarks").delete().eq("id", marcadorId).eq("user_id", userId);
  if (error) return { erro: error.message };
  return { ok: true };
}

/** URLs novas quando as antigas expiram (o leitor chama sozinho). */
export async function renovarPaginas(capituloId: string) {
  await usuario();
  const db = await clienteDados();
  const { data } = await db.from("chapters").select("*").eq("id", capituloId).maybeSingle();
  const c = data as Capitulo | null;
  if (!c) return { erro: "Sem acesso" };
  const caminhos = caminhosPaginas(c);
  const urls = await assinar(caminhos, EXPIRA_PAGINA_S);
  return { ok: true, paginas: caminhos.map((p) => urls.get(p) ?? "") };
}

// ---------------- Avaliação ----------------

export async function avaliar(serieId: string, nota: number | null) {
  const userId = await usuario();
  const db = await clienteDados();
  const { error } =
    nota === null
      ? await db.from("ratings").delete().eq("user_id", userId).eq("series_id", serieId)
      : await db.from("ratings").upsert(
          { user_id: userId, series_id: serieId, nota: Math.min(5, Math.max(1, Math.round(nota))), atualizado_em: new Date().toISOString() },
          { onConflict: "user_id,series_id" },
        );
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------- Coleções ----------------

export async function criarColecao(nome: string, serieId?: string) {
  const userId = await usuario();
  const db = await clienteDados();
  const n = nome.trim().slice(0, 60);
  if (!n) return { erro: "Dê um nome para a coleção." };
  const { data, error } = await db.from("colecoes").insert({ user_id: userId, nome: n }).select("id").single();
  if (error) return { erro: error.message };
  if (serieId) await db.from("colecao_itens").insert({ colecao_id: data.id, series_id: serieId });
  revalidatePath("/", "layout");
  return { ok: true, id: data.id as string };
}

export async function renomearColecao(colecaoId: string, nome: string) {
  const userId = await usuario();
  const db = await clienteDados();
  const n = nome.trim().slice(0, 60);
  if (!n) return { erro: "Nome vazio." };
  const { error } = await db.from("colecoes").update({ nome: n }).eq("id", colecaoId).eq("user_id", userId);
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function excluirColecao(colecaoId: string) {
  const userId = await usuario();
  const db = await clienteDados();
  const { error } = await db.from("colecoes").delete().eq("id", colecaoId).eq("user_id", userId);
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function alternarNaColecao(colecaoId: string, serieId: string, incluir: boolean) {
  const userId = await usuario();
  const db = await clienteDados();
  const { data: dono } = await db.from("colecoes").select("id").eq("id", colecaoId).eq("user_id", userId).maybeSingle();
  if (!dono) return { erro: "Coleção não encontrada." };
  const { error } = incluir
    ? await db.from("colecao_itens").upsert({ colecao_id: colecaoId, series_id: serieId }, { onConflict: "colecao_id,series_id" })
    : await db.from("colecao_itens").delete().eq("colecao_id", colecaoId).eq("series_id", serieId);
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------- Leitura offline ----------------

/** Tudo que o app precisa para guardar o capítulo no aparelho. */
export async function dadosParaDownload(capituloId: string) {
  const s = await getSessao();
  if (!s?.perfil?.ativo) return { erro: "Sessão expirada. Entre de novo." };
  const { carregarLeitura } = await import("@/lib/biblioteca");
  const { rotuloCapitulo } = await import("@/lib/rotulos");
  const d = await carregarLeitura(capituloId, s.user.id);
  if (!d) return { erro: "Capítulo não encontrado ou sem acesso." };
  return {
    ok: true as const,
    dados: {
      capitulo: {
        id: d.capitulo.id,
        numero: d.capitulo.numero,
        titulo: d.capitulo.titulo,
        total: d.capitulo.total_paginas,
        serieId: d.capitulo.series_id,
      },
      serie: { titulo: d.serie.titulo, slug: d.serie.slug },
      rotulo: rotuloCapitulo(d.capitulo),
      paginas: d.paginas,
      pagina: d.paginaInicial,
      concluido: d.concluido,
      marcadores: d.marcadores.map((m) => ({ pagina: m.pagina, nota: m.nota })),
      nomeLeitor: s.perfil.nome || "leitor",
    },
  };
}

/** Quais capítulos baixados o usuário ainda pode ler (conta ativa + acesso).
 *  Os outros são apagados do aparelho quando o app abre com internet. */
export async function conferirBaixados(ids: string[]) {
  const s = await getSessao();
  if (!s?.perfil?.ativo) return { permitidos: [] as string[], sessao: false };
  if (!ids.length) return { permitidos: [] as string[], sessao: true };
  const db = await clienteDados();
  const { data } = await db.from("chapters").select("id").in("id", ids.slice(0, 500));
  return { permitidos: ((data ?? []) as { id: string }[]).map((c) => c.id), sessao: true };
}
