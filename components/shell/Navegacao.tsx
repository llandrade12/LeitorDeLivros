"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Bookmark,
  Clock,
  CloudDownload,
  FolderClosed,
  LayoutGrid,
  Library,
  UploadCloud,
  LogOut,
  Settings,
  Sparkles,
  Upload,
  User,
  Users,
  UserCog,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { cx } from "@/lib/util";

type Item = { href: string; rotulo: string; icone: LucideIcon };

export const MENU: Item[] = [
  { href: "/", rotulo: "Início", icone: LayoutGrid },
  { href: "/biblioteca", rotulo: "Biblioteca", icone: BookOpen },
  { href: "/colecoes", rotulo: "Minhas coleções", icone: FolderClosed },
  { href: "/favoritos", rotulo: "Favoritos", icone: Bookmark },
  { href: "/em-breve", rotulo: "Em breve", icone: Clock },
  { href: "/amigos", rotulo: "Amigos", icone: Users },
  { href: "/offline", rotulo: "Baixados", icone: CloudDownload },
];

export const MENU_ADMIN: Item[] = [
  { href: "/admin/publicar", rotulo: "Publicar", icone: UploadCloud },
  { href: "/admin/hqs", rotulo: "Minhas HQs", icone: Library },
  { href: "/admin/herois", rotulo: "Heróis", icone: Sparkles },
  { href: "/admin/leitores", rotulo: "Leitores", icone: UserCog },
  { href: "/admin/estatisticas", rotulo: "Estatísticas", icone: BarChart3 },
];

function ativo(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

function LinkNav({ item, path, onClick }: { item: Item; path: string; onClick?: () => void }) {
  const Icone = item.icone;
  const on = ativo(path, item.href);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={on ? "page" : undefined}
      className={cx(
        "flex h-12 items-center gap-3.5 rounded-xl px-4 text-[15px] transition",
        on ? "bg-primaria font-medium text-white shadow-lg shadow-primaria/25" : "text-texto/80 hover:bg-superficie hover:text-texto",
      )}
    >
      <Icone size={19} />
      {item.rotulo}
    </Link>
  );
}

function ListaMenu({ admin, onClick }: { admin: boolean; onClick?: () => void }) {
  const path = usePathname();
  return (
    <>
      <nav className="flex flex-1 flex-col gap-1.5">
        {MENU.map((i) => (
          <LinkNav key={i.href} item={i} path={path} onClick={onClick} />
        ))}
        {admin && (
          <>
            <p className="mb-1 mt-7 px-4 text-[11px] font-semibold uppercase tracking-wider text-suave">Administração</p>
            {MENU_ADMIN.map((i) => (
              <LinkNav key={i.href} item={i} path={path} onClick={onClick} />
            ))}
          </>
        )}
      </nav>
      <div className="mt-6 space-y-1.5 border-t border-borda/60 pt-5">
        <LinkNav item={{ href: "/configuracoes", rotulo: "Configurações", icone: Settings }} path={path} onClick={onClick} />
        <form action="/auth/sair" method="post">
          <button className="flex h-12 w-full items-center gap-3.5 rounded-xl px-4 text-[15px] text-texto/80 hover:bg-superficie hover:text-texto">
            <LogOut size={19} /> Sair
          </button>
        </form>
      </div>
    </>
  );
}

export function BarraLateral({ admin }: { admin: boolean }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-borda/60 bg-painel px-4 pb-6 pt-9 lg:flex">
      <Link href="/" className="mb-10 px-4">
        <Logo />
      </Link>
      <ListaMenu admin={admin} />
    </aside>
  );
}

/** Menu completo no celular (botão ☰ do topo) */
export function MenuCelular({ admin, aberto, onFechar }: { admin: boolean; aberto: boolean; onFechar: () => void }) {
  const path = usePathname();
  useEffect(() => onFechar(), [path]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button aria-label="Fechar menu" onClick={onFechar} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <aside className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto bg-painel px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <div className="mb-8 flex items-center justify-between px-4">
          <Logo tamanho="sm" />
          <button onClick={onFechar} aria-label="Fechar" className="grid size-9 place-items-center rounded-full hover:bg-superficie">
            <X size={20} />
          </button>
        </div>
        <ListaMenu admin={admin} onClick={onFechar} />
      </aside>
    </div>
  );
}

/** Barra inferior do celular — igual ao mockup */
export function BarraInferior() {
  const path = usePathname();
  const itens: Item[] = [
    { href: "/", rotulo: "Início", icone: LayoutGrid },
    { href: "/biblioteca", rotulo: "Biblioteca", icone: BookOpen },
    { href: "/favoritos", rotulo: "Favoritos", icone: Bookmark },
    { href: "/amigos", rotulo: "Amigos", icone: Users },
    { href: "/configuracoes", rotulo: "Perfil", icone: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-borda/60 bg-painel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="flex">
        {itens.map((item) => {
          const Icone = item.icone;
          const on = ativo(path, item.href);
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cx(
                  "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]",
                  on ? "text-primaria" : "text-suave",
                )}
              >
                <Icone size={21} />
                {item.rotulo}
                {on && <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-primaria" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
