import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MODO_LOCAL } from "@/lib/local/ativo";
import { criarClienteLocal } from "@/lib/local/cliente";

/** Cliente com a chave secreta: ignora o RLS. Use SÓ no servidor,
 *  e SÓ depois de confirmar que quem chamou é o admin.
 *  No modo local, devolve o cliente local com permissão total. */
export function createAdminClient(): SupabaseClient {
  if (MODO_LOCAL) return criarClienteLocal("admin", null) as SupabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY não configurada");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
