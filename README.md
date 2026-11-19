# PSI Monitoramento

Painel web estático para acompanhar indicadores de planilhas Google Sheets.

## Arquitetura

- **GitHub Pages:** publica a interface.
- **Google Apps Script:** lê a planilha privada e calcula os indicadores no servidor.
- **Sincronização:** consulta automática a cada 30 segundos, com atualização manual e nova leitura ao retornar à aba.

## Estrutura

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da interface |
| `style.css` | Estilos e responsividade |
| `script.js` | Indicadores, gráficos e sincronização |
| `Code.gs` | Modelo do backend Apps Script |
| `README.md` | Documentação |

## Painel publicado

https://devhosampaio.github.io/psi-monitoramento/

## Reconstrução do painel PAP

O painel foi reorganizado para refletir os campos atuais da aba `Principal`:

- Indicadores de quantidade de PAPs e valores propostos/aprovados;
- Famílias, mulheres e jovens informados na Carta e no PAP, em indicadores separados;
- Status do PAP, situação da análise e resultado do parecer, sem misturar os três conceitos;
- Distribuições por território, lote, equipe e cadeia produtiva;
- Indicadores de pendências ativas e médias de dias de análise/pendências;
- Comparativo operacional das cinco equipes.

Os campos de preenchimento pendente são apresentados como categorias/indicadores próprios. O painel não exibe associações, CNPJs, nomes de analistas, observações ou linhas individuais.

## Atualizar o Google Apps Script — etapa obrigatória

**O código do Apps Script implantado não é atualizado automaticamente pelo GitHub.** O arquivo `Code.gs` do repositório é o modelo que precisa ser copiado para o projeto Apps Script que já está conectado ao painel.

1. Abra https://script.google.com/ e entre no projeto usado pelo painel.
2. Faça uma cópia de segurança do código atual.
3. Substitua o conteúdo do arquivo principal pelo conteúdo atualizado de `Code.gs` deste repositório.
4. No array `SOURCES`, mantenha o ID privado da planilha PAPs já utilizado no projeto. Não publique esse ID no repositório.
5. Confirme a configuração `range: "Principal!A2:AL"` e `profile: "pap"`.
6. Execute `testBackend`. O registro do teste deve mostrar `ok: true` e a quantidade total de PAPs, sem imprimir registros individuais.
7. Vá em **Implantar → Gerenciar implantações → Editar → Nova versão → Implantar**. Mantenha a URL do Web App usada pelo frontend.
8. Abra o painel e confirme se os indicadores são carregados.

A versão nova do frontend espera que a ação `read` retorne `summary` (indicadores agregados). Se o Apps Script continuar retornando `values` (linhas brutas), o painel avisará que o backend está desatualizado.

## Segurança e privacidade

O Web App pode estar publicado como **Qualquer pessoa**. Por isso, qualquer dado retornado por ele deve ser considerado público.

- Para PAPs, o backend calcula totais e distribuições no servidor e devolve somente indicadores agregados.
- Não adicione ao retorno público associações individualizadas, CNPJ, CPF, NIS, endereços, nomes, observações ou outras informações pessoais.
- Não cadastre outras planilhas com dados pessoais no endpoint público sem antes implementar autenticação e autorização reais.
- Não coloque IDs privados, senhas, tokens ou chaves no frontend ou neste repositório.

## GitHub Pages

A publicação está configurada por GitHub Actions em `.github/workflows/deploy.yml`. Commits na branch `main` iniciam uma nova publicação. Acompanhe o resultado na aba **Actions**.

## Sincronização

O frontend consulta os indicadores a cada `30000 ms` (30 segundos). Navegadores podem reduzir a frequência em abas em segundo plano; ao voltar para a página, uma nova consulta é iniciada.
