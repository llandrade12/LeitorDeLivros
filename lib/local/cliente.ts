import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  agora,
  apagarLinhas,
  comPadroes,
  conferirSenha,
  hashSenha,
  lerBanco,
  salvarBanco,
  type Banco,
  type Usuario,
} from "./banco";
import { Consulta, podeLerSerie, type Contexto } from "./consulta";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const COOKIE_SESSAO_LOCAL = "geek_sessao_local";

/** O que o cliente local precisa para mexer nos cookies */
export type Biscoitos = {
  get(nome: string): { value: string } | undefined;
  set(nome: string, valor: string, opcoes?: Record<string, unknown>): void;
};

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

function publico(u: Usuario) {
  return {
    id: u.id,
    email: u.email,
    created_at: u.criado_em,
    last_sign_in_at: u.last_sign_in_at,
    invited_at: u.invited_at,
    email_confirmed_at: u.email_confirmed_at,
    banned_until: u.banido ? "2999-01-01T00:00:00Z" : null,
    user_metadata: u.user_metadata,
    app_metadata: {},
    aud: "authenticated",
  };
}

const erro = (message: string, code: string, status = 400) => ({ message, code, status, name: "AuthError" });

export function usuarioDaSessao(b: Banco, token: string | undefined) {
  if (!token) return null;
  const s = b.sessoes.find((x) => x.token === token);
  const u = s && b.usuarios.find((x) => x.id === s.user_id);
  return u && !u.banido ? u : null;
}

function criarSessao(b: Banco, u: Usuario, biscoitos: Biscoitos | null, temporaria: boolean) {
  const token = randomBytes(24).toString("hex");
  b.sessoes.push({ token, user_id: u.id, criado_em: agora() });
  u.last_sign_in_at = agora();
  biscoitos?.set(COOKIE_SESSAO_LOCAL, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    ...(temporaria ? {} : { maxAge: 60 * 60 * 24 * 400 }),
  });
}

function gerarLink(b: Banco, u: Usuario, tipo: "invite" | "recovery", destino: string) {
  const bruto = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(bruto).digest("hex");
  b.tokens.push({ hash, user_id: u.id, tipo, expira: Date.now() + 24 * 3600e3 });
  const link = `${SITE()}/auth/confirm?token_hash=${bruto}&type=${tipo}&next=${encodeURIComponent(destino)}`;
  console.log(`\n📧 [modo local] E-mail para ${u.email} (${tipo === "invite" ? "convite" : "recuperar senha"}):\n   ${link}\n`);
  return link;
}

function criarUsuario(b: Banco, email: string, senha: string | null, meta: Record<string, unknown>, convite = false) {
  const u: Usuario = {
    id: randomUUID(),
    email: email.toLowerCase(),
    senha_hash: senha ? hashSenha(senha) : null,
    criado_em: agora(),
    last_sign_in_at: null,
    invited_at: convite ? agora() : null,
    email_confirmed_at: convite ? null : agora(),
    banido: false,
    user_metadata: meta,
  };
  b.usuarios.push(u);
  // mesmo papel do gatilho handle_new_user
  b.tabelas.profiles.push(
    comPadroes("profiles", {
      id: u.id,
      nome: String(meta.nome ?? ""),
      precisa_trocar_senha: Boolean(meta.precisa_trocar_senha),
    }),
  );
  return u;
}

