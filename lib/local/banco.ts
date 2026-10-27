import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Linha = Record<string, any>;

export type Usuario = {
  id: string;
  email: string;
  senha_hash: string | null;
  criado_em: string;
  last_sign_in_at: string | null;
  invited_at: string | null;
  email_confirmed_at: string | null;
  banido: boolean;
  user_metadata: Record<string, unknown>;
};

export type Banco = {
  versao: number;
  segredo: string;
  tabelas: Record<string, Linha[]>;
  usuarios: Usuario[];
  sessoes: { token: string; user_id: string; criado_em: string }[];
  tokens: { hash: string; user_id: string; tipo: string; expira: number }[];
};

export const PASTA = join(process.cwd(), ".dados-locais");
export const PASTA_ARQUIVOS = join(PASTA, "arquivos");
const ARQ = join(PASTA, "banco.json");

export const agora = () => new Date().toISOString();

const PADROES: Record<string, Record<string, () => unknown>> = {
  profiles: {
    nome: () => "",
    role: () => "leitor",
    ativo: () => true,
    precisa_trocar_senha: () => false,
    criado_em: agora,
    ultimo_acesso: () => null,
    avatar_path: () => null,
    compartilhar_leitura: () => true,
  },
  series: {
    id: randomUUID,
    sinopse: () => "",
    capa_path: () => null,
    status: () => "em_andamento",
    tags: () => [],
    publicado: () => false,
    acesso: () => "todos",
    autor: () => "",
    chamada: () => "",
    banner_path: () => null,
    em_breve: () => false,
    lancamento_em: () => null,
    ordem: () => 0,
    criado_em: agora,
    atualizado_em: agora,
  },
  chapters: {
    id: randomUUID,
    numero: () => "",
    titulo: () => "",
    ordem: () => 0,
    pdf_path: () => null,
    paginas_path: () => null,
    paginas_ext: () => "webp",
    total_paginas: () => 0,
    versao: () => 1,
    capa_path: () => null,
    publicado: () => false,
    publicado_em: () => null,
    criado_em: agora,
    atualizado_em: agora,
  },
  series_access: {},
  reading_progress: { ultima_pagina: () => 1, concluido: () => false, concluido_em: () => null, atualizado_em: agora },
  bookmarks: { id: randomUUID, nota: () => "", criado_em: agora },
  favorites: { criado_em: agora },
  ratings: { atualizado_em: agora },
  colecoes: { id: randomUUID, criado_em: agora },
  colecao_itens: { adicionado_em: agora },
  personagens: { id: randomUUID, series_id: () => null, nome: () => "", imagem_path: () => null, cor: () => "#4d83f4", ordem: () => 0, criado_em: agora },
  personagens_series: {},
};

/** Chave usada para unicidade e para o upsert sem onConflict */
export const CHAVES: Record<string, string[]> = {
  profiles: ["id"],
  series: ["id"],
  chapters: ["id"],
  series_access: ["series_id", "user_id"],
  reading_progress: ["user_id", "chapter_id"],
  bookmarks: ["user_id", "chapter_id", "pagina"],
  favorites: ["user_id", "series_id"],
  ratings: ["user_id", "series_id"],
  colecoes: ["id"],
  colecao_itens: ["colecao_id", "series_id"],
  personagens: ["id"],
  personagens_series: ["personagem_id", "series_id"],
};

export const UNICOS: Record<string, string[][]> = { series: [["slug"]], bookmarks: [["id"]] };

export const TOCA_ATUALIZADO = new Set(["series", "chapters", "reading_progress"]);

/** Relações para os "embeds" do select: tabela → nome → [tabela alvo, coluna FK] */
export const RELACOES: Record<string, Record<string, [string, string]>> = {
  chapters: { series: ["series", "series_id"] },
  reading_progress: { chapters: ["chapters", "chapter_id"] },
  favorites: { series: ["series", "series_id"] },
};

