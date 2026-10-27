/** "Cap. 3 · O retorno", "Vol. 2", "Especial"… */
export function rotuloCapitulo(c: { numero: string; titulo: string }) {
  const num = c.numero.trim();
  const prefixo = num ? (/^\d+(\.\d+)?$/.test(num) ? `Cap. ${num}` : num) : "";
  return [prefixo, c.titulo.trim()].filter(Boolean).join(" · ") || "Capítulo";
}
