"use client";

import { useTransition } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { excluirSerie } from "@/lib/acoes/admin-hqs";

export function ExcluirSerie({ serieId, titulo }: { serieId: string; titulo: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (window.confirm(`Excluir "${titulo}" com todos os capítulos, páginas e progresso dos leitores? Não dá para desfazer.`))
          iniciar(async () => {
            await excluirSerie(serieId);
          });
      }}
      className="btn-perigo w-full"
    >
      {pendente ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
      Excluir HQ
    </button>
  );
}
