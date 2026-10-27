import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Download, LogOut } from "lucide-react";
import { exigirLeitor } from "@/lib/auth";
import { assinar, EXPIRA_CAPA_S } from "@/lib/storage";
import { EnviarAvatar, FormPerfil, FormTrocarSenha } from "@/components/perfil/FormPerfil";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const { user, perfil } = await exigirLeitor();
  const urls = await assinar([perfil.avatar_path], EXPIRA_CAPA_S);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="mt-1 text-sm text-suave">{user.email}</p>
      </header>

      <section className="cartao space-y-5 p-5">
        <h2 className="font-semibold">Perfil</h2>
        <EnviarAvatar nome={perfil.nome} url={urls.get(perfil.avatar_path ?? "") ?? null} />
        <FormPerfil nome={perfil.nome} compartilhar={perfil.compartilhar_leitura !== false} />
      </section>

      <section className="cartao space-y-5 p-5">
        <h2 className="font-semibold">Segurança</h2>
        <FormTrocarSenha />
      </section>

      <section className="cartao divide-y divide-borda/60 overflow-hidden">
        <Link href="/instalar" className="flex items-center gap-4 p-5 hover:bg-superficie/50">
          <span className="grid size-11 place-items-center rounded-xl bg-primaria/15 text-primaria">
            <Download size={20} />
          </span>
          <span className="flex-1">
            <span className="block font-medium text-primaria">Instalar o app</span>
            <span className="block text-xs text-suave">Leia em tela cheia, direto da tela inicial.</span>
          </span>
          <ChevronRight size={18} className="text-suave" />
        </Link>
        <form action="/auth/sair" method="post">
          <button className="flex w-full items-center gap-4 p-5 text-left text-perigo hover:bg-superficie/50">
            <span className="grid size-11 place-items-center rounded-xl bg-perigo/10">
              <LogOut size={20} />
            </span>
            Sair da conta
          </button>
        </form>
      </section>
    </div>
  );
}
