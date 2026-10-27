-- =====================================================================
-- Portal de HQs — autor, banner, "em breve", avaliações, coleções,
-- avatar e amigos. Rode no SQL Editor depois do 0001 e do 0002.
-- Pode rodar mais de uma vez.
-- =====================================================================

-- ---------- Novas colunas ----------
alter table public.series
  add column if not exists autor        text not null default '',
  add column if not exists chamada      text not null default '',   -- frase curta do destaque
  add column if not exists banner_path  text,                       -- arte larga do destaque
  add column if not exists em_breve     boolean not null default false,
  add column if not exists lancamento_em date;

alter table public.chapters
  add column if not exists publicado_em timestamptz;
update public.chapters set publicado_em = atualizado_em where publicado and publicado_em is null;

alter table public.profiles
  add column if not exists avatar_path          text,
  add column if not exists compartilhar_leitura boolean not null default true;

-- ---------- "Em breve": leitores veem a vitrine, mas não leem ----------
create or replace function public.pode_ver_em_breve(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.series s
    join public.profiles p on p.id = auth.uid()
    where s.id = sid and s.em_breve and not s.publicado and p.ativo
      and (
        s.acesso = 'todos'
        or exists (select 1 from public.series_access a where a.series_id = s.id and a.user_id = auth.uid())
      )
  );
$$;

drop policy if exists "series: ver em breve" on public.series;
create policy "series: ver em breve" on public.series
  for select to authenticated using (public.pode_ver_em_breve(id));

-- ---------- Avaliações (1 a 5 estrelas) ----------
create table if not exists public.ratings (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  series_id      uuid not null references public.series(id) on delete cascade,
  nota           smallint not null check (nota between 1 and 5),
  atualizado_em  timestamptz not null default now(),
  primary key (user_id, series_id)
);
alter table public.ratings enable row level security;

drop policy if exists "ratings: ver"        on public.ratings;
drop policy if exists "ratings: inserir"    on public.ratings;
drop policy if exists "ratings: atualizar"  on public.ratings;
drop policy if exists "ratings: apagar"     on public.ratings;
create policy "ratings: ver" on public.ratings
  for select to authenticated using (public.pode_ler_serie(series_id));
create policy "ratings: inserir" on public.ratings
  for insert to authenticated with check (user_id = auth.uid() and public.pode_ler_serie(series_id));
create policy "ratings: atualizar" on public.ratings
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.pode_ler_serie(series_id));
create policy "ratings: apagar" on public.ratings
  for delete to authenticated using (user_id = auth.uid());

-- ---------- Coleções do leitor ----------
create table if not exists public.colecoes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  nome       text not null check (char_length(nome) between 1 and 60),
  criado_em  timestamptz not null default now()
);
create index if not exists colecoes_user_idx on public.colecoes(user_id, criado_em);

create table if not exists public.colecao_itens (
  colecao_id     uuid not null references public.colecoes(id) on delete cascade,
  series_id      uuid not null references public.series(id) on delete cascade,
  adicionado_em  timestamptz not null default now(),
  primary key (colecao_id, series_id)
);

create or replace function public.dono_da_colecao(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.colecoes where id = cid and user_id = auth.uid());
$$;

alter table public.colecoes      enable row level security;
alter table public.colecao_itens enable row level security;

drop policy if exists "colecoes: dono"       on public.colecoes;
drop policy if exists "itens: ver"           on public.colecao_itens;
drop policy if exists "itens: inserir"       on public.colecao_itens;
drop policy if exists "itens: apagar"        on public.colecao_itens;
create policy "colecoes: dono" on public.colecoes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "itens: ver" on public.colecao_itens
  for select to authenticated using (public.dono_da_colecao(colecao_id));
create policy "itens: inserir" on public.colecao_itens
  for insert to authenticated with check (public.dono_da_colecao(colecao_id) and public.pode_ler_serie(series_id));
create policy "itens: apagar" on public.colecao_itens
  for delete to authenticated using (public.dono_da_colecao(colecao_id));

-- ---------- Amigos: o que os outros leitores estão lendo ----------
-- Só aparece quem deixou "compartilhar minha leitura" ligado, e só HQs
-- que VOCÊ também pode ler (ninguém descobre títulos restritos).
create or replace function public.listar_amigos()
returns table (
  id               uuid,
  nome             text,
  avatar_path      text,
  ultimo_acesso    timestamptz,
  concluidos       bigint,
  serie_titulo     text,
  serie_slug       text,
  capitulo_id      uuid,
  capitulo_numero  text,
  capitulo_titulo  text,
  pagina           int,
  total            int,
  terminou         boolean,
  lido_em          timestamptz
)
language sql stable security definer set search_path = '' as $$
  select
    p.id, p.nome, p.avatar_path, p.ultimo_acesso,
    (
      select count(*) from public.reading_progress r
      join public.chapters c on c.id = r.chapter_id
      where r.user_id = p.id and r.concluido and c.publicado and public.pode_ler_serie(c.series_id)
    ),
    u.serie_titulo, u.serie_slug, u.chapter_id, u.numero, u.titulo,
    u.ultima_pagina, u.total_paginas, u.concluido, u.atualizado_em
  from public.profiles p
  left join lateral (
    select s.titulo as serie_titulo, s.slug as serie_slug, r.chapter_id, c.numero, c.titulo,
           r.ultima_pagina, c.total_paginas, r.concluido, r.atualizado_em
    from public.reading_progress r
    join public.chapters c on c.id = r.chapter_id
    join public.series s on s.id = c.series_id
    where r.user_id = p.id and c.publicado and public.pode_ler_serie(s.id)
    order by r.atualizado_em desc
    limit 1
  ) u on true
  where p.ativo
    and p.compartilhar_leitura
    and p.id <> auth.uid()
    and exists (select 1 from public.profiles eu where eu.id = auth.uid() and eu.ativo)
  order by u.atualizado_em desc nulls last, p.nome;
$$;

revoke all on function public.listar_amigos() from public, anon;
grant execute on function public.listar_amigos() to authenticated;
