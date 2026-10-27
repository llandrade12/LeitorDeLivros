import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { exigirLeitor } from "@/lib/auth";
import { carregarBiblioteca } from "@/lib/biblioteca";
import { carregarColecoes } from "@/lib/colecoes";
import { CapaHQ } from "@/components/biblioteca/CapaHQ";
import { AcoesColecao, TirarDaColecao } from "@/components/biblioteca/GerenciarColecao";

export const metadata: Metadata = { title: "Coleção" };
export const dynamic = "force-dynamic";

export default async function ColecaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await exigirLeitor();
  const [colecoes, series] = await Promise.all([carregarColecoes(user.id), carregarBiblioteca(user.id)]);
  const colecao = colecoes.find((c) => c.id === id);
  if (!colecao) notFound();
  const porId = new Map(series.map((s) => [s.id, s]));
  const itens = colecao.series.map((sid) => porId.get(sid)).filter((s) => s !== undefined);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link href="/colecoes" className="inline-flex items-center gap-2 text-sm text-suave hover:text-texto">
        <ArrowLeft size={16} /> Minhas coleções
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{colecao.nome}</h1>
          <p className="mt-1 text-sm text-suave">{itens.length} HQ(s)</p>
        </div>
        <AcoesColecao id={colecao.id} nome={colecao.nome} />
      </header>
      {itens.length === 0 ? (
        <p className="cartao p-10 text-center text-sm text-suave">
          Coleção vazia. Abra uma HQ na <Link href="/biblioteca" className="link">biblioteca</Link> e toque em &quot;Adicionar à coleção&quot;.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {itens.map((s) => (
            <li key={s.id} className="relative">
              <TirarDaColecao colecaoId={colecao.id} serieId={s.id} />
              <CapaHQ serie={s} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