function listarAmigos(b: Banco, ctx: Contexto) {
  const eu = b.tabelas.profiles.find((p) => p.id === ctx.userId && p.ativo);
  if (!eu) return [];
  return b.tabelas.profiles
    .filter((p) => p.ativo && p.compartilhar_leitura !== false && p.id !== ctx.userId)
    .map((p) => {
      const leituras = b.tabelas.reading_progress
        .filter((r) => r.user_id === p.id)
        .map((r) => {
          const c = b.tabelas.chapters.find((x) => x.id === r.chapter_id);
          const s = c && b.tabelas.series.find((x) => x.id === c.series_id);
          return c && s && c.publicado && podeLerSerie(b, ctx, s.id) ? { r, c, s } : null;
        })
        .filter((x) => x !== null)
        .sort((x, y) => y.r.atualizado_em.localeCompare(x.r.atualizado_em));
      const u = leituras[0];
      return {
        id: p.id,
        nome: p.nome,
        avatar_path: p.avatar_path,
        ultimo_acesso: p.ultimo_acesso,
        concluidos: leituras.filter((x) => x.r.concluido).length,
        serie_titulo: u?.s.titulo ?? null,
        serie_slug: u?.s.slug ?? null,
        capitulo_id: u?.c.id ?? null,
        capitulo_numero: u?.c.numero ?? null,
        capitulo_titulo: u?.c.titulo ?? null,
        pagina: u?.r.ultima_pagina ?? null,
        total: u?.c.total_paginas ?? null,
        terminou: u?.r.concluido ?? null,
        lido_em: u?.r.atualizado_em ?? null,
      };
    })
    .sort((a, b2) => (b2.lido_em ?? "").localeCompare(a.lido_em ?? "") || a.nome.localeCompare(b2.nome));
}

/** Cliente no formato do supabase-js, mas lendo/gravando em .dados-locais/.
 *  papel "usuario" = como o cliente com RLS; "admin" = chave secreta. */
