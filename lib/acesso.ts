import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Atualiza profiles.ultimo_acesso (a função no banco limita a 1x a cada 5 min). */
export async function registrarAcesso() {
  try {
    const supabase = await createClient();
    await supabase.rpc("registrar_acesso");
  } catch {
    /* não bloqueia a página */
  }
}
