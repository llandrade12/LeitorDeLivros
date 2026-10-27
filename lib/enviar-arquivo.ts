"use client";

/** Envia um arquivo direto do navegador para o storage (URL assinada do servidor). */
export async function enviarArquivo(destino: { url: string; headers: Record<string, string> }, corpo: Blob) {
  const r = await fetch(destino.url, { method: "PUT", body: corpo, headers: destino.headers });
  if (!r.ok) throw new Error(`Falha no envio (${r.status})`);
}
