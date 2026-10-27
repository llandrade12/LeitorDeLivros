import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ajustarCookie, COOKIE_LEMBRAR } from "@/lib/supabase/cookies";
import { MODO_LOCAL } from "@/lib/local/ativo";

export { COOKIE_LEMBRAR };

/** Cliente Supabase para Server Components, Server Actions e Route Handlers.
 *  Age em nome do usuário logado — respeita o RLS.
 *  No modo local, devolve um cliente que grava em .dados-locais/. */
export async function createClient(opcoes: { sessaoTemporaria?: boolean } = {}) {
  const cookieStore = await cookies();
  const temporaria = opcoes.sessaoTemporaria ?? cookieStore.get(COOKIE_LEMBRAR)?.value === "0";

  if (MODO_LOCAL) {
    const { criarClienteLocal } = await import("@/lib/local/cliente");
    const biscoitos = {
      get: (n: string) => cookieStore.get(n),
      set: (n: string, v: string, o?: Record<string, unknown>) => {
        try {
          cookieStore.set(n, v, o);
        } catch {
          /* Server Component: sem como gravar cookie aqui */
        }
      },
    };
    return criarClienteLocal("usuario", biscoitos, { temporaria }) as ReturnType<typeof createServerClient>;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, ajustarCookie(temporaria, options)),
            );
          } catch {
            // Chamado de um Server Component: o proxy renova a sessão.
          }
        },
      },
    },
  );
}
