import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { assinar, EXPIRA_CAPA_S } from "@/lib/storage";
import type { Personagem } from "@/lib/tipos";
import { GerenciarHerois } from "@/components/admin/GerenciarHerois";

export const metadata: Metadata = { title: "Heróis" };
export const dynamic = "force-dynamic";

export default async function HeroisPage() {
  await exigirAdmin();
  const db = createAdminClient();
  const [{ data: p }, { data: v }, { data: s }] = await Promise.all([
    db.from("personagens").select("*").order("ordem"),
    db.from("personagens_series").select("personagem_id,series_id"),
    db.from("series").select("id,titulo").order("titulo"),
  ]);
  const herois = (p ?? []) as Personagem[];
  const vinculos = (v ?? []) as { personagem_id: string; series_id: string }[];
  const urls = await assinar(herois.map((h) => h.imagem_path), EXPIRA_CAPA_S);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Heróis</h1>
        <p className="mt-1 text-sm text-suave">Os personagens do seu universo. Marque em quais HQs cada um aparece.</p>
      </header>
      <GerenciarHerois
        series={(s ?? []) as { id: string; titulo: string }[]}
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
