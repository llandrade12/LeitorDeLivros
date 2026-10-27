import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos do Next e imagens públicas
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.webmanifest|pdfjs/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mjs)$).*)",
  ],
};
