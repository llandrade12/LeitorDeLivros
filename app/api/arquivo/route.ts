import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { MODO_LOCAL } from "@/lib/local/ativo";
import { assinaturaLocal, caminhoLocalSeguro, tipoDe } from "@/lib/storage";

/** Só existe no modo local: serve e recebe arquivos de .dados-locais/arquivos
 *  com URLs assinadas e temporárias (igual ao R2/Supabase em produção). */
async function validar(request: NextRequest, metodo: "GET" | "PUT") {
  if (!MODO_LOCAL) return null;
  const p = request.nextUrl.searchParams;
  const caminho = p.get("c") ?? "";
  const expira = Number(p.get("e"));
  const sig = p.get("s") ?? "";
  if (!caminho || !expira || expira < Date.now() / 1000) return null;
  if (sig !== (await assinaturaLocal(metodo, caminho, expira))) return null;
  try {
    return { caminho, abs: caminhoLocalSeguro(caminho) };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const v = await validar(request, "GET");
  if (!v) return new NextResponse("Não encontrado", { status: 404 });
  try {
    const dados = await readFile(v.abs);
    return new NextResponse(new Uint8Array(dados), {
      headers: { "content-type": tipoDe(v.caminho), "cache-control": "private, max-age=600" },
    });
  } catch {
    return new NextResponse("Não encontrado", { status: 404 });
  }
}

export async function PUT(request: NextRequest) {
  const v = await validar(request, "PUT");
  if (!v) return new NextResponse("Assinatura inválida", { status: 403 });
  const corpo = new Uint8Array(await request.arrayBuffer());
  if (corpo.byteLength > 60 * 1024 * 1024) return new NextResponse("Arquivo grande demais", { status: 413 });
  await mkdir(dirname(v.abs), { recursive: true });
  await writeFile(v.abs, corpo);
  return NextResponse.json({ ok: true });
}
