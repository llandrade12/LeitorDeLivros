"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Undo2 } from "lucide-react";
import { marcarConcluido } from "@/lib/acoes/leitor";

export function BotaoConcluido({ capituloId, concluido }: { capituloId: string; concluido: boolean }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [estado, setEstado] = useOptimistic(concluido);
  return (
    <button
      type="button"
      onClick={() =>
        iniciar(async () => {
          setEstado(!estado);
          await marcarConcluido(capituloId, !estado);
          router.refresh();
        })
      }
      title={estado ? "Marcar como não lido" : "Marcar como lido"}
      aria-label={estado ? "Marcar como não lido" : "Marcar como lido"}
      className="grid size-9 shrink-0 place-items-center rounded-lg text-suave transition hover:bg-superficie hover:text-texto"
    >
      {estado ? <Undo2 size={16} /> : <CheckCheck size={16} />}
    </button>
  );
}
