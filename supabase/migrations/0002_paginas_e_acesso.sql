-- =====================================================================
-- Portal de HQs — ajustes para páginas em imagem e último acesso
-- Rode no SQL Editor depois do 0001 (pode rodar mais de uma vez).
-- =====================================================================

-- Extensão das imagens das páginas (webp; jpg como reserva)
alter table public.chapters
  add column if not exists paginas_ext text not null default 'webp'
  check (paginas_ext in ('webp', 'jpg', 'png'));

-- Registra o último acesso do usuário logado (no máximo 1 vez a cada 5 min)
create or replace function public.registrar_acesso()
returns void language sql security definer set search_path = '' as $$
  update public.profiles
     set ultimo_acesso = now()
   where id = auth.uid()
     and (ultimo_acesso is null or ultimo_acesso < now() - interval '5 minutes');
$$;

revoke all on function public.registrar_acesso() from public, anon;
grant execute on function public.registrar_acesso() to authenticated;

-- Índices para as telas de biblioteca e estatísticas
create index if not exists series_ordem_idx       on public.series(ordem, criado_em desc);
create index if not exists progress_user_idx      on public.reading_progress(user_id, atualizado_em desc);
create index if not exists bookmarks_user_cap_idx on public.bookmarks(user_id, chapter_id);
