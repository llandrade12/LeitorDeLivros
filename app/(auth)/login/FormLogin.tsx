"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail } from "lucide-react";
import { entrar } from "./actions";
import { Alerta } from "@/components/Alerta";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CampoSenha } from "@/components/CampoSenha";

export function FormLogin({ next }: { next?: string }) {
  const [estado, acao] = useActionState(entrar, {});

  return (
    <form action={acao} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {estado.erro && <Alerta tipo="erro" titulo={estado.erro} />}

      <label className="campo">
        <Mail size={18} className="shrink-0 text-suave" />
        <input name="email" type="email" placeholder="E-mail" autoComplete="email" required />
      </label>
      <CampoSenha name="senha" />

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-texto/85">
        <input type="checkbox" name="lembrar" defaultChecked className="size-4 rounded accent-primaria" />
        Manter conectado
      </label>

      <BotaoEnviar>Entrar</BotaoEnviar>

      <p className="text-center text-sm">
        <Link href="/esqueci-senha" className="link">
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}
