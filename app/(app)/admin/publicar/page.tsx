import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Publicar, type SerieOpcao } from "@/components/admin/Publicar";
import { assinar, EXPIRA_CAPA_S } from "@/lib/storage";
import type { Personagem } from "@/lib/tipos";

export const metadata: Metadata = { title: "Publicar" };
export const dynamic = "force-dynamic";

export default async function PublicarPage({ searchParams }: { searchParams: Promise<{ hq?: string }> }) {
  await exigirAdmin();
  const { hq } = await searchParams;
  const db = createAdminClient();
  const [{ data: s }, { data: c }, { data: p }, { data: v }] = await Promise.all([
    db.from("series").select("id,titulo,slug,publicado,atualizado_em").order("atualizado_em", { ascending: false }),
    db.from("chapters").select("series_id,numero"),
    db.from("personagens").select("*").order("ordem"),
    db.from("personagens_series").select("personagem_id,series_id"),
  ]);
  const herois = (p ?? []) as Personagem[];
  const vinculos = (v ?? []) as { personagem_id: string; series_id: string }[];
  const urls = await assinar(herois.map((h) => h.imagem_path), EXPIRA_CAPA_S);
  const caps = (c ?? []) as { series_id: string; numero: string }[];
  const series: SerieOpcao[] = ((s ?? []) as { id: string; titulo: string; slug: string; publicado: boolean }[]).map((x) => {
    const daSerie = caps.filter((k) => k.series_id === x.id);
    const maior = Math.max(0, ...daSerie.map((k) => parseFloat(k.numero)).filter((n) => Number.isFinite(n)));
    return { id: x.id, titulo: x.titulo, slug: x.slug, publicado: x.publicado, capitulos: daSerie.length, proximo: Math.floor(maior) + 1 };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Publicar</h1>
        <p className="mt-1 text-sm text-suave">
          Escolha a HQ, arraste os PDFs e pronto: cada PDF vira um capítulo, numerado e publicado.
        </p>
      </header>
      <Publicar
        series={series}
        serieInicial={hq}
        herois={herois.map((h) => ({
          id: h.id,
          nome: h.nome,
          cor: h.cor,
          imagemUrl: urls.get(h.imagem_path ?? "") ?? null,
          series: vinculos.filter((x) => x.personagem_id === h.id).map((x) => x.series_id),
        }))}
      />
    </div>
  );
}
