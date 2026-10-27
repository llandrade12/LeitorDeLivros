# GEEK — portal privado de HQs

Next.js 16 + TypeScript + Tailwind v4 + Supabase (Auth, Postgres com RLS, Storage privado). Deploy na Vercel.

## O que tem

**Igual às telas de referência**
- Menu: Início, Biblioteca, Minhas coleções, Favoritos, Em breve, Amigos, Configurações e Sair (+ Administração para você)
- Topo: busca, **sino** com capítulos novos, **avatar com menu**; no celular, logo + sino + avatar + **☰**
- Celular: barra inferior **Início · Biblioteca · Favoritos · Amigos · Perfil**
- Capas com **autor e ★ nota média**; seção **Mais bem avaliadas** com "Ver tudo →"
- Destaque com **banner** (arte larga), autor, chamada e "Ler agora"
- Login com **Manter conectado**; **Instalar o app** (iPhone/Android/computador) e selo **Offline**
- Para usar sua arte no login, salve como `public/arte-login.jpg`

**Leitor (amigos)**
- Início com destaque, **Continuar lendo** (com % lido), favoritos e mais bem avaliadas
- **Minhas coleções** (estantes próprias), **Em breve** (anúncios com data), **Amigos** (o que cada um está lendo — dá para ocultar em Configurações)
- **Avaliação** de 1 a 5 estrelas na página da série
- **Configurações**: foto, nome, privacidade, trocar senha
- **Biblioteca** em grade com busca por título/tag, filtros *Em andamento / Não iniciadas / Concluídas* e filtro por tag
- **Página da série**: capa, sinopse, tags, status, favoritar, progresso geral e lista de capítulos com indicador lido / em leitura / não lido
- **Favoritos**
- **Leitor**: página única, dupla (estilo revista) e rolagem contínua (webtoon); setas do teclado, toque nas laterais, swipe, "ir para página", zoom, ajuste à altura/largura, tela cheia, direita→esquerda (mangá), fundo preto/escuro/claro, pré-carregamento das próximas páginas, barra de progresso clicável, **marcadores com nota**, marca d'água discreta com o nome do leitor
- Progresso salvo sozinho a cada troca de página (sincroniza entre aparelhos) e retomada exata; concluído automático na última página ou manual

