// Cria (ou promove) o primeiro administrador.
// Uso:  npm run criar-admin -- voce@email.com "Seu Nome" "SuaSenhaForte1"
// Lê NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY do .env.local
import { createClient } from "@supabase/supabase-js";

const [email, nome = "Admin", senha] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;

if (!url || !chave) {
  console.error("✖ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local");
  process.exit(1);
}
if (!email) {
  console.error('✖ Uso: npm run criar-admin -- email@exemplo.com "Seu Nome" "SenhaForte1"');
  process.exit(1);
}

const supabase = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

async function acharUsuario(alvo) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === alvo.toLowerCase());
    if (u) return u;
    if (data.users.length < 200) return null;
  }
  return null;
}

let usuario = await acharUsuario(email);

if (!usuario) {
  if (!senha || senha.length < 8 || !/[A-Z]/.test(senha) || !/\d/.test(senha)) {
    console.error("✖ Informe uma senha com 8+ caracteres, 1 maiúscula e 1 número.");
    process.exit(1);
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error) {
    console.error("✖ Erro ao criar usuário:", error.message);
    process.exit(1);
  }
  usuario = data.user;
  console.log("✔ Usuário criado:", email);
} else {
  console.log("• Usuário já existia, vou promover a admin:", email);
}

const { error } = await supabase
  .from("profiles")
  .upsert({ id: usuario.id, nome, role: "admin", ativo: true, precisa_trocar_senha: false });

if (error) {
  console.error("✖ Erro ao promover (você rodou o SQL da migração?):", error.message);
  process.exit(1);
}
console.log("✔ Pronto! Entre em /login com esse e-mail.");
