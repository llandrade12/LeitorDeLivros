import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MODO_LOCAL } from "@/lib/local/ativo";
import { ajustarCookie, COOKIE_LEMBRAR } from "@/lib/supabase/cookies";

// Rotas acessíveis sem login
const PUBLICAS = ["/login", "/esqueci-senha", "/auth", "/offline", "/manifest.webmanifest", "/sw.js"];

function ehPublica(path: string) {
  return PUBLICAS.some((p) => path === p || path.startsWith(p + "/"));
}

/** Renova a sessão a cada requisição e barra quem não está logado. */
export async function updateSession(request: NextRequest) {
  // Modo local: só confere se existe o cookie de sessão (as páginas validam o resto)
  if (MODO_LOCAL) {
    const logado = Boolean(request.cookies.get("geek_sessao_local")?.value);
    const p = request.nextUrl.pathname;
    if (!logado && !ehPublica(p)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = p !== "/" ? `?next=${encodeURIComponent(p)}` : "";
      return NextResponse.redirect(url);
    }
    if (logado && (p === "/login" || p === "/esqueci-senha")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const temporaria = request.cookies.get(COOKIE_LEMBRAR)?.value === "0";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, ajustarCookie(temporaria, options)),
          );
        },
      },
    },
  );

  // Não coloque nada entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const redirecionar = (destino: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    url.search = "";
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!user && !ehPublica(path)) {
    return redirecionar("/login", path !== "/" ? { next: path } : undefined);
  }
  if (user && (path === "/login" || path === "/esqueci-senha")) {
    return redirecionar("/");
  }

  return response;
}
