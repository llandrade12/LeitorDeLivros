# Instalação do portal GEEK — Windows e Linux

Este guia leva você do zero até o portal rodando no seu computador, no **modo local**
(sem Supabase e sem Cloudflare: tudo fica numa pasta do próprio projeto).

| | Windows | Linux |
|---|---|---|
| Programa necessário | Node.js 22 (LTS) | Node.js 22 (LTS) |
| Onde digitar os comandos | **PowerShell** | **Terminal** |
| Tempo | ~10 minutos | ~10 minutos |

Depois de instalado, entre com:

| Perfil | E-mail | Senha |
|---|---|---|
| Admin (você) | `admin@local.test` | `Admin123` |
| Leitor (amigo) | `leitor@local.test` | `Leitor123` |

---

## 🪟 Windows (10 ou 11)

### 1. Instalar o Node.js
**Opção A — pelo site (mais simples):**
1. Acesse **nodejs.org** e baixe a versão **LTS** (botão verde).
2. Execute o instalador e clique em *Next* até o fim (deixe as opções padrão).

**Opção B — pelo PowerShell:**
```powershell
winget install OpenJS.NodeJS.LTS
```

Feche e abra o PowerShell de novo e confira:
```powershell
node -v
npm -v
```
Deve aparecer `v22...` (ou maior) e um número de versão do npm.

### 2. Colocar o projeto numa pasta
1. Crie a pasta, por exemplo `C:\Projetos`.
2. Clique com o botão direito no `hq-portal-completo.zip` → **Extrair tudo…** → escolha `C:\Projetos` → **Extrair**.
3. Deve existir agora `C:\Projetos\hq-portal`.

### 3. Abrir o PowerShell na pasta do projeto
No Explorador de Arquivos, entre em `C:\Projetos\hq-portal`, clique na barra de endereço, digite `powershell` e aperte **Enter**.
(Ou: menu Iniciar → PowerShell → `cd C:\Projetos\hq-portal`)

> Se o caminho tiver espaços, use aspas: `cd "C:\Meus Projetos\hq-portal"`

### 4. Configurar o modo local
```powershell
Set-Content -Path .env.local -Value "MODO_LOCAL=1"
```
> Não crie esse arquivo pelo Bloco de Notas: o Windows costuma salvar como `.env.local.txt`, e aí não funciona.

### 5. Instalar e rodar
```powershell
npm install
npm run dev
```
Abra **http://localhost:3000** no navegador.

Para parar: **Ctrl + C** no PowerShell.

### Problemas comuns no Windows
| Mensagem | Solução |
|---|---|
| `npm : O arquivo ... não pode ser carregado porque a execução de scripts foi desabilitada` | Rode uma vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e responda **S**. (Ou use o **Prompt de Comando** em vez do PowerShell.) |
| `'node' não é reconhecido como um comando` | Feche e abra o PowerShell depois de instalar o Node. Se continuar, reinicie o computador. |
| O Windows Defender pergunta sobre "Node.js JavaScript Runtime" | Marque **Redes privadas** e clique **Permitir** (necessário para testar no celular). |
| Página em branco ou erro estranho depois de atualizar | Apague a pasta `.next` e rode `npm run dev` de novo. |

---

## 🐧 Linux

