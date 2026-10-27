"use client";

import { useActionState } from "react";
import { definirNovaSenha } from "./actions";
import { Alerta } from "@/components/Alerta";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CampoSenha } from "@/components/CampoSenha";

export function FormNovaSenha({ botao }: { botao: string }) {
  const [estado, acao] = useActionState(definirNovaSenha, {});

  return (
    <form action={acao} className="space-y-4">
      {estado.erro && <Alerta tipo="erro" titulo={estado.erro} />}
      <CampoSenha name="senha" placeholder="Nova senha" autoComplete="new-password" mostrarForca />
      <CampoSenha name="confirmar" placeholder="Confirmar senha" autoComplete="new-password" />
      <BotaoEnviar seta={false}>{botao}</BotaoEnviar>
    </form>
  );
}