/** on delete cascade: pai → [tabela filha, coluna que aponta para pai.id] */
const CASCATA: Record<string, [string, string][]> = {
  series: [
    ["chapters", "series_id"],
    ["series_access", "series_id"],
    ["favorites", "series_id"],
    ["ratings", "series_id"],
    ["colecao_itens", "series_id"],
    ["personagens_series", "series_id"],
  ],
  chapters: [
    ["reading_progress", "chapter_id"],
    ["bookmarks", "chapter_id"],
  ],
  profiles: [
    ["series_access", "user_id"],
    ["reading_progress", "user_id"],
    ["bookmarks", "user_id"],
    ["favorites", "user_id"],
    ["ratings", "user_id"],
    ["colecoes", "user_id"],
  ],
  colecoes: [["colecao_itens", "colecao_id"]],
  personagens: [["personagens_series", "personagem_id"]],
};

export function comPadroes(tabela: string, linha: Linha): Linha {
  const padroes = PADROES[tabela] ?? {};
  const nova: Linha = {};
  for (const [k, f] of Object.entries(padroes)) nova[k] = f();
  return { ...nova, ...linha };
}

/** Banco antigo (sem tabelas novas) continua funcionando */
function completar(b: Banco) {
  for (const t of Object.keys(CHAVES)) b.tabelas[t] ??= [];
  // heróis antigos (de uma HQ só) viram vínculos
  for (const p of b.tabelas.personagens) {
    if (p.series_id && !b.tabelas.personagens_series.some((v) => v.personagem_id === p.id && v.series_id === p.series_id)) {
      b.tabelas.personagens_series.push({ personagem_id: p.id, series_id: p.series_id });
    }
  }
  return b;
}

export function apagarLinhas(b: Banco, tabela: string, alvo: (l: Linha) => boolean) {
  const lista = b.tabelas[tabela] ?? [];
  const sai = lista.filter(alvo);
  b.tabelas[tabela] = lista.filter((l) => !alvo(l));
  for (const linha of sai) {
    for (const [filha, fk] of CASCATA[tabela] ?? []) apagarLinhas(b, filha, (f) => f[fk] === linha.id);
  }
  return sai.length;
}

export function hashSenha(senha: string, sal = randomBytes(8).toString("hex")) {
  return `${sal}:${createHash("sha256").update(sal + senha).digest("hex")}`;
}
export function conferirSenha(senha: string, hash: string | null) {
  if (!hash) return false;
  const [sal] = hash.split(":");
  return hashSenha(senha, sal) === hash;
}

// ---------- leitura / gravação ----------
let cache: { mtime: number; banco: Banco } | null = null;

export function lerBanco(): Banco {
  if (!existsSync(ARQ)) {
    const b = semear();
    salvarBanco(b);
    return b;
  }
  const mtime = statSync(ARQ).mtimeMs;
  if (cache && cache.mtime === mtime) return cache.banco;
  const banco = completar(JSON.parse(readFileSync(ARQ, "utf8")) as Banco);
  cache = { mtime, banco };
  return banco;
}

export function salvarBanco(b: Banco) {
  mkdirSync(PASTA, { recursive: true });
  writeFileSync(ARQ, JSON.stringify(b, null, 1));
  cache = { mtime: statSync(ARQ).mtimeMs, banco: b };
}

// ---------- dados de exemplo ----------
export const CONTAS_TESTE = [
  { email: "admin@local.test", senha: "Admin123", nome: "Admin Teste", role: "admin" },
  { email: "leitor@local.test", senha: "Leitor123", nome: "Leitor Teste", role: "leitor" },
] as const;

function escreverArquivo(caminho: string, conteudo: string) {
  const destino = join(PASTA_ARQUIVOS, caminho);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, conteudo);
}

const CORES = ["#4d83f4", "#a855f7", "#f05252", "#f6ad3b", "#31c48d", "#0ea5e9"];

