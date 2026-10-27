import { exigirLeitor } from "@/lib/auth";
import { registrarAcesso } from "@/lib/acesso";
import { clienteDados } from "@/lib/supabase/dados";
import { assinar, EXPIRA_CAPA_S } from "@/lib/storage";
import { BarraInferior, BarraLateral } from "@/components/shell/Navegacao";
import { Topo, type Novidade } from "@/components/shell/Topo";
import { SincronizarOffline } from "@/components/pwa/SincronizarOffline";

async function novidadesRecentes(): Promise<Novidade[]> {
  try {
    const db = await clienteDados();
    const desde = new Date(Date.now() - 30 * 864e5).toISOString();
    const { data } = await db
      .from("chapters")
      .select("id,numero,titulo,publicado_em,series!inner(titulo,slug,publicado)")
      .eq("publicado", true)
      .eq("series.publicado", true)
      .gt("total_paginas", 0)
      .gte("publicado_em", desde)
      .order("publicado_em", { ascending: false })
      .limit(15);
    type Linha = { id: string; numero: string; titulo: string; publicado_em: string; series: { titulo: string; slug: string } };
    return ((data ?? []) as unknown as Linha[]).map((c) => ({
      id: c.id,
      numero: c.numero,
      titulo: c.titulo,
      publicado_em: c.publicado_em,
      serie: c.series.titulo,
      slug: c.series.slug,
    }));
  } catch {
    return [];
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await exigirLeitor();
  const [, novidades, urls] = await Promise.all([
    registrarAcesso(),
    novidadesRecentes(),
    assinar([perfil.avatar_path], EXPIRA_CAPA_S),
  ]);
  const admin = perfil.role === "admin";

  return (
    <div className="flex min-h-dvh">
      <BarraLateral admin={admin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topo
          nome={perfil.nome || "Leitor"}
          avatarUrl={urls.get(perfil.avatar_path ?? "") ?? null}
          admin={admin}
          novidades={novidades}
        />
        <main className="animar-entrada flex-1 px-5 pb-28 pt-6 lg:px-8 lg:pb-10">{children}</main>
      </div>
      <BarraInferior />
      <SincronizarOffline />
    </div>
  );
}
