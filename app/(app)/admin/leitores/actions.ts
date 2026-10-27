"use server";

import { revalidatePath } from "next/cache";
import { garantirAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { gerarSenhaTemporaria } from "@/lib/senha-temporaria";
import { siteUrl } from "@/lib/util";

export type ResultadoAcao = {
  erro?: string;
  ok?: string;
  /** senha temporária — mostrada uma única vez para o admin */
  senha?: string;
  email?: string;
};

const BANIDO = "876000h"; // ~100 anos = desativado
const CAMINHO = "/admin/leitores";

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function traduzirErro(e: { code?: string; message: string; status?: number }) {
  if (e.code === "email_exists" || /already (been )?registered/i.test(e.message)) {
    return "Já existe uma conta com esse e-mail.";
  }
  if (e.code === "over_email_send_rate_limit" || e.status === 429) {
    return "Limite de envio de e-mails atingido. Configure um SMTP próprio (veja o README) ou use senha temporária.";
  }
  return `Não foi possível concluir: ${e.message}`;
}

export async function criarLeitor(_: ResultadoAcao, formData: FormData): Promise<ResultadoAcao> {
  await garantirAdmin();

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const modo = formData.get("modo") === "convite" ? "convite" : "senha";

  if (nome.length < 2) return { erro: "Informe o nome do leitor." };
  if (!emailValido(email)) return { erro: "E-mail inválido." };

  const admin = createAdminClient();
  const metadados = { nome, precisa_trocar_senha: true };

  if (modo === "senha") {
    const senha = gerarSenhaTemporaria();
    const { error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: metadados,
    });
    if (error) return { erro: traduzirErro(error) };
    revalidatePath(CAMINHO);
    return { ok: `Leitor ${nome} criado.`, senha, email };
  }

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: metadados,
    redirectTo: `${siteUrl()}/primeiro-acesso`,
  });
  if (error) return { erro: traduzirErro(error) };
  revalidatePath(CAMINHO);
  return { ok: `Convite enviado para ${email}.` };
}

async function alvoValido(userId: string) {
  const { user } = await garantirAdmin();
  if (!userId) throw new Error("Usuário inválido");
  if (userId === user.id) return { erro: "Você não pode fazer isso com a sua própria conta." };
  return null;
}

export async function alternarAtivo(userId: string, ativar: boolean): Promise<ResultadoAcao> {
  const bloqueio = await alvoValido(userId);
  if (bloqueio) return bloqueio;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: ativar ? "none" : BANIDO,
  });
  if (error) return { erro: traduzirErro(error) };

  await admin.from("profiles").update({ ativo: ativar }).eq("id", userId);
  revalidatePath(CAMINHO);
  return { ok: ativar ? "Conta reativada." : "Conta desativada. O leitor perde o acesso imediatamente." };
}

export async function redefinirSenha(userId: string, modo: "temporaria" | "email"): Promise<ResultadoAcao> {
  const bloqueio = await alvoValido(userId);
  if (bloqueio) return bloqueio;

  const admin = createAdminClient();
  const { data, error: erroBusca } = await admin.auth.admin.getUserById(userId);
  if (erroBusca || !data.user?.email) return { erro: "Leitor não encontrado." };
  const email = data.user.email;

  if (modo === "email") {
    const { error } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/redefinir-senha`,
    });
    if (error) return { erro: traduzirErro(error) };
    return { ok: `Link de redefinição enviado para ${email}.` };
  }

  const senha = gerarSenhaTemporaria();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: senha });
  if (error) return { erro: traduzirErro(error) };
  await admin.from("profiles").update({ precisa_trocar_senha: true }).eq("id", userId);
  revalidatePath(CAMINHO);
  return { ok: "Nova senha temporária gerada.", senha, email };
}

export async function excluirLeitor(userId: string): Promise<ResultadoAcao> {
  const bloqueio = await alvoValido(userId);
  if (bloqueio) return bloqueio;

  const admin = createAdminClient();
  // Apaga o usuário; perfil, progresso, marcadores e favoritos vão junto (on delete cascade)
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { erro: traduzirErro(error) };
  revalidatePath(CAMINHO);
  return { ok: "Leitor excluído." };
}
