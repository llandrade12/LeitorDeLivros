/** Cookie que guarda a escolha "Manter conectado" (0 = não) */
export const COOKIE_LEMBRAR = "geek_lembrar";

/** Sem "manter conectado", os cookies de sessão somem ao fechar o navegador. */
export function ajustarCookie<T extends { maxAge?: number; expires?: Date }>(temporaria: boolean, options: T): T {
  if (!temporaria) return options;
  const { maxAge: _m, expires: _e, ...resto } = options;
  return resto as unknown as T;
}
