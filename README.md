# PSI Monitoramento

Painel web para acompanhar planilhas do Google Sheets em uma interface consolidada.

## Arquitetura

- **GitHub Pages:** hospeda a interface estática.
- **Google Apps Script:** funciona como backend e lê somente as fontes cadastradas no array `SOURCES`.
- **Sincronização:** consulta automática a cada 30 segundos, além do botão de atualização manual e de uma nova consulta quando a aba volta a ficar visível.

O GitHub Pages não executa código de servidor. Por isso, a leitura das planilhas é feita pelo Apps Script, e os visitantes não precisam inserir chave de API do Google.

## Estrutura do repositório

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da interface |
| `style.css` | Estilos e responsividade |
| `script.js` | Renderização, gráficos, filtros e sincronização |
| `Code.gs` | Modelo do backend Google Apps Script |
| `README.md` | Documentação do projeto |

## Endereço do painel

Quando o GitHub Pages estiver habilitado para a branch `main` e a pasta `/(root)`, o endereço padrão será:

https://devhosampaio.github.io/psi-monitoramento/

## Backend Google Apps Script

O arquivo `Code.gs` neste repositório é um **modelo de referência**. Ele contém um identificador de planilha de exemplo/placeholder para não publicar aqui os IDs reais das fontes. A versão efetivamente implantada fica no projeto do Google Apps Script.

Para configurar ou atualizar o backend:

1. Acesse https://script.google.com/ e abra o projeto do painel.
2. No arquivo principal do Apps Script, configure o array `SOURCES`.
3. Cada fonte precisa ter um `id` único, `name`, `spreadsheetId`, `range` e `profile`.
4. O intervalo deve começar na linha que contém os cabeçalhos. A configuração PAPs atual utiliza a aba `Principal` e o intervalo iniciado em `A2`.
5. Execute `testBackend` no editor para testar o acesso da conta às planilhas.
6. Ao alterar o código do Apps Script, publique uma nova versão em **Implantar → Gerenciar implantações → Editar → Nova versão → Implantar**.

A URL do Web App já configurada no frontend fica na constante `BACKEND_URL`, no início de `script.js`. Ela deve terminar em `/exec`. Não substitua por uma chave de API.

## Publicação no GitHub Pages

1. Abra **Settings → Pages** no repositório.
2. Em **Build and deployment**, escolha **Deploy from a branch**.
3. Selecione a branch `main` e a pasta `/(root)`.
4. Salve e acompanhe a implantação na aba **Actions**.

O GitHub Pages publica os arquivos da raiz quando essa pasta é selecionada como origem. A publicação pode levar alguns minutos após um commit.

## Adicionar uma nova fonte

No projeto do Apps Script, adicione um objeto ao array `SOURCES`. Exemplo:

```js
{
  id: "cisternas",
  name: "Cisternas",
  spreadsheetId: "ID_REAL_DA_PLANILHA",
  range: "Principal!A1:Z",
  profile: "auto"
}
```

Depois, salve e implante uma nova versão do Web App. O frontend consulta a lista de fontes ao ser carregado e exibirá a nova fonte automaticamente.

## Segurança e privacidade — importante

A implantação do Apps Script configurada para **Qualquer pessoa** cria um endpoint público. Qualquer pessoa que obtenha a URL do Web App poderá solicitar os dados das fontes cadastradas em `SOURCES`. O fato de o ID da planilha não aparecer no frontend **não protege os dados**.

- Não cadastre nesse endpoint público planilhas com CPF, NIS, endereços, dados de beneficiários ou outras informações pessoais/sigilosas.
- Não coloque senhas, tokens privados ou chaves secretas no `index.html`, `style.css` ou `script.js`.
- Para dados internos ou pessoais, é necessário implementar autenticação e autorização reais no backend antes de liberar o acesso.

## Observações sobre a sincronização

O intervalo padrão é `30000 ms` (30 segundos). Navegadores podem reduzir a frequência de temporizadores quando a aba fica em segundo plano; ao voltar para a aba, o painel realiza uma nova consulta.