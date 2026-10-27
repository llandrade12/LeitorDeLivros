"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, LoaderCircle, Trash2 } from "lucide-react";
import { dadosParaDownload } from "@/lib/acoes/leitor";
import { baixarCapitulo, obterBaixado, removerBaixado, suportaOffline } from "@/lib/offline";
import { cx } from "@/lib/util";

type Estado = "carregando" | "nao" | "baixando" | "sim" | "erro" | "indisponivel";

/** Baixar / remover um capítulo para ler sem internet */
export function BotaoBaixar({ capituloId, compacto = false }: { capituloId: string; compacto?: boolean }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [pct, setPct] = useState(0);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!suportaOffline()) return setEstado("indisponivel");
    obterBaixado(capituloId)
      .then((c) => setEstado(c && c.expiraEm > Date.now() ? "sim" : "nao"))
      .catch(() => setEstado("nao"));
  }, [capituloId]);

  async function baixar() {
    setErro("");
    setEstado("baixando");
    setPct(0);
    try {
      const r = await dadosParaDownload(capituloId);
      if ("erro" in r) throw new Error(r.erro);
      await baixarCapitulo(r.dados, (f, t) => setPct(Math.round((f / t) * 100)));
      setEstado("sim");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao baixar");
      setEstado("erro");
    }
  }

  async function remover() {
    await removerBaixado(capituloId);
    setEstado("nao");
  }

  if (estado === "indisponivel" || estado === "carregando") return null;

  const rotulo =
    estado === "sim"
      ? "Baixado · toque para remover"
      : estado === "baixando"
        ? `Baixando ${pct}%`
        : estado === "erro"
          ? `Erro: ${erro} Tentar de novo`
          : "Baixar para ler offline";

  const acao = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (estado === "baixando") return;
    if (estado === "sim") {
      if (window.confirm("Remover este capítulo do aparelho?")) remover();
    } else baixar();
  };

  if (compacto) {
    return (
      <button
        type="button"
        onClick={acao}
        title={rotulo}
        aria-label={rotulo}
        className={cx(
          "relative grid size-10 shrink-0 place-items-center rounded-full transition hover:bg-black/10",
          estado === "sim" && "text-sucesso",
          estado === "erro" && "text-perigo",
        )}
      >
        {estado === "baixando" ? (
          <>
            <LoaderCircle size={19} className="animate-spin text-primaria" />
            <span className="absolute -bottom-0.5 text-[9px] font-bold tabular-nums">{pct}</span>
          </>
        ) : estado === "sim" ? (
          <CheckCircle2 size={19} />
        ) : (
          <Download size={19} />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={acao}
      title={rotulo}
      className={cx(
        "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium transition",
        estado === "sim"
          ? "border-sucesso/40 bg-sucesso/10 text-sucesso hover:border-perigo/50 hover:bg-perigo/10 hover:text-perigo"
          : estado === "erro"
            ? "border-perigo/40 text-perigo"
            : "border-borda text-texto/85 hover:border-primaria hover:text-primaria",
      )}
    >
      {estado === "baixando" ? (
        <LoaderCircle size={14} className="animate-spin" />
      ) : estado === "sim" ? (
        <CheckCircle2 size={14} />
      ) : (
        <Download size={14} />
      )}
      <span className={cx(estado !== "baixando" && "hidden sm:inline")}>
        {estado === "baixando" ? `${pct}%` : estado === "sim" ? "Offline" : estado === "erro" ? "Tentar de novo" : "Baixar"}
      </span>
      {estado === "sim" && <Trash2 size={12} className="hidden opacity-60 sm:block" />}
    </button>
  );
}
