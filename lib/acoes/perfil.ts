"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { removerArquivos, tipoDe, urlUpload } from "@/lib/storage";
import { validarSenha } from "@/lib/senha";
import type { EstadoForm } from "@/lib/tipos";

async function eu() {
  const s = await getSessao();
  if (!s?.perfil?.ativo) throw new Error("Sessão expirada");
  return { user: s.user, perfil: s.perfil };
}

/** Nome e privacidade. O leitor não altera o próprio perfil pelo RLS
 *  (para não conseguir virar admin), então o servidor grava só estes campos. */
export async function salvarPerfil(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { user } = await eu();
  const nome = String(fd.get("nome") ?? "").trim().slice(0, 60);
  if (nome.length < 2) return { erro: "Informe seu nome." };
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ nome, compartilhar_leitura: fd.get("compartilhar") === "on" })
    .eq("id", user.id);
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { ok: "Perfil salvo." };
}

export async function prepararUploadAvatar(ext: string) {
  const { user } = await eu();
  const e = ["jpg", "png", "webp"].includes(ext) ? ext : "jpg";
  const caminho = `avatares/${user.id}/${Date.now()}.${e}`;
  try {
    return { ok: true, destino: await urlUpload(caminho, tipoDe(caminho)) };
  } catch (err) {
    return { erro: err instanceof Error ? err.message : "Falha ao preparar upload" };
  }
}

export async function definirAvatar(caminho: string | null) {
  const { user, perfil } = await eu();
  if (caminho && !caminho.startsWith(`avatares/${user.id}/`)) return { erro: "Caminho inválido" };
  const db = createAdminClient();
  const { error } = await db.from("profiles").update({ avatar_path: caminho }).eq("id", user.id);
  if (error) return { erro: error.message };
  if (perfil.avatar_path && perfil.avatar_path !== caminho) await removerArquivos([perfil.avatar_path]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function trocarSenha(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await eu();
  const senha = String(fd.get("senha") ?? "");
  const fraca = validarSenha(senha);
  if (fraca) return { erro: fraca };
  if (senha !== String(fd.get("confirmar") ?? "")) return { erro: "As senhas não conferem." };
  const { error } = await (await createClient()).auth.updateUser({ password: senha });
  if (error) return { erro: error.code === "same_password" ? "Escolha uma senha diferente da atual." : error.message };
  return { ok: "Senha alterada." };
}