**Leitura offline (dentro do app)**
- Botão **Baixar** em cada capítulo (página da HQ) e ícone ⬇ no leitor
- Menu **Baixados**: lista o que está no aparelho, abre e lê **sem internet**; ao abrir o app sem conexão, ele cai direto nessa tela
- O progresso feito offline é guardado e enviado quando a internet volta
- Cada download vale **30 dias** e renova sozinho ao abrir o app online; se você desativar o leitor ou tirar o acesso dele à HQ, o capítulo é apagado do aparelho na próxima conexão
- As páginas ficam só no armazenamento do app (com marca d'água do leitor), não como PDF solto

**Visão na tela (leitor → ⚙)**: Normal, Sépia, Noturno, P&B, Contraste, controle de brilho e fundo Papel

**Admin (você)**
- **Publicar** (botão no topo): escolha a HQ (ou crie uma nova na hora), arraste **um ou vários PDFs** — cada PDF vira um capítulo, numerado automaticamente e já publicado. Também serve para **HQ completa** (edição única)
- Na **HQ nova** dá para já enviar **capa**, **banner**, **sinopse** e escolher/criar os **heróis**
- **Heróis**: cadastre cada personagem uma vez (PNG com fundo transparente + cor do círculo) e **vincule a uma ou várias HQs** — no menu *Heróis* ou dentro de cada HQ. Aparecem no início e na página da HQ, como no mockup
- **HQs e capítulos**: criar/editar série (título, sinopse, status, tags, ordem), rascunho ou publicada, acesso para todos ou leitores escolhidos, capa automática (1ª página) ou personalizada
- Capítulos com ordenação manual, publicar/despublicar, **upload do PDF com arrastar e soltar e barra de progresso**, **substituir o PDF sem perder o progresso dos leitores**
- **Leitores**: criar (senha temporária ou convite), desativar/reativar, nova senha, excluir
- **Estatísticas**: quem está lendo o quê, em que página, concluídos e último acesso

## Como o Supabase ficou organizado

| Peça | Onde | Para quê |
|---|---|---|
| Clientes | `lib/supabase/` | `server.ts` (usuário, com RLS), `admin.ts` (chave secreta, só servidor), `client.ts` (navegador), `dados.ts` (escolhe o certo) |
| Leituras | `lib/biblioteca.ts` | monta biblioteca, série e capítulo com progresso e URLs assinadas |
| Gravações | `lib/acoes/leitor.ts`, `lib/acoes/admin-hqs.ts` | progresso, marcadores, favoritos / séries, capítulos, uploads |
| Arquivos | `lib/storage.ts` | um só lugar para **local / Cloudflare R2 / Supabase**: URLs assinadas, upload direto do navegador, limpeza |
| Modo local | `lib/local/` | banco JSON, login, regras de acesso (como o RLS) e contas de teste |
| Banco | `supabase/migrations/` | `0001` (tabelas + RLS + bucket), `0002` (páginas em imagem + último acesso), `0003` (autor, banner, em breve, avaliações, coleções, avatar, amigos) |
| Social | `lib/colecoes.ts`, `lib/amigos.ts`, `lib/acoes/perfil.ts` | coleções, amigos (função `listar_amigos` no banco), perfil e avatar |

**O PDF não vai para o servidor.** Quando você envia um capítulo, o seu navegador converte cada página em imagem WebP (~0,3–1,5 MB) e envia só as imagens para o bucket privado:

```
hqs/
  capas/<serie>/capa-123.jpg
  capitulos/<capitulo>/v1/0001.webp, 0002.webp…
  capitulos/<capitulo>/v2/…          ← ao substituir o PDF (a v1 é apagada no fim)
```

Vantagens: cabe no plano grátis (limite de 50 MB é por arquivo, e cada página é pequena), o leitor fica leve no celular, e cada página tem URL assinada que expira em 15 min (o leitor renova sozinho).

> **Aviso honesto:** URLs que expiram, bloqueio do botão direito e a marca d'água desencorajam e identificam vazamentos, mas quem consegue ler sempre consegue tirar print.

---

## Atualizar o banco (se você já rodou o 0001)

No Supabase → **SQL Editor** → **New query**, rode **um de cada vez, nesta ordem**:
1. `supabase/migrations/0002_paginas_e_acesso.sql` → **Run**
2. `supabase/migrations/0003_social_e_design.sql` → **Run**
3. `supabase/migrations/0004_personagens.sql` → **Run**
4. `supabase/migrations/0005_herois_vinculados.sql` → **Run**

Cada um deve mostrar *Success*. Projeto novo? Rode `0001` a `0005`, em ordem.

> **Depois de baixar uma versão nova, rode sempre `npm install`.** Ele copia o leitor de PDF para `public/pdfjs/`; sem isso a publicação falha.

## Teste local (sem Supabase, sem R2)

Tudo roda no seu computador: login, banco e páginas ficam na pasta `.dados-locais/` do projeto.

```bash
cd ~/Documentos/PROJETOS/MEU\ APPS/hq-portal
echo "MODO_LOCAL=1" > .env.local     # substitui o .env.local (guarde as chaves do Supabase antes, se quiser)
npm install
npm run dev                          # http://localhost:3000
```

Na tela de login aparecem as contas de teste:

| Perfil | E-mail | Senha |
|---|---|---|
| Admin | `admin@local.test` | `Admin123` |
| Leitor | `leitor@local.test` | `Leitor123` |

- Já vem uma HQ de demonstração ("O Último Sentinela", 2 capítulos, 4 heróis) e um anúncio em *Em breve*. Se você já tinha rodado antes, use `npm run local:resetar` para ver os heróis da demo.
- Você pode enviar PDFs de verdade em *HQs e capítulos*; as páginas vão para `.dados-locais/arquivos/`.
- Convites e "esqueci minha senha" **não mandam e-mail**: o link aparece no **terminal** onde roda o `npm run dev` (procure 📧).
- Para recomeçar do zero: `npm run local:resetar` e depois `npm run dev`.
- A Vercel ignora o `MODO_LOCAL`, mesmo que alguém coloque lá.

## Produção: Supabase (login + banco) + Cloudflare R2 (páginas)

### 1. Cloudflare R2
1. Entre em **dash.cloudflare.com** → menu **R2 Object Storage** → ative (pede cartão, mas o uso até 10 GB é grátis).
2. **Create bucket** → nome `hqs` → *Location: Automatic* → **Create**. Deixe **privado** (não ative "Public access").
3. No bucket → **Settings** → **CORS Policy** → **Add CORS policy** → cole (troque a URL do site):
```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://SEU-SITE.vercel.app"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```
4. Volte em **R2 Object Storage** → **Manage API tokens** (ou *API → Manage API Tokens*) → **Create API token** → permissão **Object Read & Write** → *Specify bucket*: `hqs` → **Create**.
5. Anote: **Access Key ID**, **Secret Access Key** e o **Account ID** (aparece na página do R2 e no endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).

### 2. Variáveis (`.env.local` para testar com a nuvem, e na Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=hqs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_NOME_PORTAL=GEEK
```
Com as 4 variáveis `R2_*`, as páginas, capas, banners e fotos vão para o R2. Sem elas, o portal usa o Storage do Supabase (limite de 1 GB no plano grátis).

## Roteiro de teste

1. **Publicar**: botão *Publicar* no topo → *HQ nova* → título → arraste 2 ou 3 PDFs → *Publicar*. Cada um vira Cap. 1, 2, 3… já publicados.
2. **Mais capítulos**: *Publicar* → *HQ que já existe* → escolha a HQ → arraste o PDF (o número continua sozinho).
3. **Heróis**: menu *Heróis* → novo herói (nome, cor, PNG) → marque as HQs. Ou dentro da HQ, toque em *Nesta HQ* nos heróis já cadastrados.
4. **HQ nova completa**: *Publicar* → *HQ nova* → título, sinopse, capa, banner, heróis → arraste os PDFs → *Publicar*.
4. **Biblioteca**: *Início* e *Biblioteca* mostram a capa. Teste busca, filtros e tags.
5. **Leitor**: abra o capítulo → troque modos em ⚙, use setas, clique nas laterais, zoom, tela cheia, direita→esquerda.
6. **Progresso**: vá até a página 5, volte para o início → aparece em *Continuar lendo* com a %. Reabra → volta na página 5. Vá até a última → capítulo fica ✓ lido.
7. **Marcadores**: toque no marcador no topo → escreva uma nota no painel → a marquinha amarela aparece na barra.
8. **Substituir PDF**: na tela da HQ, arraste outro PDF no mesmo capítulo → o progresso continua.
9. **Acesso restrito**: na HQ, *Só os escolhidos* → marque um leitor → salve. Quem não foi marcado não vê a HQ.
10. **Estatísticas**: depois de ler um pouco, abra *Estatísticas*.
11. **Avaliação e coleções**: na série, dê estrelas e use *Adicionar à coleção*; confira em *Minhas coleções* e a nota nas capas.
12. **Em breve**: numa HQ ainda não publicada, ligue *Mostrar em "Em breve"* e escolha a data.
13. **Banner**: na edição da HQ, *Enviar banner* (arte larga) → aparece no destaque do início.
14. **Sino**: publique um capítulo → o número aparece no sino.
15. **Configurações**: troque foto e nome; desligue "Mostrar minha leitura" e veja que some de *Amigos* para os outros.
16. **Offline**: na página da HQ, *Baixar* num capítulo → menu *Baixados* → abra e leia. Para simular sem internet: DevTools (F12) → aba *Network* → *Offline* → recarregue. Teste mais fiel: `npm run build && npm start`.
16b. **Visão na tela**: no leitor, ⚙ → *Visão na tela* (Sépia, Noturno…) e *Brilho*.
16c. **Instalar**: no celular, menu do avatar → *Instalar o app* (o botão de instalar só funciona no site publicado com https).
17. **Como leitor**: saia e entre com `leitor@local.test` (ou crie um leitor em *Leitores* e use a senha temporária numa janela anônima).

## Primeiro admin (produção)

Supabase → **Authentication → Users → Add user → Create new user** (marque *Auto Confirm User*). Depois, no SQL Editor:
```sql
update public.profiles
set role = 'admin', nome = 'Seu Nome', ativo = true, precisa_trocar_senha = false
where id = (select id from auth.users where lower(email) = lower('seu@email.com'));
```
Ou: `npm run criar-admin -- seu@email.com "Seu Nome" "SenhaForte1"`.

## Deploy na Vercel

1. Suba para um repositório **privado** no GitHub (`git init && git add . && git commit -m "portal" && gh repo create hq-portal --private --source=. --push`). Confira com `git status` que nenhum `.env` foi incluído.
2. vercel.com → **Add New → Project** → importe o repositório.
3. **Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `NEXT_PUBLIC_SITE_URL` (a URL da Vercel), `NEXT_PUBLIC_NOME_PORTAL`. **Não** coloque `MODO_LOCAL`.
4. **Deploy**.
5. Supabase → **Authentication → URL Configuration**: Site URL = URL da Vercel; Redirect URLs += `https://SUA-URL.vercel.app/**`.
6. Atualizações: `git add . && git commit -m "..." && git push` — a Vercel publica sozinha.

## E-mail (opcional)

Para convites e "esqueci minha senha" chegarem aos amigos, configure um SMTP (Resend ou o e-mail da HostGator) em **Authentication → Emails → SMTP Settings** e troque os modelos:
- *Invite user*: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/primeiro-acesso">Criar minha senha</a>`
- *Reset password*: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha">Criar nova senha</a>`

Sem SMTP: crie leitores com **senha temporária** e mande pelo WhatsApp.
