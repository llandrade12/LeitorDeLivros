"use client";

import { abrirPdf, ehPdf, formatoSaida, renderizarPagina, TAMANHO_MAX_PDF } from "@/lib/pdf-para-imagens";
import { concluirUploadPaginas, prepararUploadPaginas } from "@/lib/acoes/admin-hqs";
import { enviarArquivo } from "@/lib/enviar-arquivo";

export type ProgressoEnvio = { fase: "lendo" | "enviando" | "finalizando"; convertidas: number; enviadas: number; total: number };

const SIMULTANEOS = 4;

/** Converte o PDF em páginas no navegador e envia para o capítulo. Devolve o nº de páginas. */
export async function enviarPdfParaCapitulo(
  arquivo: File,
  capituloId: string,
  aoProgredir: (p: ProgressoEnvio) => void = () => {},
) {
  if (arquivo.size > TAMANHO_MAX_PDF) throw new Error("O PDF passa de 300 MB.");
  if (!(await ehPdf(arquivo))) throw new Error("Esse arquivo não é um PDF válido.");

  aoProgredir({ fase: "lendo", convertidas: 0, enviadas: 0, total: 0 });
  const doc = await abrirPdf(arquivo);
  const total = doc.numPages;
  const { mime, ext } = await formatoSaida();

  const prep = await prepararUploadPaginas(capituloId, total, ext);
  if ("erro" in prep) throw new Error(prep.erro);

  let convertidas = 0;
  let enviadas = 0;
  const avisar = () => aoProgredir({ fase: "enviando", convertidas, enviadas, total });
  const estado: { falha: Error | null } = { falha: null };
  const pendentes = new Set<Promise<void>>();

  try {
    for (let i = 1; i <= total; i++) {
      if (estado.falha) throw estado.falha;
      const blob = await renderizarPagina(doc, i, mime);
      convertidas = i;
      avisar();
      const destino = prep.uploads[i - 1];
      const envio: Promise<void> = (async () => {
        for (let tentativa = 1; tentativa <= 3; tentativa++) {
          try {
            await enviarArquivo(destino, blob);
            return;
          } catch (e) {
            if (tentativa === 3) throw new Error(`Página ${i}: ${e instanceof Error ? e.message : "falha"}`);
            await new Promise((r) => setTimeout(r, 1000 * tentativa));
          }
        }
      })()
        .then(() => {
          enviadas++;
          avisar();
        })
        .catch((e: Error) => {
          estado.falha = e;
        })
        .finally(() => pendentes.delete(envio));
      pendentes.add(envio);
      if (pendentes.size >= SIMULTANEOS) await Promise.race(pendentes);
    }
    await Promise.all(pendentes);
    if (estado.falha) throw estado.falha;
  } finally {
    try {
      await doc.destroy();
    } catch {
      /* já fechado */
    }
  }

  aoProgredir({ fase: "finalizando", convertidas, enviadas, total });
  const fim = await concluirUploadPaginas(capituloId, prep.versao, total, prep.ext);
  if ("erro" in fim) throw new Error(fim.erro);
  return total;
}
