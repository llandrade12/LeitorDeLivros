"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Lock } from "lucide-react";
import { REGRAS_SENHA, forcaSenha } from "@/lib/senha";
import { cx } from "@/lib/util";

export function CampoSenha({
  name,
  placeholder = "Senha",
  autoComplete = "current-password",
  mostrarForca = false,
  onValor,
}: {
  name: string;
  placeholder?: string;
  autoComplete?: string;
  mostrarForca?: boolean;
  onValor?: (v: string) => void;
}) {
  const [visivel, setVisivel] = useState(false);
  const [valor, setValor] = useState("");
  const forca = forcaSenha(valor);

  return (
    <div className="space-y-3">
      <label className="campo">
        <Lock size={18} className="shrink-0 text-suave" />
        <input
          name={name}
          type={visivel ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            onValor?.(e.target.value);
          }}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          className="shrink-0 text-suave hover:text-texto"
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        >
          {visivel ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </label>

      {mostrarForca && (
        <div className="space-y-2.5">
          <div>
            <p className="mb-1.5 text-xs text-suave">Força da senha</p>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cx(
                    "h-1 flex-1 rounded-full transition-colors",
                    i < forca ? (forca >= 3 ? (i === 3 ? "bg-roxo" : "bg-sucesso") : "bg-alerta") : "bg-superficie",
                  )}
                />
              ))}
            </div>
          </div>
          <ul className="space-y-1.5 text-xs">
            {REGRAS_SENHA.map((r) => {
              const ok = r.teste(valor);
              return (
                <li key={r.id} className={cx("flex items-center gap-2", ok ? "text-texto" : "text-suave")}>
                  <span
                    className={cx(
                      "grid size-4 place-items-center rounded-full",
                      ok ? "bg-sucesso text-fundo" : "border border-borda",
                    )}
                  >
                    {ok && <Check size={11} strokeWidth={3} />}
                  </span>
                  {r.texto}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
