"use client";

import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { alternarFavorito } from "@/lib/acoes/leitor";
import { cx } from "@/lib/util";

export function BotaoFavorito({ serieId, favorito }: { serieId: string; favorito: boolean }) {
  const [, iniciar] = useTransition();
  const [otimista, setOtimista] = useOptimistic(favorito);

  return (
    <button
      type="button"
      aria-pressed={otimista}
      onClick={() =>
        iniciar(async () => {
          setOtimista(!otimista);
          await alternarFavorito(serieId, !otimista);
        })
      }
      className={cx("btn-secundario", otimista && "border-rose-400/50 text-rose-400")}
    >
      <Heart size={16} fill={otimista ? "currentColor" : "none"} />
      {otimista ? "Favoritada" : "Favoritar"}
    </button>
  );
}
