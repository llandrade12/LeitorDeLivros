"use client";

/** Converte um PDF (no navegador do admin) em imagens de página.
 *  O PDF nunca sai do computador: só as páginas convertidas são enviadas. */

const LARGURA_ALVO = 1600; // px — nítido em tela retina de celular e bom no desktop
const AREA_MAX = 16_000_000; // limite seguro de canvas nos navegadores
const QUALIDADE = 0.85;

export const TAMANHO_MAX_PDF = 300 * 1024 * 1024; // 300 MB

type PdfDoc = {
  numPages: number;
  getPage(n: number): Promise<PdfPage>;
  destroy(): Promise<void>;
};
type PdfPage = {
  getViewport(o: { scale: number }): { width: number; height: number };
  render(o: { canvas: HTMLCanvasElement; viewport: unknown }): { promise: Promise<void> };
  cleanup(): void;
};

type PdfJs = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(o: { data: Uint8Array }): { promise: Promise<unknown>; destroy(): Promise<void> };
};

let pdfjsPromise: Promise<PdfJs> | null = null;

/** Carrega o PDF.js de /public/pdfjs com import nativo do navegador
 *  (fora do empacotador do Next, que costuma quebrar essa biblioteca). */
function carregarPdfjs() {
  pdfjsPromise ??= (async () => {
    const importar = new Function("u", "return import(u)") as (u: string) => Promise<PdfJs>;
    try {
      const m = await importar(`${window.location.origin}/pdfjs/pdf.min.mjs`);
      m.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
      return m;
    } catch {
      pdfjsPromise = null;
      throw new Error("O leitor de PDF não foi encontrado. Pare o servidor e rode: npm install && npm run dev");
    }
  })();
  return pdfjsPromise;
}

/** Confere a assinatura "%PDF-" (pode vir depois de alguns bytes no começo). */
export async function ehPdf(arquivo: File) {
  const inicio = new Uint8Array(await arquivo.slice(0, 1024).arrayBuffer());
  return new TextDecoder("latin1").decode(inicio).includes("%PDF-");
}

/** Formato suportado pelo navegador (webp quase sempre; jpg de reserva). */
export async function formatoSaida(): Promise<{ mime: string; ext: "webp" | "jpg" }> {
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.8));
  return blob?.type === "image/webp" ? { mime: "image/webp", ext: "webp" } : { mime: "image/jpeg", ext: "jpg" };
}

export async function abrirPdf(arquivo: File): Promise<PdfDoc> {
  const pdfjs = await carregarPdfjs();
  const dados = new Uint8Array(await arquivo.arrayBuffer());
  const tarefa = pdfjs.getDocument({ data: dados });
  try {
    const doc = (await tarefa.promise) as Omit<PdfDoc, "destroy">;
    // No PDF.js 6 quem fecha é a tarefa de carregamento (o documento não tem destroy)
    return Object.assign(doc, { destroy: () => tarefa.destroy().catch(() => {}) }) as PdfDoc;
  } catch (e) {
    tarefa.destroy().catch(() => {});
    const m = e instanceof Error ? e.message : String(e);
    if (/password/i.test(m)) throw new Error("Esse PDF tem senha. Exporte de novo sem senha.");
    throw new Error(`Não consegui abrir o PDF: ${m}`);
  }
}

export async function renderizarPagina(doc: PdfDoc, n: number, mime: string): Promise<Blob> {
  const pagina = await doc.getPage(n);
  const base = pagina.getViewport({ scale: 1 });
  let escala = Math.min(LARGURA_ALVO / base.width, 4);
  if (base.width * escala * base.height * escala > AREA_MAX) {
    escala = Math.sqrt(AREA_MAX / (base.width * base.height));
  }
  const viewport = pagina.getViewport({ scale: escala });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff"; // páginas transparentes ficam brancas
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  await pagina.render({ canvas, viewport }).promise;
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, mime, QUALIDADE));
  pagina.cleanup();
  canvas.width = canvas.height = 0; // libera memória
  if (!blob) throw new Error(`Falha ao converter a página ${n}`);
  return blob;
}