### 1. Instalar o Node.js 22
**Debian / Ubuntu / Mint:**
```bash
sudo apt-get update
sudo apt-get install -y curl unzip
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Fedora:**
```bash
sudo dnf install -y nodejs unzip
```

**Arch / Manjaro:**
```bash
sudo pacman -S --needed nodejs npm unzip
```

Confira:
```bash
node -v
npm -v
```
Deve aparecer `v20.9` ou maior (o ideal é `v22`).

### 2. Colocar o projeto numa pasta
```bash
mkdir -p ~/Projetos
cd ~/Projetos
unzip ~/Downloads/hq-portal-completo.zip
cd hq-portal
```
> No seu computador o projeto fica em:
> `cd "/home/guest/Documentos/PROJETOS/MEU APPS/hq-portal"`

### 3. Configurar o modo local
```bash
echo "MODO_LOCAL=1" > .env.local
```

### 4. Instalar e rodar
```bash
npm install
npm run dev
```
Abra **http://localhost:3000**. Para parar: **Ctrl + C**.

### Problemas comuns no Linux
| Mensagem | Solução |
|---|---|
| `EACCES: permission denied` no `npm install` | Nunca use `sudo npm install` dentro do projeto. Se já usou: `sudo chown -R $USER .` e rode de novo. |
| `node: command not found` | O Node não instalou; refaça o passo 1. |
| Celular não abre o endereço da rede | Se usar firewall: `sudo ufw allow 3000/tcp` |
| Aviso "multiple lockfiles" | Pode ignorar (já está tratado no `next.config.ts`). |

---

## 🔁 Comandos do dia a dia (Windows e Linux)

| O que fazer | Comando |
|---|---|
| Rodar para desenvolver | `npm run dev` |
| Testar a versão final (mais rápida; o offline funciona de verdade) | `npm run build` e depois `npm start` |
| Apagar os dados de teste e recriar a demonstração | `npm run local:resetar` |
| Depois de baixar uma versão nova do zip | extrair por cima → `npm install` → `npm run dev` |

**Atualizar o projeto com um zip novo**
- Windows: *Extrair tudo…* para a mesma pasta `C:\Projetos` e confirmar **Substituir**.
- Linux: `unzip -o ~/Downloads/hq-portal-completo.zip` dentro da pasta de cima do projeto.

O `.env.local` e os dados de teste (`.dados-locais`) **não são apagados** ao extrair por cima.

---

## 📱 Testar no celular (mesmo Wi-Fi)

1. Rode com acesso pela rede:
   ```
   npm run build
   npm start -- -H 0.0.0.0
   ```
2. Descubra o IP do computador:
   - Windows: `ipconfig` → linha **Endereço IPv4** (ex.: `192.168.0.15`)
   - Linux: `hostname -I` (primeiro número)
3. No celular: **http://SEU-IP:3000**

Assim dá para testar telas, leitura e login. **Instalar o app e o modo offline exigem https** — para isso, use o túnel:

**Instalar o túnel (uma vez):**
- Windows: `winget install --id Cloudflare.cloudflared`
- Linux (Debian/Ubuntu):
  ```bash
  wget -O /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  sudo dpkg -i /tmp/cloudflared.deb
  ```

**Usar:** com o `npm start` rodando, abra outro terminal e rode
```
cloudflared tunnel --url http://localhost:3000
```
Abra no celular o endereço `https://….trycloudflare.com` que aparecer. Feche com **Ctrl + C** quando terminar (enquanto estiver aberto, o endereço é acessível pela internet — o portal continua pedindo login).

---

## 💻 Para os amigos: instalar o app no computador

Quando o portal estiver publicado (ex.: `https://seu-portal.vercel.app`), o leitor pode instalá-lo como um programa:

**Windows**
- **Chrome:** abra o portal → ícone de instalar (⊕ / monitor com seta) no fim da barra de endereço → **Instalar**. Ou menu **⋮** → *Transmitir, salvar e compartilhar* → **Instalar página como app**.
- **Edge:** menu **…** → **Aplicativos** → **Instalar este site como um aplicativo**.
- O GEEK aparece no menu Iniciar e pode ser fixado na barra de tarefas.

**Linux**
- **Chrome / Chromium / Edge:** ícone de instalar na barra de endereço → **Instalar** (ou menu **⋮** → *Instalar app*).
- O GEEK aparece no menu de aplicativos do sistema.
- **Firefox não instala apps** desse tipo; use Chrome, Chromium ou Edge.

Instalado, o leitor abre o GEEK em janela própria, sem barra do navegador, e pode **baixar capítulos para ler offline** (menu *Baixados*).

**Desinstalar:** abra o app → menu **⋮** no topo da janela → **Desinstalar GEEK**.
