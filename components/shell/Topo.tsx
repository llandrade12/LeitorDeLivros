"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Download, LogOut, Menu, Search, Settings, UploadCloud } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SeloOffline } from "@/components/pwa/SeloOffline";
import { MenuCelular } from "./Navegacao";
import { rotuloCapitulo } from "@/lib/rotulos";
import { cx } from "@/lib/util";

export type Novidade = {
  id: string;
  numero: string;
  titulo: string;
  publicado_em: string;
  serie: string;
  slug: string;
};

const CHAVE_VISTO = "geek-notificacoes-vistas";

export function Avatar({ nome, url, tamanho = 36 }: { nome: string; url: string | null; tamanho?: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={tamanho} height={tamanho} className="shrink-0 rounded-full object-cover" style={{ width: tamanho, height: tamanho }} />
  ) : (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primaria to-roxo font-bold text-white"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.4 }}
    >
      {(nome || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

function useFora(ref: React.RefObject<HTMLElement | null>, fechar: () => void) {
  useEffect(() => {
    const f = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && fechar();
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, [ref, fechar]);
}

function Sino({ novidades }: { novidades: Novidade[] }) {
  const [aberto, setAberto] = useState(false);
  const [visto, setVisto] = useState<string | null>("9999");
  const caixa = useRef<HTMLDivElement>(null);
  useFora(caixa, () => setAberto(false));

  useEffect(() => {
    try {
      setVisto(localStorage.getItem(CHAVE_VISTO));
    } catch {
      setVisto(null);
    }
  }, []);

  const novas = novidades.filter((n) => !visto || n.publicado_em > visto).length;

  return (
    <div ref={caixa} className="relative">
      <button
        aria-label={`Notificações${novas ? ` (${novas} novas)` : ""}`}
        onClick={() => {
          setAberto((v) => !v);
          const agora = new Date().toISOString();
          try {
            localStorage.setItem(CHAVE_VISTO, agora);
          } catch {
            /* sem armazenamento */
          }
          setTimeout(() => setVisto(agora), 1500);
        }}
        className="relative grid size-10 place-items-center rounded-full text-texto/85 hover:bg-superficie"
      >
        <Bell size={20} />
        {novas > 0 && (
          <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-primaria px-1 text-[10px] font-bold text-white">
            {novas > 9 ? "9+" : novas}
          </span>
        )}
      </button>
      {aberto && (
        <div className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-borda bg-painel shadow-2xl">
          <p className="border-b border-borda/60 px-4 py-3 text-sm font-semibold">Novos capítulos</p>
          {novidades.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-suave">Nada novo nos últimos 30 dias.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-borda/40 overflow-y-auto">
              {novidades.map((n) => (
                <li key={n.id}>
                  <Link href={`/ler/${n.id}`} onClick={() => setAberto(false)} className="flex gap-3 px-4 py-3 hover:bg-superficie">
                    <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", !visto || n.publicado_em > visto ? "bg-primaria" : "bg-transparent")} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{n.serie}</span>
                      <span className="block truncate text-xs text-suave">
                        {rotuloCapitulo(n)} · {new Date(n.publicado_em).toLocaleDateString("pt-BR")}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function MenuUsuario({ nome, avatarUrl }: { nome: string; avatarUrl: string | null }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  useFora(caixa, () => setAberto(false));
  return (
    <div ref={caixa} className="relative">
      <button onClick={() => setAberto((v) => !v)} className="flex items-center gap-3 rounded-full py-1 pl-1 pr-2 hover:bg-superficie">
        <Avatar nome={nome} url={avatarUrl} tamanho={40} />
        <span className="hidden max-w-36 truncate text-sm sm:block">{nome}</span>
        <ChevronDown size={16} className="hidden text-suave sm:block" />
      </button>
      {aberto && (
        <div className="absolute right-0 top-14 z-40 w-56 overflow-hidden rounded-2xl border border-borda bg-painel py-2 shadow-2xl">
          <Link href="/configuracoes" onClick={() => setAberto(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-superficie">
            <Settings size={16} /> Configurações
          </Link>
          <Link href="/instalar" onClick={() => setAberto(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-superficie">
            <Download size={16} /> Instalar o app
          </Link>
          <form action="/auth/sair" method="post">
            <button className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-perigo hover:bg-superficie">
              <LogOut size={16} /> Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function Topo({
  nome,
  avatarUrl,
  admin,
  novidades,
}: {
  nome: string;
  avatarUrl: string | null;
  admin: boolean;
  novidades: Novidade[];
}) {
  const [menu, setMenu] = useState(false);
  const busca = (
    <form action="/biblioteca" role="search" className="campo h-11 w-full">
      <input name="q" type="search" placeholder="Buscar HQs, autores, tags…" aria-label="Buscar" />
      <Search size={18} className="shrink-0 text-suave" />
    </form>
  );
  return (
    <header className="sticky top-0 z-20 border-b border-borda/40 bg-fundo/90 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-5 lg:h-20 lg:px-8">
        <Link href="/" className="lg:hidden">
          <Logo tamanho="sm" />
        </Link>
        <div className="hidden max-w-xl flex-1 lg:block">{busca}</div>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <SeloOffline />
          {admin && (
            <Link href="/admin/publicar" className="btn-primario hidden h-10 rounded-full px-4 sm:inline-flex">
              <UploadCloud size={16} /> Publicar
            </Link>
          )}
          <Sino novidades={novidades} />
          <MenuUsuario nome={nome} avatarUrl={avatarUrl} />
          <button onClick={() => setMenu(true)} aria-label="Abrir menu" className="grid size-10 place-items-center rounded-full hover:bg-superficie lg:hidden">
            <Menu size={22} />
          </button>
        </div>
      </div>
      <div className="px-5 pb-3 lg:hidden">{busca}</div>
      <MenuCelular admin={admin} aberto={menu} onFechar={() => setMenu(false)} />
    </header>
  );
}
