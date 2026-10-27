import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/tipos";

/** Usuário + perfil da requisição atual (uma consulta por requisição). */
export const getSessao = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, perfil: perfil as Perfil | null };
});

/** Exige login, conta ativa e senha já trocada. */
export async function exigirLeitor() {
  const s = await getSessao();
  if (!s) redirect("/auth/sair"); // limpa cookie de sessão inválida
  if (!s.perfil || !s.perfil.ativo) redirect("/auth/sair?motivo=desativada");
  if (s.perfil.precisa_trocar_senha) redirect("/primeiro-acesso");
  return { user: s.user, perfil: s.perfil };
}

/** Exige o admin. Leitores voltam para a biblioteca. */
export async function exigirAdmin() {
  const s = await exigirLeitor();
  if (s.perfil.role !== "admin") redirect("/");
  return s;
}

/** Versão para Server Actions: lança erro em vez de redirecionar. */
export async function garantirAdmin() {
  const s = await getSessao();
  if (!s?.perfil || s.perfil.role !== "admin" || !s.perfil.ativo) {
    throw new Error("Não autorizado");
  }
  return { user: s.user, perfil: s.perfil };
}
