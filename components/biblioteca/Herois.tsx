import Link from "next/link";
import type { HeroiResumo } from "@/lib/personagens";
import { cx } from "@/lib/util";

/** Herói recortado saindo de um círculo colorido — como no mockup */
export function CartaoHeroi({ heroi, tamanho = "md" }: { heroi: HeroiResumo; tamanho?: "md" | "lg" }) {
  const conteudo = (
    <figure className="group relative">
      <div className={cx("relative mx-auto", tamanho === "lg" ? "h-44 w-28" : "h-36 w-full max-w-24")}>
        <span
          className="absolute inset-x-0 bottom-2 mx-auto aspect-square w-[92%] rounded-full transition group-hover:scale-105"
          style={{ background: heroi.cor }}
        />
        {heroi.imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroi.imagemUrl}
            alt={heroi.nome}
            draggable={false}
            className="absolute inset-0 size-full object-contain object-bottom drop-shadow-[0_8px_10px_rgba(0,0,0,0.45)] transition duration-300 group-hover:-translate-y-1"
          />
        ) : (
          <span className="absolute inset-x-0 bottom-8 text-center text-2xl font-black text-white">
            {heroi.nome.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <figcaption className="mt-1 truncate text-center text-xs font-medium text-texto/85">{heroi.nome}</figcaption>
    </figure>
  );
  return heroi.serieSlug ? (
    <Link href={`/serie/${heroi.serieSlug}`} title={heroi.serieTitulo ?? undefined}>
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}
