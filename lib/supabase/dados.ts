import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Cliente para ler/gravar dados do leitor (com RLS). */
export async function clienteDados() {
  return createClient();
}
