import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ResumoSerie } from "@/lib/biblioteca";
import { rotuloCapitulo } from "@/lib/rotulos";
import { AnelProgresso } from "./AnelProgresso";
import { ImagemCapa } from "./CapaHQ";

export function CartaoContinuar({ serie }: { serie: ResumoSerie }) {
  const c = serie.continuar;
  if (!c) return null;
  return (
    <Link
      href={`/ler/${c.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-borda/70 bg-painel p-4 transition hover:border-primaria/60"
    >
      <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-superficie">
        <ImagemCapa url={serie.capaUrl} titulo={serie.titulo} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{serie.titulo}</p>
        <p className="mt-1 truncate text-xs text-suave">
          {rotuloCapitulo(c).replace(/^Cap\. /, "Capítulo ")}
          {c.pagina > 0 && ` · Página ${c.pagina}`}
        </p>
      </div>
      <AnelProgresso valor={c.percentual} />
      <ChevronRight size={18} className="shrink-0 text-suave transition group-hover:translate-x-0.5 group-hover:text-texto" />
    </Link>
  );
}
