/** Modo local: roda tudo sem Supabase (dados em .dados-locais/).
 *  Liga com MODO_LOCAL=1 no .env.local — ou sozinho, quando não há
 *  chave do Supabase configurada. Nunca vale na Vercel. */
export const MODO_LOCAL =
  process.env.VERCEL !== "1" &&
  process.env.MODO_LOCAL !== "0" &&
  (process.env.MODO_LOCAL === "1" || !process.env.NEXT_PUBLIC_SUPABASE_URL);
