import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormNovaSenha } from "@/components/senha/FormNovaSenha";

export const metadata: Metadata = { title: "Nova senha" };

export default async function RedefinirSenhaPage() {
  const s = await getSessao();
  if (!s) redirect("/login?aviso=link");
  if (!s.perfil?.ativo) redirect("/auth/sair?motivo=desativada");

  return (
    <div className="space-y-6">
      <Link href="/auth/sair" className="inline-flex items-center gap-2 text-sm text-suave hover:text-texto">
        <ArrowLeft size={16} /> Voltar
      </Link>
      <header>
        <h1 className="text-2xl font-bold">Nova senha</h1>
        <p className="mt-1 text-sm text-suave">Crie uma senha forte para sua conta.</p>
      </header>
      <FormNovaSenha botao="Redefinir senha" />
    </div>
  );
}
