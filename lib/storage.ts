import "server-only";
import { createHmac } from "node:crypto";
import { mkdir, readdir, unlink } from "node:fs/promises";
import { join, normalize, sep } from "node:path";
import { AwsClient } from "aws4fetch";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODO_LOCAL } from "@/lib/local/ativo";
import type { Capitulo } from "@/lib/tipos";

/** Bucket do Supabase (só usado quando não há R2 configurado) */
export const BUCKET = "hqs";

/** Quanto tempo as URLs assinadas valem */
export const EXPIRA_PAGINA_S = 15 * 60; // 15 min (o leitor renova sozinho)
export const EXPIRA_CAPA_S = 60 * 60; // 1 h
const EXPIRA_UPLOAD_S = 2 * 60 * 60; // 2 h

export const pastaPaginas = (capituloId: string, versao: number) => `capitulos/${capituloId}/v${versao}`;
export const caminhoPagina = (pasta: string, n: number, ext: string) => `${pasta}/${String(n).padStart(4, "0")}.${ext}`;

export function caminhosPaginas(c: Pick<Capitulo, "paginas_path" | "total_paginas" | "paginas_ext">) {
  if (!c.paginas_path || c.total_paginas < 1) return [];
  return Array.from({ length: c.total_paginas }, (_, i) => caminhoPagina(c.paginas_path!, i + 1, c.paginas_ext));
}

export const TIPO_POR_EXT: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};
export const tipoDe = (caminho: string) => TIPO_POR_EXT[caminho.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

/** Para onde o navegador deve mandar o arquivo (PUT) */
export type DestinoUpload = { caminho: string; url: string; headers: Record<string, string> };

// =====================================================================
// Provedores
// =====================================================================

type Provedor = {
  assinar(caminhos: string[], segundos: number): Promise<Map<string, string>>;
  urlUpload(caminho: string, contentType: string): Promise<DestinoUpload>;
  listar(prefixo: string): Promise<string[]>;
  remover(caminhos: string[]): Promise<void>;
};

// ---------- Local (.dados-locais/arquivos) ----------
const PASTA_LOCAL = join(process.cwd(), ".dados-locais", "arquivos");

export function caminhoLocalSeguro(caminho: string) {
  const limpo = normalize(caminho).replace(/^([/\\])+/, "");
  if (limpo.startsWith("..") || limpo.includes(`..${sep}`)) throw new Error("Caminho inválido");
  return join(PASTA_LOCAL, limpo);
}

async function segredoLocal() {
  const { lerBanco } = await import("@/lib/local/banco");
  return lerBanco().segredo;
}

export async function assinaturaLocal(metodo: "GET" | "PUT", caminho: string, expira: number) {
  return createHmac("sha256", await segredoLocal()).update(`${metodo}:${caminho}:${expira}`).digest("hex").slice(0, 32);
}

const local: Provedor = {
  async assinar(caminhos, segundos) {
    const exp = Math.floor(Date.now() / 1000) + segundos;
    const mapa = new Map<string, string>();
    for (const c of caminhos) {
      mapa.set(c, `/api/arquivo?c=${encodeURIComponent(c)}&e=${exp}&s=${await assinaturaLocal("GET", c, exp)}`);
    }
    return mapa;
  },
  async urlUpload(caminho, contentType) {
    const exp = Math.floor(Date.now() / 1000) + EXPIRA_UPLOAD_S;
    const s = await assinaturaLocal("PUT", caminho, exp);
    return { caminho, url: `/api/arquivo?c=${encodeURIComponent(caminho)}&e=${exp}&s=${s}`, headers: { "content-type": contentType } };
  },
  async listar(prefixo) {
    const base = caminhoLocalSeguro(prefixo);
    const saida: string[] = [];
    async function varrer(abs: string, rel: string) {
      let itens;
      try {
        itens = await readdir(abs, { withFileTypes: true });
      } catch {
        return;
      }
      for (const it of itens) {
        if (it.isDirectory()) await varrer(join(abs, it.name), `${rel}/${it.name}`);
        else saida.push(`${rel}/${it.name}`);
      }
    }
    await mkdir(PASTA_LOCAL, { recursive: true });
    await varrer(base, prefixo.replace(/\/$/, ""));
    return saida;
  },
  async remover(caminhos) {
    await Promise.all(caminhos.map((c) => unlink(caminhoLocalSeguro(c)).catch(() => {})));
  },
};

// ---------- Cloudflare R2 (API compatível com S3) ----------
function r2Config() {
  const conta = process.env.R2_ACCOUNT_ID;
  const chave = process.env.R2_ACCESS_KEY_ID;
  const segredo = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!conta || !chave || !segredo || !bucket) return null;
  return {
    cliente: new AwsClient({ accessKeyId: chave, secretAccessKey: segredo, service: "s3", region: "auto" }),
    base: `https://${conta}.r2.cloudflarestorage.com/${bucket}`,
  };
}
const urlObjeto = (base: string, caminho: string) => `${base}/${caminho.split("/").map(encodeURIComponent).join("/")}`;
const desfazerXml = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

