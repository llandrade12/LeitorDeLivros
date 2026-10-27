import Link from "next/link";
import { Check, Heart, Star } from "lucide-react";
import type { ResumoSerie } from "@/lib/biblioteca";
import { cx } from "@/lib/util";

export function ImagemCapa({ url, titulo, className }: { url: string | null; titulo: string; className?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={`Capa de ${titulo}`} loading="lazy" draggable={false} className={cx("size-full object-cover", className)} />
  ) : (
    <div className={cx("grid size-full place-items-center bg-gradient-to-br from-superficie to-painel p-3 text-center", className)}>
      <span className="text-sm font-black uppercase tracking-tight text-suave">{titulo}</span>
    </div>
  );
}

export function CapaHQ({ serie }: { serie: ResumoSerie }) {
  return (
    <Link href={`/serie/${serie.slug}`} className="group block space-y-2.5">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-superficie shadow-lg shadow-black/30 ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-primaria/10 group-hover:ring-primaria/70">
        <ImagemCapa url={serie.capaUrl} titulo={serie.titulo} className="transition duration-300 group-hover:scale-[1.03]" />
        <div className="absolute inset-x-2 top-2 flex justify-between gap-1">
          {!serie.publicado ? (
            <span className="rounded-md bg-alerta/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-fundo">Rascunho</span>
          ) : (
            <span />
          )}
          {serie.favorito && (
            <span className="grid size-6 place-items-center rounded-full bg-black/60 text-rose-400">
              <Heart size={13} fill="currentColor" />
            </span>
          )}
        </div>
        {serie.estado === "concluido" && (
          <span className="absolute bottom-2 right-2 grid size-7 place-items-center rounded-full bg-sucesso text-fundo">
            <Check size={15} strokeWidth={3} />
          </span>
        )}
        {serie.estado === "em_leitura" && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
            <div className="h-full bg-primaria" style={{ width: `${Math.max(serie.percentual, 4)}%` }} />
          </div>
        )}
      </div>
      <div className="space-y-0.5">
        <p className="truncate text-sm font-semibold group-hover:text-primaria">{serie.titulo}</p>
        <p className="truncate text-xs text-suave">{serie.autor || `${serie.capitulos.length} capítulo(s)`}</p>
        <p className="flex items-center gap-1 pt-0.5 text-xs font-medium">
          <Star size={13} className={serie.mediaNota !== null ? "fill-primaria text-primaria" : "text-suave/50"} />
          {serie.mediaNota !== null ? serie.mediaNota.toFixed(1) : <span className="text-suave/70">—</span>}
        </p>
      </div>
    </Link>
  );
}
