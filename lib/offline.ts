"use client";

/** Leitura offline: páginas ficam no Cache Storage do navegador e os dados
 *  do capítulo no IndexedDB. Nada disso sai do aparelho. */

export const VALIDADE_DIAS = 30;
const DB = "geek-offline";
const CACHE_SHELL = "geek-shell";
export const cacheDoCapitulo = (id: string) => `geek-hq-${id}`;
export const urlPaginaOffline = (id: string, n: number) => `/offline-paginas/${id}/${n}`;

export type CapituloBaixado = {
  id: string;
  serieId: string;
  serieTitulo: string;
  serieSlug: string;
  rotulo: string;
  numero: string;
  titulo: string;
  total: number;
  nomeLeitor: string;
  pagina: number;
  concluido: boolean;
  bytes: number;
  baixadoEm: number;
  expiraEm: number;
  marcadores: { pagina: number; nota: string }[];
};

export type ProgressoPendente = { capituloId: string; pagina: number; total: number; em: number };

// ---------------- IndexedDB mínimo ----------------
function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("capitulos")) db.createObjectStore("capitulos", { keyPath: "id" });
      if (!db.objectStoreNames.contains("pendentes")) db.createObjectStore("pendentes", { keyPath: "capituloId" });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}

async function tx<T>(loja: string, modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await abrir();
  return new Promise((ok, erro) => {
    const t = db.transaction(loja, modo);
    const req = fn(t.objectStore(loja));
    t.oncomplete = () => {
      db.close();
      ok(req ? (req.result as T) : undefined);
    };
    t.onerror = () => {
      db.close();
      erro(t.error);
    };
  });
}

export const suportaOffline = () => typeof window !== "undefined" && "caches" in window && "indexedDB" in window;

export async function listarBaixados(): Promise<CapituloBaixado[]> {
  if (!suportaOffline()) return [];
  const todos = ((await tx<CapituloBaixado[]>("capitulos", "readonly", (s) => s.getAll())) ?? []) as CapituloBaixado[];
  const agora = Date.now();
  const vencidos = todos.filter((c) => c.expiraEm < agora);
  for (const c of vencidos) await removerBaixado(c.id);
  return todos.filter((c) => c.expiraEm >= agora).sort((a, b) => a.serieTitulo.localeCompare(b.serieTitulo) || a.rotulo.localeCompare(b.rotulo, "pt-BR", { numeric: true }));
}

export async function obterBaixado(id: string) {
  if (!suportaOffline()) return undefined;
  return (await tx<CapituloBaixado>("capitulos", "readonly", (s) => s.get(id))) as CapituloBaixado | undefined;
}

export async function salvarBaixado(c: CapituloBaixado) {
  await tx("capitulos", "readwrite", (s) => s.put(c));
}

export async function removerBaixado(id: string) {
  if (!suportaOffline()) return;
  await caches.delete(cacheDoCapitulo(id));
  await tx("capitulos", "readwrite", (s) => s.delete(id));
}

export async function idsBaixados() {
  return new Set((await listarBaixados()).map((c) => c.id));
}

// ---------------- progresso feito sem internet ----------------
export async function guardarProgressoPendente(capituloId: string, pagina: number, total: number) {
  if (!suportaOffline()) return;
  await tx("pendentes", "readwrite", (s) => s.put({ capituloId, pagina, total, em: Date.now() } satisfies ProgressoPendente));
  const c = await obterBaixado(capituloId);
  if (c) await salvarBaixado({ ...c, pagina, concluido: c.concluido || pagina >= total });
}

export async function listarPendentes(): Promise<ProgressoPendente[]> {
  if (!suportaOffline()) return [];
  return ((await tx<ProgressoPendente[]>("pendentes", "readonly", (s) => s.getAll())) ?? []) as ProgressoPendente[];
}

export async function limparPendente(capituloId: string) {
  await tx("pendentes", "readwrite", (s) => s.delete(capituloId));
}

