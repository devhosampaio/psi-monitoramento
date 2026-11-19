# Painel de PAPs (GitHub Pages)

Site estático: um único `index.html`. Lê a planilha direto da API do Google Sheets e atualiza sozinho (padrão: a cada 60 s).

## 1. Compartilhar a planilha para leitura
A API com chave só lê planilhas públicas. Na planilha: **Compartilhar → Acesso geral → Qualquer pessoa com o link → Leitor**.
⚠️ Isso torna os dados (inclui CNPJ e nomes de associações) acessíveis a quem tiver o link da planilha.
Alternativa mais segura: crie uma cópia da planilha só com as colunas necessárias (ex.: via IMPORTRANGE) e compartilhe essa cópia.

## 2. Criar a chave de API
1. https://console.cloud.google.com → crie/seleciona um projeto.
2. **APIs e serviços → Biblioteca** → ative **Google Sheets API**.
3. **Credenciais → Criar credenciais → Chave de API**.
4. Restrinja a chave: **Restrições de aplicativo → Sites** → `https://SEU-USUARIO.github.io/*`; **Restrições de API → Google Sheets API**.

## 3. Configurar
No `index.html`, procure `const SITE = {` e troque `COLE_SUA_CHAVE_DE_API_AQUI` pela chave.
(A chave fica visível no código; por isso a restrição por site no passo 2 é importante.)

## 4. Publicar
Crie um repositório no GitHub, envie `index.html`, e em **Settings → Pages** escolha a branch `main` e a pasta `/ (root)`.
O site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

## Outras planilhas
Use “Fonte dos dados” no topo (link, aba e intervalo; perfil “Automático”) ou crie um perfil novo no MÓDULO 1.
Para trocar a origem dos dados, reescreva apenas o MÓDULO 5.
