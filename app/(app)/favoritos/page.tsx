import type { Metadata } from "next";
import { exigirLeitor } from "@/lib/auth";
import { carregarBiblioteca } from "@/lib/biblioteca";
import { GradeBiblioteca } from "@/components/biblioteca/GradeBiblioteca";

export const metadata: Metadata = { title: "Favoritos" };
export const dynamic = "force-dynamic";

export default async function FavoritosPage() {
  const { user } = await exigirLeitor();
  const series = (await carregarBiblioteca(user.id)).filter((s) => s.favorito);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Favoritos</h1>
        <p className="mt-1 text-sm text-suave">As HQs que você marcou com ♥.</p>
      </header>
      <GradeBiblioteca series={series} vazio="Você ainda não favoritou nenhuma HQ. Abra uma série e toque em Favoritar." />
    </div>
  );
}
