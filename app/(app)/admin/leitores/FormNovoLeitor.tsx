"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Mail, User } from "lucide-react";
import { criarLeitor, type ResultadoAcao } from "./actions";
import { Alerta } from "@/components/Alerta";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { SenhaGerada } from "./SenhaGerada";
import { cx } from "@/lib/util";

export function FormNovoLeitor() {
  const [estado, acao] = useActionState<ResultadoAcao, FormData>(criarLeitor, {});
  const [modo, setModo] = useState<"senha" | "convite">("senha");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) {
      form.current?.reset();
      setMostrarSenha(Boolean(estado.senha));
    }
  }, [estado]);

  return (
    <form ref={form} action={acao} className="cartao space-y-4 p-5">
      <h2 className="font-semibold">Novo leitor</h2>

      {estado.erro && <Alerta tipo="erro" titulo={estado.erro} />}
      {estado.ok && !estado.senha && <Alerta tipo="ok" titulo={estado.ok} />}
      {mostrarSenha && estado.senha && estado.email && (
        <SenhaGerada email={estado.email} senha={estado.senha} onFechar={() => setMostrarSenha(false)} />
      )}

      <div>
        <label className="rotulo" htmlFor="nome">Nome</label>
        <div className="campo">
          <User size={18} className="shrink-0 text-suave" />
          <input id="nome" name="nome" placeholder="Nome do amigo" required autoComplete="off" />
        </div>
      </div>
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <div className="campo">
          <Mail size={18} className="shrink-0 text-suave" />
          <input id="email" name="email" type="email" placeholder="email@exemplo.com" required autoComplete="off" />
        </div>
      </div>

      <fieldset>
        <legend className="rotulo">Como enviar o acesso</legend>
        <input type="hidden" name="modo" value={modo} />
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-fundo p-1">
          {(
            [
              ["senha", "Senha temporária"],
              ["convite", "Link por e-mail"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setModo(valor)}
              aria-pressed={modo === valor}
              className={cx(
                "h-9 rounded-lg text-sm transition",
                modo === valor ? "bg-superficie font-medium text-texto" : "text-suave hover:text-texto",
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-suave">
          {modo === "senha"
            ? "Gera uma senha para você mandar pelo WhatsApp. Ele troca no primeiro login."
            : "O Supabase envia um e-mail com o link de primeiro acesso (precisa de SMTP configurado)."}
        </p>
      </fieldset>

      <BotaoEnviar seta={false}>{modo === "senha" ? "Criar leitor" : "Enviar convite"}</BotaoEnviar>
    </form>
  );
}
