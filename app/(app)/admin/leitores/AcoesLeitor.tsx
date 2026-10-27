"use client";

import { useState, useTransition } from "react";
import { KeyRound, LoaderCircle, Mail, Power, Trash2 } from "lucide-react";
import { alternarAtivo, excluirLeitor, redefinirSenha, type ResultadoAcao } from "./actions";
import { Alerta } from "@/components/Alerta";
import { SenhaGerada } from "./SenhaGerada";

export function AcoesLeitor({
  id,
  nome,
  ativo,
  ehVoce,
}: {
  id: string;
  nome: string;
  ativo: boolean;
  ehVoce: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoAcao | null>(null);

  if (ehVoce) return <span className="text-xs text-suave">Sua conta (admin)</span>;

  const rodar = (fn: () => Promise<ResultadoAcao>, confirmar?: string) => {
    if (confirmar && !window.confirm(confirmar)) return;
    iniciar(async () => {
      try {
        setResultado(await fn());
      } catch {
        setResultado({ erro: "Algo deu errado. Recarregue a página e tente de novo." });
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {pendente && <LoaderCircle size={16} className="animate-spin text-suave" />}
        <button
          disabled={pendente}
          className="btn-secundario h-9 px-3 text-xs"
          onClick={() =>
            rodar(
              () => redefinirSenha(id, "temporaria"),
              `Gerar uma nova senha temporária para ${nome}? A senha atual deixa de funcionar.`,
            )
          }
        >
          <KeyRound size={14} /> Nova senha
        </button>
        <button
          disabled={pendente}
          className="btn-secundario h-9 px-3 text-xs"
          onClick={() => rodar(() => redefinirSenha(id, "email"))}
        >
          <Mail size={14} /> Link por e-mail
        </button>
        <button
          disabled={pendente}
          className="btn-secundario h-9 px-3 text-xs"
          onClick={() =>
            rodar(
              () => alternarAtivo(id, !ativo),
              ativo ? `Desativar ${nome}? Ele perde o acesso na hora.` : undefined,
            )
          }
        >
          <Power size={14} /> {ativo ? "Desativar" : "Reativar"}
        </button>
        <button
          disabled={pendente}
          className="btn-perigo h-9 px-3 text-xs"
          onClick={() =>
            rodar(
              () => excluirLeitor(id),
              `Excluir ${nome} de vez? Progresso, marcadores e favoritos dele também serão apagados.`,
            )
          }
        >
          <Trash2 size={14} /> Excluir
        </button>
      </div>

      {resultado?.erro && <Alerta tipo="erro" titulo={resultado.erro} />}
      {resultado?.ok && !resultado.senha && <Alerta tipo="ok" titulo={resultado.ok} />}
      {resultado?.senha && resultado.email && (
        <SenhaGerada email={resultado.email} senha={resultado.senha} onFechar={() => setResultado(null)} />
      )}
    </div>
  );
}