export function criarClienteLocal(papel: "usuario" | "admin", biscoitos: Biscoitos | null, opcoes: { temporaria?: boolean } = {}) {
  const ctx = (): Contexto => {
    const b = lerBanco();
    const u = papel === "usuario" ? usuarioDaSessao(b, biscoitos?.get(COOKIE_SESSAO_LOCAL)?.value) : null;
    return { userId: u?.id ?? null, bypass: papel === "admin" };
  };

  const resetPasswordForEmail = async (email: string) => {
    const b = lerBanco();
    const u = b.usuarios.find((x) => x.email === email.toLowerCase());
    if (u) {
      gerarLink(b, u, "recovery", "/redefinir-senha");
      salvarBanco(b);
    }
    return { data: {}, error: null };
  };

  const auth = {
    async getUser() {
      const b = lerBanco();
      const u = usuarioDaSessao(b, biscoitos?.get(COOKIE_SESSAO_LOCAL)?.value);
      return u ? { data: { user: publico(u) }, error: null } : { data: { user: null }, error: erro("Sem sessão", "no_session", 401) };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const b = lerBanco();
      const u = b.usuarios.find((x) => x.email === email.toLowerCase());
      if (!u || !conferirSenha(password, u.senha_hash)) {
        return { data: { user: null, session: null }, error: erro("Invalid login credentials", "invalid_credentials") };
      }
      if (u.banido) return { data: { user: null, session: null }, error: erro("User is banned", "user_banned") };
      criarSessao(b, u, biscoitos, Boolean(opcoes.temporaria));
      salvarBanco(b);
      return { data: { user: publico(u), session: {} }, error: null };
    },
    async signOut() {
      const b = lerBanco();
      const token = biscoitos?.get(COOKIE_SESSAO_LOCAL)?.value;
      b.sessoes = b.sessoes.filter((s) => s.token !== token);
      salvarBanco(b);
      biscoitos?.set(COOKIE_SESSAO_LOCAL, "", { path: "/", maxAge: 0 });
      return { error: null };
    },
    async updateUser({ password }: { password?: string }) {
      const b = lerBanco();
      const u = usuarioDaSessao(b, biscoitos?.get(COOKIE_SESSAO_LOCAL)?.value);
      if (!u) return { data: { user: null }, error: erro("Sem sessão", "no_session", 401) };
      if (password) {
        if (conferirSenha(password, u.senha_hash)) return { data: { user: null }, error: erro("Same password", "same_password", 422) };
        u.senha_hash = hashSenha(password);
        u.email_confirmed_at ??= agora();
      }
      salvarBanco(b);
      return { data: { user: publico(u) }, error: null };
    },
    async verifyOtp({ token_hash }: { token_hash: string; type: string }) {
      const b = lerBanco();
      const hash = createHash("sha256").update(token_hash).digest("hex");
      const t = b.tokens.find((x) => x.hash === hash && x.expira > Date.now());
      const u = t && b.usuarios.find((x) => x.id === t.user_id);
      if (!t || !u) return { data: { user: null }, error: erro("Link inválido", "otp_expired") };
      b.tokens = b.tokens.filter((x) => x !== t);
      u.email_confirmed_at ??= agora();
      criarSessao(b, u, biscoitos, false);
      salvarBanco(b);
      return { data: { user: publico(u) }, error: null };
    },
    resetPasswordForEmail,
    admin: {
      async createUser({ email, password, user_metadata }: { email: string; password?: string; user_metadata?: Record<string, unknown> }) {
        const b = lerBanco();
        if (b.usuarios.some((x) => x.email === email.toLowerCase())) {
          return { data: { user: null }, error: erro("A user with this email address has already been registered", "email_exists", 422) };
        }
        const u = criarUsuario(b, email, password ?? null, user_metadata ?? {});
        salvarBanco(b);
        return { data: { user: publico(u) }, error: null };
      },
      async inviteUserByEmail(email: string, o?: { data?: Record<string, unknown> }) {
        const b = lerBanco();
        if (b.usuarios.some((x) => x.email === email.toLowerCase())) {
          return { data: { user: null }, error: erro("A user with this email address has already been registered", "email_exists", 422) };
        }
        const u = criarUsuario(b, email, null, o?.data ?? {}, true);
        gerarLink(b, u, "invite", "/primeiro-acesso");
        salvarBanco(b);
        return { data: { user: publico(u) }, error: null };
      },
      async listUsers() {
        return { data: { users: lerBanco().usuarios.map(publico), aud: "authenticated" }, error: null };
      },
      async getUserById(id: string) {
        const u = lerBanco().usuarios.find((x) => x.id === id);
        return u ? { data: { user: publico(u) }, error: null } : { data: { user: null }, error: erro("User not found", "user_not_found", 404) };
      },
      async updateUserById(id: string, attrs: { password?: string; ban_duration?: string }) {
        const b = lerBanco();
        const u = b.usuarios.find((x) => x.id === id);
        if (!u) return { data: { user: null }, error: erro("User not found", "user_not_found", 404) };
        if (attrs.password) u.senha_hash = hashSenha(attrs.password);
        if (attrs.ban_duration) {
          u.banido = attrs.ban_duration !== "none";
          if (u.banido) b.sessoes = b.sessoes.filter((s) => s.user_id !== id);
        }
        salvarBanco(b);
        return { data: { user: publico(u) }, error: null };
      },
      async deleteUser(id: string) {
        const b = lerBanco();
        b.usuarios = b.usuarios.filter((x) => x.id !== id);
        b.sessoes = b.sessoes.filter((s) => s.user_id !== id);
        apagarLinhas(b, "profiles", (p) => p.id === id);
        salvarBanco(b);
        return { data: {}, error: null };
      },
    },
  };

  return {
    from: (tabela: string) => new Consulta(tabela, ctx()),
    auth,
    async rpc(nome: string) {
      const c = ctx();
      const b = lerBanco();
      if (nome === "registrar_acesso") {
        const p = b.tabelas.profiles.find((x) => x.id === c.userId);
        if (p && (!p.ultimo_acesso || Date.now() - new Date(p.ultimo_acesso).getTime() > 5 * 60e3)) {
          p.ultimo_acesso = agora();
          salvarBanco(b);
        }
        return { data: null, error: null };
      }
      if (nome === "listar_amigos") return { data: listarAmigos(b, c), error: null };
      return { data: null, error: { message: `Função ${nome} não existe no modo local` } };
    },
    storage: {
      from() {
        throw new Error("No modo local use lib/storage.ts");
      },
    },
  } as any;
}
