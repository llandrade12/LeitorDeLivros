"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { avaliar } from "@/lib/acoes/leitor";
import { cx } from "@/lib/util";

/** Nota média (só leitura) — para as capas */
export function NotaMedia({ media, className }: { media: number | null; className?: string }) {
  if (media === null) return null;
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs font-medium", className)}>
      <Star size={13} className="fill-primaria text-primaria" />
      {media.toFixed(1)}
    </span>
  );
}

/** Estrelas clicáveis — na página da série */
export function AvaliarSerie({
  serieId,
  minha,
  media,
  total,
}: {
  serieId: string;
  minha: number | null;
  media: number | null;
  total: number;
}) {
  const [, iniciar] = useTransition();
  const [nota, setNota] = useOptimistic(minha);
  const [hover, setHover] = useState<number | null>(null);
  const exibida = hover ?? nota ?? 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex" onMouseLeave={() => setHover(null)} role="radiogroup" aria-label="Sua avaliação">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={nota === n}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onClick={() =>
              iniciar(async () => {
                const nova = nota === n ? null : n;
                setNota(nova);
                await avaliar(serieId, nova);
              })
            }
            className="p-0.5 transition hover:scale-110"
          >
            <Star size={22} className={cx(n <= exibida ? "fill-primaria text-primaria" : "text-suave/60")} />
          </button>
        ))}
      </div>
      <span className="text-xs text-suave">
        {media !== null ? `${media.toFixed(1)} · ${total} avaliação(ões)` : "Seja o primeiro a avaliar"}
        {nota ? " · sua nota: " + nota : ""}
      </span>
    </div>
  );
}
