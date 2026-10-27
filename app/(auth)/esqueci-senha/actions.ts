"use server";

import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/util";
import type { EstadoForm } from "@/lib/tipos";

export async function pedirLink(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { erro: "Informe o e-mail." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/redefinir-senha`,
  });

  if (error && (error.status === 429 || error.code === "over_email_send_rate_limit")) {
    return { erro: "Muitos pedidos seguidos. Aguarde alguns minutos." };
  }

  // Mesma resposta exista ou não a conta (não revela quem está cadastrado).
  return { ok: "Se esse e-mail tiver conta, você vai receber um link em instantes." };
}
