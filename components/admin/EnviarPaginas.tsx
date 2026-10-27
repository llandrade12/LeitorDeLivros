"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle, RefreshCw } from "lucide-react";
import { enviarPdfParaCapitulo } from "@/lib/upload-capitulo";
import { Alerta } from "@/components/Alerta";
import { cx } from "@/lib/util";

type Fase = "parado" | "lendo" | "enviando" | "finalizando" | "pronto" | "erro";

export function EnviarPaginas({ capituloId, temPaginas }: { capituloId: string; temPaginas: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [fase, setFase] = useState<Fase>("parado");
  const [arrastando, setArrastando] = useState(false);
  const [msg, setMsg] = useState("");
  const [convertidas, setConvertidas] = useState(0);
  const [enviadas, setEnviadas] = useState(0);
  const [total, setTotal] = useState(0);

  const ocupado = fase === "lendo" || fase === "enviando" || fase === "finalizando";

  async function processar(arquivo: File) {
    setMsg("");
    setConvertidas(0);
    setEnviadas(0);
    try {
      if (temPaginas && !window.confirm("Substituir as páginas atuais por este PDF? O progresso dos leitores é mantido.")) {
        return;
      }
      setFase("lendo");
      const n = await enviarPdfParaCapitulo(arquivo, capituloId, (p) => {
        setFase(p.fase);
        setTotal(p.total);
        setConvertidas(p.convertidas);
        setEnviadas(p.enviadas);
      });
      setFase("pronto");
      setMsg(`${n} páginas publicadas neste capítulo.`);
      router.refresh();
    } catch (e) {
      setFase("erro");
      setMsg(e instanceof Error ? e.message : "Falha no envio.");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  const pct = total ? Math.round(((convertidas + enviadas) / (total * 2)) * 100) : 0;

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={ocupado}
        onClick={() => !ocupado && input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !ocupado && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!ocupado) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !ocupado) processar(f);
        }}
        className={cx(
          "grid cursor-pointer place-items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition",
          arrastando ? "border-primaria bg-primaria/10" : "border-borda hover:border-primaria/60 hover:bg-superficie/40",
          ocupado && "cursor-wait opacity-80",
        )}
      >
        {ocupado ? (
          <LoaderCircle className="animate-spin text-primaria" size={22} />
        ) : temPaginas ? (
          <RefreshCw className="text-suave" size={22} />
        ) : (
          <FileUp className="text-suave" size={22} />
        )}
        <span className="font-medium">
          {temPaginas ? "Substituir por um PDF novo" : "Arraste o PDF aqui ou clique para escolher"}
        </span>
        <span className="text-xs text-suave">O PDF é convertido em páginas no seu navegador (até 300 MB).</span>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) processar(f);
          }}
        />
      </div>

      {ocupado && (
        <div className="space-y-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-superficie">
            <div className="h-full rounded-full bg-primaria transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-suave">
            {fase === "lendo" && "Abrindo o PDF…"}
            {fase === "enviando" && `Convertidas ${convertidas}/${total} · Enviadas ${enviadas}/${total} — não feche esta aba`}
            {fase === "finalizando" && "Finalizando…"}
          </p>
        </div>
      )}
      {fase === "pronto" && <Alerta tipo="ok" titulo={msg} />}
      {fase === "erro" && <Alerta tipo="erro" titulo={msg} />}
    </div>
  );
}
