import type { Metadata } from "next";
import Link from "next/link";
import { Plus, UploadCloud } from "lucide-react";
import { exigirAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { assinar, EXPIRA_CAPA_S } from "@/lib/storage";
import { ROTULO_STATUS, type Serie } from "@/lib/tipos";
import { cx } from "@/lib/util";

export const metadata: Metadata = { title: "Minhas HQs" };
export const dynamic = "force-dynamic";

export default async function AdminHqsPage() {
  await exigirAdmin();
  const db = createAdminClient();
  const [{ data: s }, { data: c }] = await Promise.all([
    db.from("series").select("*").order("ordem").order("criado_em", { ascending: false }),
    db.from("chapters").select("series_id,publicado,total_paginas,capa_path,ordem").order("ordem"),
  ]);
  const series = (s ?? []) as Serie[];
  const caps = (c ?? []) as { series_id: string; publicado: boolean; total_paginas: number; capa_path: string | null }[];

  const capaDe = (sr: Serie) => sr.capa_path ?? caps.find((x) => x.series_id === sr.id && x.capa_path)?.capa_path ?? null;
  const urls = await assinar(series.map(capaDe), EXPIRA_CAPA_S);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Minhas HQs</h1>
          <p className="mt-1 text-sm text-suave">Clique numa HQ para editar capa, banner, heróis, capítulos e quem pode ler.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/hqs/nova" className="btn-secundario">
            <Plus size={16} /> Nova HQ (detalhada)
          </Link>
          <Link href="/admin/publicar" className="btn-primario">
            <UploadCloud size={16} /> Publicar PDFs
          </Link>
        </div>
      </header>

      {series.length === 0 ? (
        <div className="cartao p-10 text-center text-sm text-suave">
          Nenhuma HQ ainda.{" "}
          <Link href="/admin/publicar" className="link">
            Publique a primeira
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {series.map((sr) => {
            const seus = caps.filter((x) => x.series_id === sr.id);
            const publicados = seus.filter((x) => x.publicado && x.total_paginas > 0).length;
            const url = urls.get(capaDe(sr) ?? "");
            return (
              <li key={sr.id}>
                <Link href={`/admin/hqs/${sr.id}`} className="group block space-y-2">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-superficie ring-1 ring-borda/60 transition group-hover:ring-primaria">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="grid size-full place-items-center p-3 text-center text-xs text-suave">Sem capa</div>
                    )}
                    <span
                      className={cx(
                        "absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                        sr.publicado ? "bg-sucesso/90 text-fundo" : "bg-alerta/90 text-fundo",
                      )}
                    >
                      {sr.publicado ? "Publicada" : "Rascunho"}
                    </span>
                  </div>
                  <p className="truncate text-sm font-semibold group-hover:text-primaria">{sr.titulo}</p>
                  <p className="text-xs text-suave">
                    {ROTULO_STATUS[sr.status]} · {publicados}/{seus.length} cap.
                    {sr.acesso === "restrito" ? " · restrita" : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
