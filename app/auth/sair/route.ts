import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function sair(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const motivo = request.nextUrl.searchParams.get("motivo");
  const url = new URL(motivo === "desativada" ? "/login?aviso=desativada" : "/login", request.url);
  return NextResponse.redirect(url, { status: 303 });
}

export const GET = sair;
export const POST = sair;
