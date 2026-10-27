import type { Metadata } from "next";
import { CalendarClock, Clock } from "lucide-react";
import Link from "next/link";
import { exigirLeitor } from "@/lib/auth";
import { carregarBiblioteca } from "@/lib/biblioteca";
import { ImagemCapa } from "@/components/biblioteca/CapaHQ";

export const metadata: Metadata = { title: "Em breve" };
export const dynamic = "force-dynamic";

function data(d: string | null) {
  if (!d) return "Data a definir";
  const [a, m, dia] = d.split("-").map(Number);
  return new Date(a, m - 1, dia).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function EmBrevePage() {
  const { user, perfil } = await exigirLeitor();
  const todas = await carregarBiblioteca(user.id, { incluirEmBreve: true });
  const embreve = todas
    .filter((s) => s.em_breve && !s.publicado)
    .sort((a, b) => (a.lancamento_em ?? "9999").localeCompare(b.lancamento_em ?? "9999"));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Em breve</h1>
        <p className="mt-1 text-sm text-suave">Histórias que estão chegando. Fique de olho no sino 🔔.</p>
      </header>

      {embreve.length === 0 ? (
        <div className="cartao grid place-items-center px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-superficie text-primaria">
            <Clock size={26} />
          </span>
          <p className="mt-4 font-semibold">Nenhum lançamento anunciado</p>
          <p className="mt-1 max-w-sm text-sm text-suave">
            {perfil.role === "admin"
              ? "Em HQs e capítulos, ligue \"Mostrar em Em breve\" numa HQ ainda não publicada."
              : "Quando uma nova HQ for anunciada, ela aparece aqui."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {embreve.map((s) => (
            <li key={s.id} className="cartao flex gap-4 overflow-hidden p-4">
              <div className="aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-xl bg-superficie sm:w-32">
                <ImagemCapa url={s.capaUrl} titulo={s.titulo} />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-roxo/15 px-2.5 py-1 text-xs font-medium text-roxo">
                  <CalendarClock size={13} /> {data(s.lancamento_em)}
                </span>
                <h2 className="text-lg font-bold leading-tight">{s.titulo}</h2>
                {s.autor && <p className="text-xs text-suave">{s.autor}</p>}
                <p className="line-clamp-4 text-sm text-texto/80">{s.chamada || s.sinopse || "Sinopse em breve."}</p>
                {perfil.role === "admin" && (
                  <Link href={`/admin/hqs/${s.id}`} className="text-xs text-primaria">
                    Editar
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
