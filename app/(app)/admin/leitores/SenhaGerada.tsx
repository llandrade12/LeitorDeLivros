"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, X } from "lucide-react";

/** Mostra a senha temporária uma única vez, com botão de copiar. */
export function SenhaGerada({
  email,
  senha,
  onFechar,
}: {
  email: string;
  senha: string;
  onFechar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const texto = `Seu acesso ao portal:\nE-mail: ${email}\nSenha temporária: ${senha}\n(No primeiro login você vai criar sua própria senha.)`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* navegador sem permissão de área de transferência */
    }
  }

  return (
    <div className="rounded-xl border border-primaria/40 bg-primaria/10 p-4">
      <div className="flex items-start gap-3">
        <KeyRound size={18} className="mt-0.5 shrink-0 text-primaria" />
        <div className="min-w-0 flex-1 space-y-2 text-sm">
          <p className="font-semibold">Senha temporária — anote agora, ela não aparece de novo.</p>
          <p className="text-suave">
            {email}
          </p>
          <p className="break-all rounded-lg bg-fundo px-3 py-2 font-mono text-base tracking-wider">{senha}</p>
          <button type="button" onClick={copiar} className="btn-secundario h-9">
            {copiado ? <Check size={16} /> : <Copy size={16} />}
            {copiado ? "Copiado" : "Copiar mensagem para enviar"}
          </button>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="text-suave hover:text-texto">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
