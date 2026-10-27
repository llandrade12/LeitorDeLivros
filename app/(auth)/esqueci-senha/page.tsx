"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { pedirLink } from "./actions";
import { Alerta } from "@/components/Alerta";
import { BotaoEnviar } from "@/components/BotaoEnviar";

export default function EsqueciSenhaPage() {
  const [estado, acao] = useActionState(pedirLink, {});

  return (
    <div className="space-y-6">
      <Link href="/login" className="inline-flex items-center gap-2 text-sm text-suave hover:text-texto">
        <ArrowLeft size={16} /> Voltar
      </Link>
      <header>
        <h1 className="text-2xl font-bold">Recuperar senha</h1>
        <p className="mt-1 text-sm text-suave">
          Informe seu e-mail cadastrado para receber um link de redefinição de senha.
        </p>
      </header>

      {estado.erro && <Alerta tipo="erro" titulo={estado.erro} />}
      {estado.ok ? (
        <Alerta tipo="ok" titulo="Link enviado!">
          {estado.ok}
        </Alerta>
      ) : (
        <form action={acao} className="space-y-4">
          <label className="campo">
            <Mail size={18} className="shrink-0 text-suave" />
            <input name="email" type="email" placeholder="E-mail" autoComplete="email" required />
          </label>
          <BotaoEnviar>Enviar link</BotaoEnviar>
        </form>
      )}

      <p className="text-center text-sm text-suave">
        Lembrou sua senha?{" "}
        <Link href="/login" className="link">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
