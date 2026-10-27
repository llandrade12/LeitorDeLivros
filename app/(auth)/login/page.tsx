import type { Metadata } from "next";
import { Alerta } from "@/components/Alerta";
import { destinoSeguro } from "@/lib/util";
import { FormLogin } from "./FormLogin";
import { MODO_LOCAL } from "@/lib/local/ativo";
import { CONTAS_TESTE } from "@/lib/local/banco";

export const metadata: Metadata = { title: "Entrar" };

const AVISOS: Record<string, { tipo: "erro" | "ok" | "info"; titulo: string; texto?: string }> = {
  desativada: { tipo: "erro", titulo: "Conta desativada.", texto: "Fale com o administrador." },
  link: { tipo: "erro", titulo: "Link inválido ou expirado.", texto: "Peça um novo link." },
  senha: { tipo: "ok", titulo: "Senha alterada.", texto: "Entre com a nova senha." },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; aviso?: string }>;
}) {
  const { next, aviso } = await searchParams;
  const a = aviso ? AVISOS[aviso] : undefined;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Bem-vindo de volta</h1>
        <p className="mt-1 text-sm text-suave">Acesse sua conta para continuar lendo.</p>
      </header>

      {a && (
        <Alerta tipo={a.tipo} titulo={a.titulo}>
          {a.texto}
        </Alerta>
      )}

      <FormLogin next={next ? destinoSeguro(next) : undefined} />

      {MODO_LOCAL ? (
        <Alerta tipo="info" titulo="Modo local — contas de teste">
          <ul className="mt-1 space-y-1 font-mono text-xs">
            {CONTAS_TESTE.map((c) => (
              <li key={c.email}>
                {c.role === "admin" ? "Admin" : "Leitor"}: {c.email} · {c.senha}
              </li>
            ))}
          </ul>
        </Alerta>
      ) : (
        <Alerta tipo="info" titulo="Acesso somente por convite.">
          Peça ao administrador.
        </Alerta>
      )}
    </div>
  );
}