function svgPagina(titulo: string, cap: string, n: number, total: number, capa = false) {
  const c1 = CORES[n % CORES.length];
  const c2 = CORES[(n + 2) % CORES.length];
  if (capa) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0c0c13"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs>
<rect width="800" height="1200" fill="url(#g)"/><circle cx="600" cy="300" r="190" fill="#e23a3a" opacity=".85"/>
<path d="M0 1200 L0 820 L140 760 L220 840 L330 700 L470 800 L580 690 L800 780 L800 1200Z" fill="#0c0c13"/>
<text x="60" y="1000" font-family="Arial Black,Arial,sans-serif" font-size="78" font-weight="900" fill="#fff">${titulo.toUpperCase()}</text>
<text x="62" y="1060" font-family="Arial,sans-serif" font-size="34" fill="#e5e7eb">${cap}</text></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
<rect width="800" height="1200" fill="#f8f6f0"/>
<g stroke="#111" stroke-width="8" fill="none">
<rect x="40" y="40" width="720" height="420" fill="${c1}" fill-opacity=".18"/>
<rect x="40" y="490" width="345" height="320" fill="${c2}" fill-opacity=".2"/>
<rect x="415" y="490" width="345" height="320" fill="${c1}" fill-opacity=".12"/>
<rect x="40" y="840" width="720" height="320" fill="${c2}" fill-opacity=".14"/></g>
<ellipse cx="400" cy="250" rx="230" ry="120" fill="#fff" stroke="#111" stroke-width="5"/>
<text x="400" y="235" text-anchor="middle" font-family="Arial,sans-serif" font-size="40" font-weight="700" fill="#111">${titulo}</text>
<text x="400" y="290" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" fill="#333">${cap} — página ${n} de ${total}</text>
<text x="212" y="660" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="90" fill="#111">POW!</text>
<text x="588" y="665" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" fill="#111">quadro ${n}.2</text>
<text x="400" y="1010" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" fill="#111">Página de demonstração · modo local</text>
<text x="740" y="1185" text-anchor="end" font-family="Arial,sans-serif" font-size="24" fill="#555">${n}</text></svg>`;
}

/** Herói estilizado com fundo transparente (para a seção "Heróis") */
function svgHeroi(cor: string, capa: string, pose: number) {
  const bracos =
    pose % 2 === 0
      ? `<path d="M150 250 L80 150 L100 135 L175 225Z" fill="${cor}"/><path d="M250 250 L320 150 L300 135 L225 225Z" fill="${cor}"/>
<circle cx="88" cy="140" r="20" fill="#f1c7a3"/><circle cx="312" cy="140" r="20" fill="#f1c7a3"/>`
      : `<path d="M150 250 L95 340 L118 352 L172 270Z" fill="${cor}"/><path d="M250 240 L330 175 L345 195 L262 262Z" fill="${cor}"/>
<circle cx="106" cy="350" r="20" fill="#f1c7a3"/><circle cx="342" cy="180" r="22" fill="#f1c7a3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
<path d="M140 210 Q200 190 260 210 L320 560 Q200 520 80 560Z" fill="${capa}"/>
${bracos}
<path d="M148 210 Q200 196 252 210 L262 380 L138 380Z" fill="${cor}"/>
<path d="M175 260 L200 240 L225 260 L200 300Z" fill="#ffe14d" stroke="#111" stroke-width="4"/>
<rect x="138" y="372" width="124" height="22" fill="#111"/>
<path d="M140 392 L160 590 L195 590 L200 430 L205 590 L240 590 L260 392Z" fill="${capa}"/>
<circle cx="200" cy="150" r="58" fill="#f1c7a3"/>
<path d="M142 140 Q200 70 258 140 L258 118 Q200 60 142 118Z" fill="#1b1b28"/>
<path d="M150 145 L250 145 L244 168 L156 168Z" fill="#111"/>
<circle cx="178" cy="156" r="7" fill="#fff"/><circle cx="222" cy="156" r="7" fill="#fff"/>
<path d="M182 188 Q200 200 218 188" stroke="#7a3b2a" stroke-width="5" fill="none" stroke-linecap="round"/>
</svg>`;
}

function semear(): Banco {
  const b: Banco = {
    versao: 1,
    segredo: randomBytes(24).toString("hex"),
    tabelas: Object.fromEntries(Object.keys(CHAVES).map((t) => [t, []])),
    usuarios: [],
    sessoes: [],
    tokens: [],
  };

  for (const c of CONTAS_TESTE) {
    const id = randomUUID();
    b.usuarios.push({
      id,
      email: c.email,
      senha_hash: hashSenha(c.senha),
      criado_em: agora(),
      last_sign_in_at: null,
      invited_at: null,
      email_confirmed_at: agora(),
      banido: false,
      user_metadata: { nome: c.nome },
    });
    b.tabelas.profiles.push(comPadroes("profiles", { id, nome: c.nome, role: c.role }));
  }

  // HQ de demonstração com 2 capítulos publicados
  const serie = comPadroes("series", {
    titulo: "O Último Sentinela",
    slug: "o-ultimo-sentinela",
    autor: "Você (demonstração)",
    chamada: "Num mundo à beira do fim, um herói ainda luta pelo que restou.",
    sinopse:
      "HQ de demonstração criada pelo modo local para você testar a biblioteca, o leitor, o progresso e os marcadores. Envie seus próprios PDFs em HQs e capítulos.",
    tags: ["ação", "demo"],
    publicado: true,
  });
  b.tabelas.series.push(serie);
  [
    { numero: "1", titulo: "O começo", paginas: 10 },
    { numero: "2", titulo: "A queda", paginas: 8 },
  ].forEach((cap, i) => {
    const capitulo = comPadroes("chapters", {
      series_id: serie.id,
      numero: cap.numero,
      titulo: cap.titulo,
      ordem: i + 1,
      paginas_ext: "svg",
      total_paginas: cap.paginas,
      publicado: true,
      publicado_em: agora(),
    });
    const pasta = `capitulos/${capitulo.id}/v1`;
    for (let n = 1; n <= cap.paginas; n++) {
      escreverArquivo(
        `${pasta}/${String(n).padStart(4, "0")}.svg`,
        svgPagina(serie.titulo, `Cap. ${cap.numero}`, n, cap.paginas, n === 1),
      );
    }
    capitulo.paginas_path = pasta;
    capitulo.capa_path = `${pasta}/0001.svg`;
    b.tabelas.chapters.push(capitulo);
  });

  // Heróis da HQ de demonstração
  [
    ["Sentinela", "#4d83f4", "#1f2a6b"],
    ["Rubra", "#f05252", "#5c1414"],
    ["Vespa", "#a855f7", "#2e1065"],
    ["Brasa", "#f6ad3b", "#7c2d12"],
  ].forEach(([nome, cor, capa], i) => {
    const circulo = ["#f6ad3b", "#31c48d", "#ec4899", "#4d83f4"][i];
    const p = comPadroes("personagens", { nome, cor: circulo, ordem: i + 1 });
    p.imagem_path = `personagens/${p.id}.svg`;
    escreverArquivo(p.imagem_path, svgHeroi(cor, capa, i));
    b.tabelas.personagens.push(p);
    b.tabelas.personagens_series.push({ personagem_id: p.id, series_id: serie.id });
  });

  // Uma HQ "em breve"
  const breve = comPadroes("series", {
    titulo: "Caminhos Sombrios",
    slug: "caminhos-sombrios",
    autor: "Você (demonstração)",
    chamada: "Em breve no GEEK.",
    sinopse: "Exemplo de anúncio na tela Em breve.",
    em_breve: true,
    lancamento_em: new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10),
    capa_path: "capas/demo/caminhos.svg",
  });
  escreverArquivo("capas/demo/caminhos.svg", svgPagina("Caminhos Sombrios", "Em breve", 3, 1, true));
  b.tabelas.series.push(breve);

  return b;
}
