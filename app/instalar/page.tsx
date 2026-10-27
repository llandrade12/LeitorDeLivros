import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Monitor, Smartphone, Tablet } from "lucide-react";
import { redirect } from "next/navigation";
import { BotaoInstalar } from "@/components/pwa/BotaoInstalar";
import { getSessao } from "@/lib/auth";
import { NOME_PORTAL } from "@/lib/util";

export const metadata: Metadata = { title: "Instalar o app" };

export default async function InstalarPage() {
  const s = await getSessao();
  if (!s) redirect("/login");
  const voltar = s.perfil?.precisa_trocar_senha ? "/primeiro-acesso" : "/configuracoes";
  return (
    <main className="mx-auto max-w-lg space-y-5 px-5 py-8">
      <Link href={voltar} className="inline-flex items-center gap-2 text-lg font-bold">
        <ArrowLeft size={20} /> Instalar o app
      </Link>
      <p className="text-sm text-suave">
        Instale o {NOME_PORTAL} na tela inicial e abra como um app, em tela cheia, sem a barra do navegador.
      </p>

      <section className="cartao space-y-4 p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Smartphone size={18} /> iPhone (iOS)
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-texto/85">
          <li>
            Abra o site no <b>Safari</b> e toque no botão <span className="text-primaria">Compartilhar</span> (quadrado com seta).
          </li>
          <li>
            Selecione <span className="text-primaria">Adicionar à Tela de Início</span>.
          </li>
          <li>Pronto! O {NOME_PORTAL} estará na sua tela inicial.</li>
        </ol>
        <details className="group rounded-xl border border-borda">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm">
            <span className="grid size-5 place-items-center rounded-full border border-borda text-[10px]">?</span>
            Ver passo a passo
            <ChevronRight size={16} className="ml-auto transition group-open:rotate-90" />
          </summary>
          <p className="border-t border-borda px-4 py-3 text-xs text-suave">
            No Safari o botão Compartilhar fica na barra de baixo (iPhone) ou em cima (iPad). Se não aparecer
            &quot;Adicionar à Tela de Início&quot;, role a lista de opções para baixo. No Chrome do iPhone, use o menu
            ⋯ → Adicionar à Tela de Início.
          </p>
        </details>
      </section>

      <section className="cartao space-y-4 p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Tablet size={18} /> Android
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-texto/85">
          <li>Toque no menu (⋮) do Chrome.</li>
          <li>
            Selecione <b>Instalar app</b>.
          </li>
          <li>Confirme e pronto!</li>
        </ol>
        <BotaoInstalar />
      </section>

      <section className="cartao space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Monitor size={18} /> Computador
        </h2>
        <p className="text-sm text-texto/85">
          No Chrome ou Edge, clique no ícone de instalar na barra de endereço (à direita) ou no botão acima.
        </p>
      </section>
    </main>
  );
}
