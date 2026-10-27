import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { destinoSeguro } from "@/lib/util";

/** Destino dos links de e-mail (convite e recuperação de senha).
 *  Os modelos de e-mail do Supabase precisam apontar para cá — veja o README. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const padrao = type === "invite" ? "/primeiro-acesso" : type === "recovery" ? "/redefinir-senha" : "/";
  const next = destinoSeguro(searchParams.get("next"), padrao);

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL("/login?aviso=link", request.url));
}
