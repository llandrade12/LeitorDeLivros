-- =====================================================================
-- Portal de HQs — schema completo + Row Level Security
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > Run
-- (Pode rodar de novo sem problema na maioria dos blocos; os "create
--  policy" falham se já existirem — nesse caso apague o projeto de teste
--  ou rode só o que faltou.)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tipos ----------
do $$ begin
  create type public.user_role    as enum ('admin', 'leitor');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.serie_status as enum ('em_andamento', 'finalizada', 'hiato');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.serie_acesso as enum ('todos', 'restrito');
exception when duplicate_object then null; end $$;

-- ---------- Tabelas ----------
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  nome                  text not null default '',
  role                  public.user_role not null default 'leitor',
  ativo                 boolean not null default true,
  precisa_trocar_senha  boolean not null default false,
  criado_em             timestamptz not null default now(),
  ultimo_acesso         timestamptz
);

create table if not exists public.series (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  slug           text not null unique,
  sinopse        text not null default '',
  capa_path      text,                                  -- caminho no bucket
  status         public.serie_status not null default 'em_andamento',
  tags           text[] not null default '{}',
  publicado      boolean not null default false,        -- false = rascunho (só admin vê)
  acesso         public.serie_acesso not null default 'todos',
  ordem          int not null default 0,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create table if not exists public.chapters (
  id             uuid primary key default gen_random_uuid(),
  series_id      uuid not null references public.series(id) on delete cascade,
  numero         text not null default '',              -- "1", "Vol. 2", "Especial"…
  titulo         text not null default '',
  ordem          int not null default 0,                -- ordenação manual
  pdf_path       text,                                  -- PDF original (opcional)
  paginas_path   text,                                  -- pasta das páginas renderizadas
  total_paginas  int not null default 0 check (total_paginas >= 0),
  versao         int not null default 1,                -- sobe a cada substituição do PDF
  capa_path      text,
  publicado      boolean not null default false,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index if not exists chapters_series_ordem_idx on public.chapters(series_id, ordem);

-- Leitores liberados para séries com acesso = 'restrito'
create table if not exists public.series_access (
  series_id  uuid not null references public.series(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  primary key (series_id, user_id)
);

create table if not exists public.reading_progress (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  chapter_id     uuid not null references public.chapters(id) on delete cascade,
  ultima_pagina  int not null default 1 check (ultima_pagina >= 1),
  concluido      boolean not null default false,
  concluido_em   timestamptz,
  atualizado_em  timestamptz not null default now(),
  primary key (user_id, chapter_id)
);
create index if not exists reading_progress_chapter_idx on public.reading_progress(chapter_id);

create table if not exists public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  chapter_id  uuid not null references public.chapters(id) on delete cascade,
  pagina      int not null check (pagina >= 1),
  nota        text not null default '',
  criado_em   timestamptz not null default now(),
  unique (user_id, chapter_id, pagina)
);

create table if not exists public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  series_id  uuid not null references public.series(id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (user_id, series_id)
);

-- ---------- atualizado_em automático ----------
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists series_atualizado on public.series;
create trigger series_atualizado before update on public.series
  for each row execute function public.tocar_atualizado_em();

drop trigger if exists chapters_atualizado on public.chapters;
create trigger chapters_atualizado before update on public.chapters
  for each row execute function public.tocar_atualizado_em();

drop trigger if exists progress_atualizado on public.reading_progress;
create trigger progress_atualizado before update on public.reading_progress
  for each row execute function public.tocar_atualizado_em();

-- ---------- Perfil criado junto com o usuário ----------
-- O papel é SEMPRE 'leitor' aqui. O admin é promovido pelo script
-- scripts/criar-admin.mjs (ou por SQL), nunca por metadados do usuário.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nome, precisa_trocar_senha)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce((new.raw_user_meta_data ->> 'precisa_trocar_senha')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Funções de permissão (usadas pelas políticas) ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and ativo
  );
$$;

create or replace function public.pode_ler_serie(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1
    from public.series s
    join public.profiles p on p.id = auth.uid()
    where s.id = sid
      and s.publicado
      and p.ativo
      and (
        s.acesso = 'todos'
        or exists (
          select 1 from public.series_access a
          where a.series_id = s.id and a.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.pode_ler_capitulo(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.chapters c
    where c.id = cid and c.publicado and public.pode_ler_serie(c.series_id)
  );
$$;

-- ---------- RLS ----------
alter table public.profiles         enable row level security;
alter table public.series           enable row level security;
alter table public.chapters         enable row level security;
alter table public.series_access    enable row level security;
alter table public.reading_progress enable row level security;
alter table public.bookmarks        enable row level security;
alter table public.favorites        enable row level security;

-- profiles: cada um vê o próprio; só admin vê todos e altera
create policy "profiles: ver o próprio" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: admin gerencia" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- series / chapters: leitura conforme publicação e acesso; escrita só admin
create policy "series: ler permitidas" on public.series
  for select to authenticated using (public.pode_ler_serie(id));
create policy "series: admin gerencia" on public.series
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "chapters: ler permitidos" on public.chapters
  for select to authenticated using (public.pode_ler_capitulo(id));
create policy "chapters: admin gerencia" on public.chapters
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "series_access: ver o próprio" on public.series_access
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "series_access: admin gerencia" on public.series_access
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- reading_progress: o leitor só mexe no próprio, e só em capítulo que pode ler
create policy "progress: ver o próprio" on public.reading_progress
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "progress: inserir o próprio" on public.reading_progress
  for insert to authenticated
  with check (user_id = auth.uid() and public.pode_ler_capitulo(chapter_id));
create policy "progress: atualizar o próprio" on public.reading_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.pode_ler_capitulo(chapter_id));
create policy "progress: apagar o próprio" on public.reading_progress
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- bookmarks
create policy "bookmarks: ver os próprios" on public.bookmarks
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "bookmarks: inserir os próprios" on public.bookmarks
  for insert to authenticated
  with check (user_id = auth.uid() and public.pode_ler_capitulo(chapter_id));
create policy "bookmarks: atualizar os próprios" on public.bookmarks
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.pode_ler_capitulo(chapter_id));
create policy "bookmarks: apagar os próprios" on public.bookmarks
  for delete to authenticated using (user_id = auth.uid());

-- favorites
create policy "favorites: ver os próprios" on public.favorites
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "favorites: inserir os próprios" on public.favorites
  for insert to authenticated
  with check (user_id = auth.uid() and public.pode_ler_serie(series_id));
create policy "favorites: apagar os próprios" on public.favorites
  for delete to authenticated using (user_id = auth.uid());

-- ---------- Storage: bucket privado ----------
-- 50 MB é o teto por arquivo no plano Free. No Pro pode aumentar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hqs', 'hqs', false, 52428800,
  array['application/pdf', 'image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- Só o admin lê/escreve direto no bucket. Leitores recebem URLs assinadas
-- de curta duração geradas pelo servidor, depois de checar o acesso.
create policy "hqs: admin gerencia" on storage.objects
  for all to authenticated
  using (bucket_id = 'hqs' and public.is_admin())
  with check (bucket_id = 'hqs' and public.is_admin());
