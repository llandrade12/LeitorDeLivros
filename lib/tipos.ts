export type Papel = "admin" | "leitor";

export type Perfil = {
  id: string;
  nome: string;
  role: Papel;
  ativo: boolean;
  precisa_trocar_senha: boolean;
  criado_em: string;
  ultimo_acesso: string | null;
  avatar_path: string | null;
  compartilhar_leitura: boolean;
};

export type StatusSerie = "em_andamento" | "finalizada" | "hiato";
export type AcessoSerie = "todos" | "restrito";

export type Serie = {
  id: string;
  titulo: string;
  slug: string;
  sinopse: string;
  capa_path: string | null;
  status: StatusSerie;
  tags: string[];
  publicado: boolean;
  acesso: AcessoSerie;
  autor: string;
  chamada: string;
  banner_path: string | null;
  em_breve: boolean;
  lancamento_em: string | null;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
};

export type Capitulo = {
  id: string;
  series_id: string;
  numero: string;
  titulo: string;
  ordem: number;
  pdf_path: string | null;
  paginas_path: string | null;
  paginas_ext: "webp" | "jpg" | "png";
  total_paginas: number;
  versao: number;
  capa_path: string | null;
  publicado: boolean;
  publicado_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type Progresso = {
  user_id: string;
  chapter_id: string;
  ultima_pagina: number;
  concluido: boolean;
  concluido_em: string | null;
  atualizado_em: string;
};

export type Marcador = {
  id: string;
  user_id: string;
  chapter_id: string;
  pagina: number;
  nota: string;
  criado_em: string;
};

export type EstadoLeitura = "nao_iniciado" | "em_leitura" | "concluido";

/** Estado padrão devolvido pelas Server Actions de formulário */
export type EstadoForm = {
  erro?: string;
  ok?: string;
};

export const ROTULO_STATUS: Record<StatusSerie, string> = {
  em_andamento: "Em andamento",
  finalizada: "Finalizada",
  hiato: "Hiato",
};

export type Colecao = { id: string; user_id: string; nome: string; criado_em: string };

export type Personagem = {
  id: string;
  series_id: string | null; // legado: o vínculo fica em personagens_series
  nome: string;
  imagem_path: string | null;
  cor: string;
  ordem: number;
  criado_em: string;
};

export const CORES_HEROI = ["#4d83f4", "#a855f7", "#f05252", "#f6ad3b", "#31c48d", "#ec4899"];
