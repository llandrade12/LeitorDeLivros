"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarSenha } from "@/lib/senha";
import type { EstadoForm } from "@/lib/tipos";

/** Usado no "primeiro acesso" e no "redefinir senha" (link do e-mail). */
export async function definirNovaSenha(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const senha = String(formData.get("senha") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  const fraca = validarSenha(senha);
  if (fraca) return { erro: fraca };
  if (senha !== confirmar) return { erro: "As senhas não conferem." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?aviso=link");

  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    if (error.code === "same_password") return { erro: "Escolha uma senha diferente da atual." };
    if (error.code === "weak_password") return { erro: "Senha fraca demais. Tente outra." };
    return { erro: "Não foi possível salvar a senha. Tente de novo." };
  }

  // O leitor não tem permissão de alterar o próprio perfil (RLS),
  // então a flag é limpa pelo servidor, só para o próprio usuário.
  await createAdminClient()
    .from("profiles")
    .update({ precisa_trocar_senha: false })
    .eq("id", user.id);

  redirect("/");
}
