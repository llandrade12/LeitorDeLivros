"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { garantirAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  apagarPasta,
  caminhoPagina,
  listarArquivos,
  pastaPaginas,
  removerArquivos,
  tipoDe,
  urlUpload,
  type DestinoUpload,
} from "@/lib/storage";
import type { AcessoSerie, Capitulo, EstadoForm, StatusSerie } from "@/lib/tipos";

const MAX_PAGINAS = 1500;
const EXT_OK = ["webp", "jpg", "png"] as const;
type Ext = (typeof EXT_OK)[number];

function revalidar(serieId?: string) {
  revalidatePath("/", "layout");
  if (serieId) revalidatePath(`/admin/hqs/${serieId}`);
}

function slugify(texto: string) {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "hq"
  );
}

async function slugUnico(base: string, ignorarId?: string) {
  const db = createAdminClient();
  let slug = base;
  for (let i = 2; i < 100; i++) {
    const { data } = await db.from("series").select("id").eq("slug", slug).maybeSingle();
    if (!data || data.id === ignorarId) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

// ---------------- Séries ----------------

export async function salvarSerie(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await garantirAdmin();
  const db = createAdminClient();

  const id = String(fd.get("id") ?? "") || undefined;
  const titulo = String(fd.get("titulo") ?? "").trim();
  if (titulo.length < 1) return { erro: "Informe o título." };

  const statusBruto = String(fd.get("status") ?? "em_andamento");
  const status: StatusSerie = (["em_andamento", "finalizada", "hiato"] as const).includes(statusBruto as StatusSerie)
    ? (statusBruto as StatusSerie)
    : "em_andamento";
  const acesso: AcessoSerie = fd.get("acesso") === "restrito" ? "restrito" : "todos";
  const tags = [
    ...new Set(
      String(fd.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 20);

  const lancamento = String(fd.get("lancamento_em") ?? "").trim();
  const registro = {
    titulo,
    autor: String(fd.get("autor") ?? "").trim().slice(0, 120),
    chamada: String(fd.get("chamada") ?? "").trim().slice(0, 160),
    em_breve: fd.get("em_breve") === "on",
    lancamento_em: /^\d{4}-\d{2}-\d{2}$/.test(lancamento) ? lancamento : null,
    sinopse: String(fd.get("sinopse") ?? "").trim().slice(0, 4000),
    status,
    acesso,
    tags,
    publicado: fd.get("publicado") === "on",
    ordem: Number(fd.get("ordem") ?? 0) || 0,
  };

  let serieId = id;
  if (id) {
    const { error } = await db.from("series").update(registro).eq("id", id);
    if (error) return { erro: error.message };
  } else {
    const slug = await slugUnico(slugify(titulo));
    const { data, error } = await db.from("series").insert({ ...registro, slug }).select("id").single();
    if (error) return { erro: error.message };
    serieId = data.id as string;
  }

  // Leitores liberados (só vale quando acesso = restrito)
  const leitores = fd.getAll("leitores").map(String).filter(Boolean);
  await db.from("series_access").delete().eq("series_id", serieId!);
  if (acesso === "restrito" && leitores.length) {
    const { error } = await db
      .from("series_access")
      .insert(leitores.map((user_id) => ({ series_id: serieId!, user_id })));
    if (error) return { erro: error.message };
  }

  revalidar(serieId);
  if (!id) redirect(`/admin/hqs/${serieId}?nova=1`);
  return { ok: "Alterações salvas." };
}

/** Cria uma HQ só com título/autor (usado pela tela Publicar). */
export async function criarSerieRapida(titulo: string, autor: string, publicado: boolean, sinopse = "") {
  await garantirAdmin();
  const t = titulo.trim().slice(0, 200);
  if (!t) return { erro: "Informe o título da HQ." };
  const db = createAdminClient();
  const slug = await slugUnico(slugify(t));
  const { data, error } = await db
    .from("series")
    .insert({ titulo: t, slug, autor: autor.trim().slice(0, 120), sinopse: sinopse.trim().slice(0, 4000), publicado })
    .select("id,slug")
    .single();
  if (error) return { erro: error.message };
  revalidar();
  return { ok: true, id: data.id as string, slug: data.slug as string };
}

export async function excluirSerie(serieId: string) {
  await garantirAdmin();
  const db = createAdminClient();
  const { data: caps } = await db.from("chapters").select("id").eq("series_id", serieId);
  for (const c of caps ?? []) await apagarPasta(`capitulos/${c.id}`);
  await apagarPasta(`capas/${serieId}`);
  const { error } = await db.from("series").delete().eq("id", serieId);
  if (error) return { erro: error.message };
  revalidar();
  redirect("/admin/hqs");
}

export async function alternarPublicadoSerie(serieId: string, publicado: boolean) {
  await garantirAdmin();
  const { error } = await createAdminClient().from("series").update({ publicado }).eq("id", serieId);
  if (error) return { erro: error.message };
  revalidar(serieId);
  return { ok: true };
}

// ---------------- Capa personalizada ----------------

export type TipoImagem = "capa" | "banner";
const COLUNA: Record<TipoImagem, "capa_path" | "banner_path"> = { capa: "capa_path", banner: "banner_path" };

export async function prepararUploadCapa(serieId: string, ext: string, tipo: TipoImagem = "capa") {
  await garantirAdmin();
  const e = (EXT_OK as readonly string[]).includes(ext) ? ext : "jpg";
  const caminho = `capas/${serieId}/${tipo === "banner" ? "banner" : "capa"}-${Date.now()}.${e}`;
  try {
    return { ok: true, destino: await urlUpload(caminho, tipoDe(caminho)) };
  } catch (err) {
    return { erro: err instanceof Error ? err.message : "Falha ao preparar upload" };
  }
}

export async function definirCapa(serieId: string, caminho: string | null, tipo: TipoImagem = "capa") {
  await garantirAdmin();
  const db = createAdminClient();
  const coluna = COLUNA[tipo] ?? "capa_path";
  if (caminho && !caminho.startsWith(`capas/${serieId}/`)) return { erro: "Caminho inválido" };
  const { data: atual } = await db.from("series").select(coluna).eq("id", serieId).single();
  const { error } = await db.from("series").update({ [coluna]: caminho }).eq("id", serieId);
  if (error) return { erro: error.message };
  const anterior = (atual as Record<string, string | null> | null)?.[coluna];
  if (anterior && anterior !== caminho) {
    await removerArquivos([anterior]);
  }
  revalidar(serieId);
  return { ok: true };
}

// ---------------- Capítulos ----------------

export async function criarCapitulo(serieId: string, numero: string, titulo: string) {
  await garantirAdmin();
  const db = createAdminClient();
  const { data: ultimo } = await db
    .from("chapters")
    .select("ordem")
    .eq("series_id", serieId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  let num = numero.trim().slice(0, 30);
  if (num === "#") {
    // automático: maior número + 1
    const { data: todos } = await db.from("chapters").select("numero").eq("series_id", serieId);
    const maior = Math.max(0, ...((todos ?? []) as { numero: string }[]).map((c) => parseFloat(c.numero)).filter((n) => Number.isFinite(n)));
    num = String(Math.floor(maior) + 1);
  }
  const { data, error } = await db
    .from("chapters")
    .insert({
      series_id: serieId,
      numero: num,
      titulo: titulo.trim().slice(0, 200),
      ordem: (ultimo?.ordem ?? 0) + 1,
      publicado: false,
    })
    .select("id")
    .single();
  if (error) return { erro: error.message };
  revalidar(serieId);
  return { ok: true, id: data.id as string };
}

export async function atualizarCapitulo(
  capituloId: string,
  campos: { numero?: string; titulo?: string; publicado?: boolean },
) {
  await garantirAdmin();
  const db = createAdminClient();
  const upd: Record<string, unknown> = {};
  if (campos.numero !== undefined) upd.numero = campos.numero.trim().slice(0, 30);
  if (campos.titulo !== undefined) upd.titulo = campos.titulo.trim().slice(0, 200);
  if (campos.publicado !== undefined) {
    upd.publicado = campos.publicado;
    if (campos.publicado) upd.publicado_em = new Date().toISOString();
  }
  const { data, error } = await db.from("chapters").update(upd).eq("id", capituloId).select("series_id").single();
  if (error) return { erro: error.message };
  revalidar(data.series_id as string);
  return { ok: true };
}

export async function moverCapitulo(capituloId: string, direcao: -1 | 1) {
  await garantirAdmin();
  const db = createAdminClient();
  const { data: cap } = await db.from("chapters").select("id,series_id,ordem").eq("id", capituloId).single();
  if (!cap) return { erro: "Capítulo não encontrado" };
  const { data: todos } = await db
    .from("chapters")
    .select("id,ordem")
    .eq("series_id", cap.series_id)
    .order("ordem")
    .order("criado_em");
  const lista = todos ?? [];
  const i = lista.findIndex((c) => c.id === capituloId);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return { ok: true };
  [lista[i], lista[j]] = [lista[j], lista[i]];
  // regrava 1..n para não haver empates
  await Promise.all(lista.map((c, n) => db.from("chapters").update({ ordem: n + 1 }).eq("id", c.id)));
  revalidar(cap.series_id as string);
  return { ok: true };
}

export async function excluirCapitulo(capituloId: string) {
  await garantirAdmin();
  const db = createAdminClient();
  const { data: cap } = await db.from("chapters").select("series_id").eq("id", capituloId).single();
  await apagarPasta(`capitulos/${capituloId}`);
  const { error } = await db.from("chapters").delete().eq("id", capituloId);
  if (error) return { erro: error.message };
  revalidar(cap?.series_id as string | undefined);
  return { ok: true };
}

// ---------------- Upload das páginas ----------------

/** Gera URLs de upload para cada página de uma NOVA versão do capítulo.
 *  O capítulo continua com a versão antiga até concluirUploadPaginas. */
export async function prepararUploadPaginas(capituloId: string, total: number, ext: string) {
  await garantirAdmin();
  const n = Math.floor(total);
  if (!Number.isFinite(n) || n < 1) return { erro: "O PDF não tem páginas." };
  if (n > MAX_PAGINAS) return { erro: `Máximo de ${MAX_PAGINAS} páginas por capítulo.` };
  const e: Ext = (EXT_OK as readonly string[]).includes(ext) ? (ext as Ext) : "jpg";

  const db = createAdminClient();
  const { data: cap } = await db.from("chapters").select("versao,paginas_path").eq("id", capituloId).single();
  if (!cap) return { erro: "Capítulo não encontrado" };

  const versao = cap.paginas_path ? (cap.versao as number) + 1 : (cap.versao as number);
  const pasta = pastaPaginas(capituloId, versao);
  // Limpa sobras de um envio anterior interrompido
  await apagarPasta(pasta);

  const uploads: DestinoUpload[] = [];
  for (let i = 0; i < n; i += 25) {
    const lote = await Promise.all(
      Array.from({ length: Math.min(25, n - i) }, (_, k) => {
        const caminho = caminhoPagina(pasta, i + k + 1, e);
        return urlUpload(caminho, tipoDe(caminho));
      }),
    );
    uploads.push(...lote);
  }
  return { ok: true, versao, pasta, ext: e, uploads };
}

/** Troca o capítulo para a nova versão e apaga a anterior.
 *  O progresso dos leitores é mantido (só é ajustado se passar do novo total). */
export async function concluirUploadPaginas(capituloId: string, versao: number, total: number, ext: string) {
  await garantirAdmin();
  const db = createAdminClient();
  const e: Ext = (EXT_OK as readonly string[]).includes(ext) ? (ext as Ext) : "jpg";
  const pasta = pastaPaginas(capituloId, versao);

  // Confere se todas as páginas chegaram
  const recebidas = (await listarArquivos(pasta)).length;
  if (recebidas < total) return { erro: `Só ${recebidas} de ${total} páginas chegaram. Envie de novo.` };

  const { data: antes } = await db.from("chapters").select("*").eq("id", capituloId).single();
  const anterior = antes as Capitulo | null;
  if (!anterior) return { erro: "Capítulo não encontrado" };

  const { error } = await db
    .from("chapters")
    .update({
      paginas_path: pasta,
      paginas_ext: e,
      total_paginas: total,
      versao,
      capa_path: caminhoPagina(pasta, 1, e),
    })
    .eq("id", capituloId);
  if (error) return { erro: error.message };

  // Progresso além do novo total vai para a última página
  await db
    .from("reading_progress")
    .update({ ultima_pagina: total })
    .eq("chapter_id", capituloId)
    .gt("ultima_pagina", total);

  if (anterior.paginas_path && anterior.paginas_path !== pasta) await apagarPasta(anterior.paginas_path);

  revalidar(anterior.series_id);
  return { ok: true };
}

// ---------------- Heróis (cadastrados uma vez, vinculados a várias HQs) ----------------

export async function prepararUploadPersonagem(ext: string) {
  await garantirAdmin();
  const e = (EXT_OK as readonly string[]).includes(ext) ? ext : "png";
  const caminho = `personagens/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${e}`;
  try {
    return { ok: true, destino: await urlUpload(caminho, tipoDe(caminho)) };
  } catch (err) {
    return { erro: err instanceof Error ? err.message : "Falha ao preparar upload" };
  }
}

export async function salvarPersonagem(dados: {
  id?: string;
  nome: string;
  cor: string;
  imagem_path?: string | null;
  series?: string[];
}) {
  await garantirAdmin();
  const db = createAdminClient();
  const nome = dados.nome.trim().slice(0, 60);
  if (!nome) return { erro: "Dê um nome ao herói." };
  const cor = /^#[0-9a-f]{6}$/i.test(dados.cor) ? dados.cor : "#4d83f4";
  if (dados.imagem_path && !dados.imagem_path.startsWith("personagens/")) return { erro: "Caminho inválido" };

  let id = dados.id;
  if (id) {
    const { data: atual } = await db.from("personagens").select("imagem_path").eq("id", id).single();
    const upd: Record<string, unknown> = { nome, cor };
    if (dados.imagem_path !== undefined) upd.imagem_path = dados.imagem_path;
    const { error } = await db.from("personagens").update(upd).eq("id", id);
    if (error) return { erro: error.message };
    const antiga = (atual as { imagem_path: string | null } | null)?.imagem_path;
    if (dados.imagem_path !== undefined && antiga && antiga !== dados.imagem_path) await removerArquivos([antiga]);
  } else {
    const { data: ultimo } = await db.from("personagens").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await db
      .from("personagens")
      .insert({ nome, cor, imagem_path: dados.imagem_path ?? null, ordem: ((ultimo as { ordem: number } | null)?.ordem ?? 0) + 1 })
      .select("id")
      .single();
    if (error) return { erro: /personagens/.test(error.message) ? "Rode as migrações 0004 e 0005 no Supabase." : error.message };
    id = data.id as string;
  }

  if (dados.series) {
    await db.from("personagens_series").delete().eq("personagem_id", id!);
    if (dados.series.length) {
      const { error } = await db
        .from("personagens_series")
        .insert([...new Set(dados.series)].map((series_id) => ({ personagem_id: id!, series_id })));
      if (error) return { erro: error.message };
    }
  }
  revalidar();
  return { ok: true, id: id! };
}

export async function vincularPersonagem(personagemId: string, serieId: string, vincular: boolean) {
  await garantirAdmin();
  const db = createAdminClient();
  const { error } = vincular
    ? await db.from("personagens_series").upsert({ personagem_id: personagemId, series_id: serieId }, { onConflict: "personagem_id,series_id" })
    : await db.from("personagens_series").delete().eq("personagem_id", personagemId).eq("series_id", serieId);
  if (error) return { erro: error.message };
  revalidar(serieId);
  return { ok: true };
}

export async function excluirPersonagem(id: string) {
  await garantirAdmin();
  const db = createAdminClient();
  const { data } = await db.from("personagens").select("imagem_path").eq("id", id).single();
  const p = data as { imagem_path: string | null } | null;
  const { error } = await db.from("personagens").delete().eq("id", id);
  if (error) return { erro: error.message };
  if (p?.imagem_path) await removerArquivos([p.imagem_path]);
  revalidar();
  return { ok: true };
}
