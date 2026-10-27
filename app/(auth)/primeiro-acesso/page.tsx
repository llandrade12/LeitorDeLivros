import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import Link from "next/link";
import { ChevronRight, Smartphone } from "lucide-react";
import { FormNovaSenha } from "@/components/senha/FormNovaSenha";

export const metadata: Metadata = { title: "Primeiro acesso" };

export default async function PrimeiroAcessoPage() {
  const s = await getSessao();
  if (!s) redirect("/login");
  if (!s.perfil?.ativo) redirect("/auth/sair?motivo=desativada");
  if (!s.perfil.precisa_trocar_senha) redirect("/");

  const primeiroNome = s.perfil.nome.split(" ")[0] || "leitor";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Olá, {primeiroNome}!</h1>
        <p className="mt-1 text-sm text-suave">Defina sua senha para continuar.</p>
      </header>
      <FormNovaSenha botao="Continuar" />
      <Link
        href="/instalar"
        className="flex items-center gap-4 rounded-2xl border border-borda bg-painel p-4 transition hover:border-primaria/60"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primaria/15 text-primaria">
          <Smartphone size={20} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-primaria">Instalar o app</span>
          <span className="block text-xs text-suave">Baixe o GEEK no seu dispositivo para uma experiência completa.</span>
        </span>
        <ChevronRight size={18} className="text-suave" />
      </Link>
    </div>
  );
}
