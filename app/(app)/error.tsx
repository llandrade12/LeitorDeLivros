"use client";

import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";

export default function ErroPagina({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <div className="mx-auto grid max-w-md place-items-center py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-perigo/10 text-perigo">
        <TriangleAlert size={26} />
      </span>
      <h1 className="mt-5 text-xl font-bold">{offline ? "Você está sem internet" : "Algo deu errado"}</h1>
      <p className="mt-2 text-sm text-suave">
        {offline ? "Os capítulos baixados continuam disponíveis." : "Tente de novo. Se continuar, me mande o texto abaixo."}
      </p>
      {!offline && error.message && <p className="mt-3 max-w-full break-words rounded-lg bg-painel px-3 py-2 font-mono text-xs text-suave">{error.message}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn-primario">
          <RotateCw size={16} /> Tentar de novo
        </button>
        <Link href="/offline" className="btn-secundario">
          Ver baixados
        </Link>
      </div>
    </div>
  );
}