const r2: Provedor = {
  async assinar(caminhos, segundos) {
    const cfg = r2Config()!;
    const mapa = new Map<string, string>();
    await Promise.all(
      caminhos.map(async (c) => {
        const u = new URL(urlObjeto(cfg.base, c));
        u.searchParams.set("X-Amz-Expires", String(segundos));
        const req = await cfg.cliente.sign(u.toString(), { method: "GET", aws: { signQuery: true } });
        mapa.set(c, req.url);
      }),
    );
    return mapa;
  },
  async urlUpload(caminho, contentType) {
    const cfg = r2Config()!;
    const u = new URL(urlObjeto(cfg.base, caminho));
    u.searchParams.set("X-Amz-Expires", String(EXPIRA_UPLOAD_S));
    const req = await cfg.cliente.sign(u.toString(), { method: "PUT", aws: { signQuery: true } });
    return { caminho, url: req.url, headers: { "content-type": contentType } };
  },
  async listar(prefixo) {
    const cfg = r2Config()!;
    const chaves: string[] = [];
    let continuacao: string | null = null;
    do {
      const u = new URL(cfg.base);
      u.searchParams.set("list-type", "2");
      u.searchParams.set("prefix", prefixo.replace(/\/?$/, "/"));
      if (continuacao) u.searchParams.set("continuation-token", continuacao);
      const r = await cfg.cliente.fetch(u.toString());
      if (!r.ok) throw new Error(`R2: falha ao listar (${r.status})`);
      const xml = await r.text();
      for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) chaves.push(desfazerXml(m[1]));
      const prox = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
      continuacao = prox ? desfazerXml(prox[1]) : null;
    } while (continuacao);
    return chaves;
  },
  async remover(caminhos) {
    const cfg = r2Config()!;
    for (let i = 0; i < caminhos.length; i += 20) {
      await Promise.all(caminhos.slice(i, i + 20).map((c) => cfg.cliente.fetch(urlObjeto(cfg.base, c), { method: "DELETE" })));
    }
  },
};

// ---------- Supabase Storage ----------
const supabase: Provedor = {
  async assinar(caminhos, segundos) {
    const storage = createAdminClient().storage.from(BUCKET);
    const mapa = new Map<string, string>();
    for (let i = 0; i < caminhos.length; i += 500) {
      const { data } = await storage.createSignedUrls(caminhos.slice(i, i + 500), segundos);
      data?.forEach((d) => d.path && d.signedUrl && mapa.set(d.path, d.signedUrl));
    }
    return mapa;
  },
  async urlUpload(caminho, contentType) {
    const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(caminho, { upsert: true });
    if (error || !data) throw new Error(error?.message ?? "Falha ao preparar upload");
    return { caminho, url: data.signedUrl, headers: { "content-type": contentType, "x-upsert": "true" } };
  },
  async listar(prefixo) {
    const storage = createAdminClient().storage.from(BUCKET);
    const saida: string[] = [];
    async function varrer(pasta: string) {
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await storage.list(pasta, { limit: 1000, offset });
        if (error || !data?.length) break;
        for (const item of data) {
          const caminho = `${pasta}/${item.name}`;
          if (!item.id) await varrer(caminho);
          else saida.push(caminho);
        }
        if (data.length < 1000) break;
      }
    }
    await varrer(prefixo.replace(/\/$/, ""));
    return saida;
  },
  async remover(caminhos) {
    const storage = createAdminClient().storage.from(BUCKET);
    for (let i = 0; i < caminhos.length; i += 900) await storage.remove(caminhos.slice(i, i + 900));
  },
};

export function nomeProvedor(): "local" | "r2" | "supabase" {
  if (MODO_LOCAL) return "local";
  if (r2Config()) return "r2";
  return "supabase";
}
const provedor = (): Provedor => ({ local, r2, supabase })[nomeProvedor()];

// =====================================================================
// API usada pelo resto do portal
// =====================================================================

/** Assina vários caminhos de uma vez. Devolve um mapa caminho → URL. */
export async function assinar(caminhos: (string | null | undefined)[], segundos: number) {
  const unicos = [...new Set(caminhos.filter((c): c is string => Boolean(c)))];
  if (!unicos.length) return new Map<string, string>();
  return provedor().assinar(unicos, segundos);
}

export async function urlUpload(caminho: string, contentType = tipoDe(caminho)) {
  return provedor().urlUpload(caminho, contentType);
}

export async function listarArquivos(prefixo: string) {
  return provedor().listar(prefixo);
}

export async function removerArquivos(caminhos: string[]) {
  if (caminhos.length) await provedor().remover(caminhos);
}

/** Apaga todos os arquivos de uma pasta (e subpastas). */
export async function apagarPasta(prefixo: string) {
  const arquivos = await listarArquivos(prefixo);
  await removerArquivos(arquivos);
  return arquivos.length;
}
