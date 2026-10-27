import type { Metadata } from "next";
import { exigirLeitor } from "@/lib/auth";
import { carregarBiblioteca } from "@/lib/biblioteca";
import { GradeBiblioteca } from "@/components/biblioteca/GradeBiblioteca";

export const metadata: Metadata = { title: "Biblioteca" };
export const dynamic = "force-dynamic";

export default async function BibliotecaPage({ searchParams }: { searchParams: Promise<{ q?: string; ordem?: string }> }) {
  const { q, ordem } = await searchParams;
  const { user, perfil } = await exigirLeitor();
  const series = (await carregarBiblioteca(user.id)).filter((s) => s.capitulos.length > 0 || perfil.role === "admin");
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Biblioteca</h1>
        <p className="mt-1 text-sm text-suave">{series.length} HQ(s) disponíveis para você.</p>
      </header>
      <GradeBiblioteca key={`${q ?? ""}-${ordem ?? ""}`} ordemInicial={ordem} series={series} vazio="Nenhuma HQ disponível ainda." buscaInicial={q ?? ""} />
    </div>
  );
}
