"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_LEMBRAR, createClient } from "@/lib/supabase/server";
import { destinoSeguro } from "@/lib/util";
import type { EstadoForm } from "@/lib/tipos";

export async function entrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const destino = destinoSeguro(formData.get("next"));
  const lembrar = formData.get("lembrar") === "on";

  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await createClient({ sessaoTemporaria: !lembrar });
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    if (error.code === "user_banned") {
      return { erro: "Conta desativada. Fale com o administrador." };
    }
    if (error.code === "over_request_rate_limit" || error.status === 429) {
      return { erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
    }
    return { erro: "E-mail ou senha incorretos. Verifique se digitou os dados corretamente." };
  }

  (await cookies()).set(COOKIE_LEMBRAR, lembrar ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(lembrar ? { maxAge: 60 * 60 * 24 * 400 } : {}),
  });
  redirect(destino);
}
