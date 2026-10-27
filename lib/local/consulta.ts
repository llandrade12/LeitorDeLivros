import "server-only";
import {
  agora,
  apagarLinhas,
  CHAVES,
  comPadroes,
  lerBanco,
  RELACOES,
  salvarBanco,
  TOCA_ATUALIZADO,
  UNICOS,
  type Banco,
  type Linha,
} from "./banco";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Quem está consultando. bypass = cliente "admin" (chave secreta). */
export type Contexto = { userId: string | null; bypass: boolean };

type Erro = { message: string; code?: string };
type Resultado = { data: any; error: Erro | null; count: number | null; status: number };
type Filtro = { col: string; op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in"; val: any };
type Campo = { nome: string } | { rel: string; inner: boolean; sub: Campo[] };

// ---------- "RLS" ----------
function perfil(b: Banco, id: string | null) {
  return id ? b.tabelas.profiles.find((p) => p.id === id) : undefined;
}
function ehAdmin(b: Banco, ctx: Contexto) {
  if (ctx.bypass) return true;
  const p = perfil(b, ctx.userId);
  return Boolean(p && p.role === "admin" && p.ativo);
}
function temAcesso(b: Banco, s: Linha, uid: string | null) {
  return s.acesso === "todos" || b.tabelas.series_access.some((a) => a.series_id === s.id && a.user_id === uid);
}
export function podeLerSerie(b: Banco, ctx: Contexto, sid: string) {
  if (ehAdmin(b, ctx)) return true;
  const s = b.tabelas.series.find((x) => x.id === sid);
  const p = perfil(b, ctx.userId);
  return Boolean(s && p?.ativo && s.publicado && temAcesso(b, s, ctx.userId));
}
function podeVerEmBreve(b: Banco, ctx: Contexto, sid: string) {
  const s = b.tabelas.series.find((x) => x.id === sid);
  const p = perfil(b, ctx.userId);
  return Boolean(s && p?.ativo && s.em_breve && !s.publicado && temAcesso(b, s, ctx.userId));
}
export function podeLerCapitulo(b: Banco, ctx: Contexto, cid: string) {
  if (ehAdmin(b, ctx)) return true;
  const c = b.tabelas.chapters.find((x) => x.id === cid);
  return Boolean(c && c.publicado && podeLerSerie(b, ctx, c.series_id));
}

function visivel(b: Banco, ctx: Contexto, tabela: string, l: Linha): boolean {
  if (ehAdmin(b, ctx)) return true;
  const uid = ctx.userId;
  if (!uid) return false;
  switch (tabela) {
    case "profiles":
      return l.id === uid;
    case "series":
      return podeLerSerie(b, ctx, l.id) || podeVerEmBreve(b, ctx, l.id);
    case "chapters":
      return podeLerCapitulo(b, ctx, l.id);
    case "ratings":
    case "personagens_series":
      return podeLerSerie(b, ctx, l.series_id);
    case "personagens":
      return b.tabelas.personagens_series.some((v) => v.personagem_id === l.id && podeLerSerie(b, ctx, v.series_id));
    case "colecoes":
      return l.user_id === uid;
    case "colecao_itens":
      return b.tabelas.colecoes.some((c) => c.id === l.colecao_id && c.user_id === uid);
    default:
      return l.user_id === uid;
  }
}

const SO_ADMIN = new Set(["profiles", "series", "chapters", "series_access", "personagens", "personagens_series"]);

function podeGravar(b: Banco, ctx: Contexto, tabela: string, l: Linha): boolean {
  if (ehAdmin(b, ctx)) return true;
  const uid = ctx.userId;
  if (!uid || SO_ADMIN.has(tabela)) return false;
  if (tabela === "colecao_itens") return b.tabelas.colecoes.some((c) => c.id === l.colecao_id && c.user_id === uid);
  if (l.user_id !== uid) return false;
  if (l.chapter_id && !podeLerCapitulo(b, ctx, l.chapter_id)) return false;
  if (l.series_id && tabela !== "colecoes" && !podeLerSerie(b, ctx, l.series_id)) return false;
  return true;
}

// ---------- select ----------
function dividir(s: string) {
  const partes: string[] = [];
  let nivel = 0;
  let atual = "";
  for (const ch of s) {
    if (ch === "(") nivel++;
    if (ch === ")") nivel--;
    if (ch === "," && nivel === 0) {
      partes.push(atual);
      atual = "";
    } else atual += ch;
  }
  if (atual.trim()) partes.push(atual);
  return partes.map((p) => p.trim()).filter(Boolean);
}

function analisar(s: string): Campo[] {
  return dividir(s).map((p) => {
    const m = p.match(/^(\w+)(!inner)?\((.*)\)$/s);
    if (m) return { rel: m[1], inner: Boolean(m[2]), sub: analisar(m[3]) };
    return { nome: p };
  });
}

function projetar(b: Banco, ctx: Contexto, tabela: string, l: Linha, campos: Campo[]): Linha | null {
  const saida: Linha = {};
  const todos = campos.some((c) => "nome" in c && c.nome === "*");
  if (todos) Object.assign(saida, structuredClone(l));
  for (const c of campos) {
    if ("nome" in c) {
      if (c.nome !== "*") saida[c.nome] = l[c.nome] ?? null;
      continue;
    }
    const rel = RELACOES[tabela]?.[c.rel];
    if (!rel) continue;
    const [alvo, fk] = rel;
    const linhaAlvo = b.tabelas[alvo]?.find((x) => x.id === l[fk] && visivel(b, ctx, alvo, x));
    const emb = linhaAlvo ? projetar(b, ctx, alvo, linhaAlvo, c.sub) : null;
    if (!emb && c.inner) return null;
    saida[c.rel] = emb;
  }
  return saida;
}

function valor(l: Linha, caminho: string) {
  return caminho.split(".").reduce<any>((v, k) => (v == null ? undefined : v[k]), l);
}

function passa(l: Linha, f: Filtro) {
  const v = valor(l, f.col);
  switch (f.op) {
    case "eq":
      return v === f.val;
    case "neq":
      return v !== f.val;
    case "gt":
      return v != null && v > f.val;
    case "gte":
      return v != null && v >= f.val;
    case "lt":
      return v != null && v < f.val;
    case "lte":
      return v != null && v <= f.val;
    case "in":
      return (f.val as unknown[]).includes(v);
  }
}

function comparar(a: any, b: any, asc: boolean) {
  if (a == null && b == null) return 0;
  if (a == null) return asc ? 1 : -1; // asc: nulls por último; desc: primeiro
  if (b == null) return asc ? -1 : 1;
  const r = typeof a === "string" ? a.localeCompare(b, "pt-BR") : a < b ? -1 : a > b ? 1 : 0;
  return asc ? r : -r;
}

// ---------- construtor ----------
export class Consulta implements PromiseLike<Resultado> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private colunas = "*";
  private filtros: Filtro[] = [];
  private ordens: { col: string; asc: boolean }[] = [];
  private limite: number | null = null;
  private modo: "lista" | "single" | "maybe" = "lista";
  private carga: Linha | Linha[] | null = null;
  private conflito: string[] | null = null;
  private retorna = false;
  private contar = false;
  private cabeca = false;

  constructor(
    private tabela: string,
    private ctx: Contexto,
  ) {}

  select(colunas = "*", opcoes?: { count?: string; head?: boolean }) {
    this.colunas = colunas;
    if (this.op !== "select") this.retorna = true;
    if (opcoes?.count) this.contar = true;
    if (opcoes?.head) this.cabeca = true;
    return this;
  }
  insert(carga: Linha | Linha[]) {
    this.op = "insert";
    this.carga = carga;
    return this;
  }
  update(carga: Linha) {
    this.op = "update";
    this.carga = carga;
    return this;
  }
  upsert(carga: Linha | Linha[], opcoes?: { onConflict?: string }) {
    this.op = "upsert";
    this.carga = carga;
    this.conflito = opcoes?.onConflict ? opcoes.onConflict.split(",").map((s) => s.trim()) : null;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  private filtro(col: string, op: Filtro["op"], val: any) {
    this.filtros.push({ col, op, val });
    return this;
  }
  eq(c: string, v: any) {
    return this.filtro(c, "eq", v);
  }
  neq(c: string, v: any) {
    return this.filtro(c, "neq", v);
  }
  gt(c: string, v: any) {
    return this.filtro(c, "gt", v);
  }
  gte(c: string, v: any) {
    return this.filtro(c, "gte", v);
  }
  lt(c: string, v: any) {
    return this.filtro(c, "lt", v);
  }
  lte(c: string, v: any) {
    return this.filtro(c, "lte", v);
  }
  in(c: string, v: any[]) {
    return this.filtro(c, "in", v);
  }
  order(col: string, opcoes?: { ascending?: boolean }) {
    this.ordens.push({ col, asc: opcoes?.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.limite = n;
    return this;
  }
  single() {
    this.modo = "single";
    return this;
  }
  maybeSingle() {
    this.modo = "maybe";
    return this;
  }
  returns() {
    return this;
  }

  then<A = Resultado, B = never>(
    ok?: ((v: Resultado) => A | PromiseLike<A>) | null,
    falha?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    let r: Resultado;
    try {
      r = this.executar();
    } catch (e) {
      r = { data: null, error: { message: e instanceof Error ? e.message : String(e) }, count: null, status: 500 };
    }
    return Promise.resolve(r).then(ok, falha);
  }

  private erro(message: string, code?: string): Resultado {
    return { data: null, error: { message, code }, count: null, status: 400 };
  }

  private finalizar(linhas: Linha[], total: number | null = null): Resultado {
    if (this.cabeca) return { data: null, error: null, count: total ?? linhas.length, status: 200 };
    if (this.modo === "single") {
      if (linhas.length !== 1) return this.erro("JSON object requested, multiple (or no) rows returned", "PGRST116");
      return { data: linhas[0], error: null, count: total, status: 200 };
    }
    if (this.modo === "maybe") {
      if (linhas.length > 1) return this.erro("Multiple rows returned", "PGRST116");
      return { data: linhas[0] ?? null, error: null, count: total, status: 200 };
    }
    return { data: linhas, error: null, count: total, status: 200 };
  }

  private projetarTodas(b: Banco, linhas: Linha[]) {
    const campos = analisar(this.colunas);
    return linhas.map((l) => projetar(b, this.ctx, this.tabela, l, campos)).filter((l): l is Linha => l !== null);
  }

  private alvos(b: Banco) {
    const base = b.tabelas[this.tabela] ?? [];
    const simples = this.filtros.filter((f) => !f.col.includes("."));
    return base.filter((l) => visivel(b, this.ctx, this.tabela, l) && simples.every((f) => passa(l, f)));
  }

  private executar(): Resultado {
    const b = lerBanco();
    b.tabelas[this.tabela] ??= [];

    if (this.op === "select") {
      const campos = analisar(this.colunas);
      let linhas = this.alvos(b);
      const ordens = [...this.ordens];
      if (ordens.length) {
        linhas = [...linhas].sort((x, y) => {
          for (const o of ordens) {
            const r = comparar(valor(x, o.col), valor(y, o.col), o.asc);
            if (r) return r;
          }
          return 0;
        });
      }
      let projetadas = linhas
        .map((l) => projetar(b, this.ctx, this.tabela, l, campos))
        .filter((l): l is Linha => l !== null);
      const compostos = this.filtros.filter((f) => f.col.includes("."));
      projetadas = projetadas.filter((l) => compostos.every((f) => passa(l, f)));
      const total = this.contar ? projetadas.length : null;
      if (this.limite !== null) projetadas = projetadas.slice(0, this.limite);
      return this.finalizar(projetadas, total);
    }

    if (this.op === "delete") {
      const sai = new Set(this.alvos(b).filter((l) => ehAdmin(b, this.ctx) || podeGravar(b, this.ctx, this.tabela, l)));
      apagarLinhas(b, this.tabela, (l) => sai.has(l));
      salvarBanco(b);
      return { data: null, error: null, count: null, status: 204 };
    }

    if (this.op === "update") {
      const carga = this.carga as Linha;
      const mudadas: Linha[] = [];
      for (const l of this.alvos(b)) {
        const nova = { ...l, ...carga };
        if (!podeGravar(b, this.ctx, this.tabela, nova)) continue;
        Object.assign(l, carga);
        if (TOCA_ATUALIZADO.has(this.tabela) && !("atualizado_em" in carga)) l.atualizado_em = agora();
        mudadas.push(l);
      }
      salvarBanco(b);
      return this.retorna ? this.finalizar(this.projetarTodas(b, mudadas)) : { data: null, error: null, count: null, status: 204 };
    }

    // insert / upsert
    const cargas = Array.isArray(this.carga) ? this.carga : [this.carga as Linha];
    const tabela = b.tabelas[this.tabela];
    const gravadas: Linha[] = [];
    for (const c of cargas) {
      const chave = this.op === "upsert" ? (this.conflito ?? CHAVES[this.tabela] ?? ["id"]) : null;
      const existente = chave ? tabela.find((l) => chave.every((k) => l[k] === c[k])) : undefined;
      if (existente) {
        if (!podeGravar(b, this.ctx, this.tabela, { ...existente, ...c })) return this.erro("new row violates row-level security policy", "42501");
        Object.assign(existente, c);
        if (TOCA_ATUALIZADO.has(this.tabela) && !("atualizado_em" in c)) existente.atualizado_em = agora();
        gravadas.push(existente);
        continue;
      }
      const nova = comPadroes(this.tabela, c);
      if (!podeGravar(b, this.ctx, this.tabela, nova)) return this.erro("new row violates row-level security policy", "42501");
      const unicos = [CHAVES[this.tabela] ?? ["id"], ...(UNICOS[this.tabela] ?? [])];
      for (const u of unicos) {
        if (tabela.some((l) => u.every((k) => l[k] === nova[k]))) {
          return this.erro(`duplicate key value violates unique constraint (${u.join(",")})`, "23505");
        }
      }
      tabela.push(nova);
      gravadas.push(nova);
    }
    salvarBanco(b);
    return this.retorna ? this.finalizar(this.projetarTodas(b, gravadas)) : { data: null, error: null, count: null, status: 201 };
  }
}
