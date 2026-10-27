export const REGRAS_SENHA = [
  { id: "tamanho", texto: "Mínimo de 8 caracteres", teste: (s: string) => s.length >= 8 },
  { id: "maiuscula", texto: "Pelo menos 1 letra maiúscula", teste: (s: string) => /[A-Z]/.test(s) },
  { id: "numero", texto: "Pelo menos 1 número", teste: (s: string) => /\d/.test(s) },
] as const;

export function validarSenha(senha: string): string | null {
  const falhou = REGRAS_SENHA.find((r) => !r.teste(senha));
  return falhou ? `Senha fraca: ${falhou.texto.toLowerCase()}.` : null;
}

/** 0 a 4 — para a barrinha de força */
export function forcaSenha(senha: string) {
  let f = REGRAS_SENHA.filter((r) => r.teste(senha)).length;
  if (senha.length >= 12 && /[^A-Za-z0-9]/.test(senha)) f += 1;
  return Math.min(f, 4);
}