// ---------------- download ----------------
/** Guarda a "casca" do app (página Baixados + JS/CSS) para abrir sem internet. */
export async function guardarCasca() {
  try {
    const cache = await caches.open(CACHE_SHELL);
    const resp = await fetch("/offline", { cache: "no-store" });
    if (!resp.ok) return;
    const html = await resp.clone().text();
    await cache.put("/offline", resp);
    const recursos = new Set<string>(["/icone-192.png", "/icon.svg", "/manifest.webmanifest"]);
    for (const m of html.matchAll(/["'(](\/_next\/static\/[^"')\s]+)/g)) recursos.add(m[1]);
    // fontes e imagens citadas dentro do CSS
    for (const css of [...recursos].filter((u) => u.endsWith(".css"))) {
      try {
        const t = await (await fetch(css)).text();
        for (const m of t.matchAll(/url\((\/_next\/static\/[^)"']+)\)/g)) recursos.add(m[1]);
      } catch {
        /* segue */
      }
    }
    await Promise.all([...recursos].map((u) => cache.add(u).catch(() => {})));
  } catch {
    /* sem casca, o leitor ainda funciona com o app aberto */
  }
}

export type DadosDownload = {
  capitulo: { id: string; numero: string; titulo: string; total: number; serieId: string };
  serie: { titulo: string; slug: string };
  rotulo: string;
  paginas: string[];
  pagina: number;
  concluido: boolean;
  marcadores: { pagina: number; nota: string }[];
  nomeLeitor: string;
};

export async function baixarCapitulo(dados: DadosDownload, aoProgredir: (feitas: number, total: number) => void) {
  if (!suportaOffline()) throw new Error("Este navegador não permite leitura offline.");
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* opcional */
  }
  const id = dados.capitulo.id;
  const cache = await caches.open(cacheDoCapitulo(id));
  let feitas = 0;
  let bytes = 0;
  const fila = dados.paginas.map((url, i) => ({ url, n: i + 1 }));
  async function trabalhador() {
    for (let item = fila.shift(); item; item = fila.shift()) {
      let ultimoErro: unknown;
      for (let t = 1; t <= 3; t++) {
        try {
          const r = await fetch(item.url, { cache: "no-store" });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const blob = await r.blob();
          bytes += blob.size;
          await cache.put(urlPaginaOffline(id, item.n), new Response(blob, { headers: { "content-type": blob.type || "image/webp" } }));
          ultimoErro = null;
          break;
        } catch (e) {
          ultimoErro = e;
          await new Promise((ok) => setTimeout(ok, 600 * t));
        }
      }
      if (ultimoErro) throw new Error(`Falha ao baixar a página ${item.n}.`);
      feitas++;
      aoProgredir(feitas, dados.paginas.length);
    }
  }
  try {
    await Promise.all([trabalhador(), trabalhador(), trabalhador(), trabalhador()]);
  } catch (e) {
    await caches.delete(cacheDoCapitulo(id));
    throw e;
  }
  await salvarBaixado({
    id,
    serieId: dados.capitulo.serieId,
    serieTitulo: dados.serie.titulo,
    serieSlug: dados.serie.slug,
    rotulo: dados.rotulo,
    numero: dados.capitulo.numero,
    titulo: dados.capitulo.titulo,
    total: dados.capitulo.total,
    nomeLeitor: dados.nomeLeitor,
    pagina: dados.pagina,
    concluido: dados.concluido,
    bytes,
    baixadoEm: Date.now(),
    expiraEm: Date.now() + VALIDADE_DIAS * 864e5,
    marcadores: dados.marcadores,
  });
  await guardarCasca();
}

/** URLs locais (blob:) das páginas guardadas — o leitor usa no lugar das URLs assinadas */
export async function paginasLocais(id: string, total: number) {
  const cache = await caches.open(cacheDoCapitulo(id));
  const urls: string[] = [];
  for (let n = 1; n <= total; n++) {
    const r = await cache.match(urlPaginaOffline(id, n));
    urls.push(r ? URL.createObjectURL(await r.blob()) : "");
  }
  return urls;
}

export function tamanhoLegivel(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Mantém a cópia baixada em dia quando a leitura acontece online */
export async function atualizarPaginaBaixado(id: string, pagina: number, total: number) {
  if (!suportaOffline()) return;
  const c = await obterBaixado(id);
  if (c) await salvarBaixado({ ...c, pagina, concluido: c.concluido || pagina >= total });
}
