import type { Metadata } from "next";
import Link from "next/link";
import { FolderClosed } from "lucide-react";
import { exigirLeitor } from "@/lib/auth";
import { carregarBiblioteca } from "@/lib/biblioteca";
import { carregarColecoes } from "@/lib/colecoes";
import { ImagemCapa } from "@/components/biblioteca/CapaHQ";
import { NovaColecao } from "@/components/biblioteca/GerenciarColecao";

export const metadata: Metadata = { title: "Minhas coleções" };
export const dynamic = "force-dynamic";

export default async function ColecoesPage() {
  const { user } = await exigirLeitor();
  const [colecoes, series] = await Promise.all([carregarColecoes(user.id), carregarBiblioteca(user.id)]);
  const porId = new Map(series.map((s) => [s.id, s]));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Minhas coleções</h1>
        <p className="mt-1 text-sm text-suave">Organize as HQs do seu jeito. Só você vê suas coleções.</p>
      </header>

      <div className="max-w-xl">
        <NovaColecao />
      </div>

      {colecoes.length === 0 ? (
        <div className="cartao grid place-items-center px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-superficie text-primaria">
            <FolderClosed size={26} />
          </span>
          <p className="mt-4 font-semibold">Nenhuma coleção ainda</p>
          <p className="mt-1 max-w-sm text-sm text-suave">
            Crie uma acima, ou abra uma HQ e toque em &quot;Adicionar à coleção&quot;.
          </p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {colecoes.map((c) => {
            const itens = c.series.map((id) => porId.get(id)).filter((s) => s !== undefined);
            return (
              <li key={c.id}>
                <Link href={`/colecoes/${c.id}`} className="cartao group block space-y-4 p-4 transition hover:border-primaria/60">
                  <div className="grid aspect-[16/10] grid-cols-3 gap-1.5 overflow-hidden rounded-xl bg-superficie">
                    {itens.length === 0 ? (
                      <div className="col-span-3 grid place-items-center text-xs text-suave">Vazia</div>
                    ) : (
                      itens.slice(0, 3).map((s, i) => (
                        <div key={s.id} className={itens.length === 1 ? "col-span-3" : itens.length === 2 && i === 1 ? "col-span-2" : ""}>
                          <ImagemCapa url={s.capaUrl} titulo={s.titulo} />
                        </div>
                      ))
                    )}
                  </div>
                  <div>
                    <p className="font-semibold group-hover:text-primaria">{c.nome}</p>
                    <p className="text-xs text-suave">{itens.length} HQ(s)</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
