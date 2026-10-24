# Relatório do guarda-de-seguranca

| Arquivo | O que encontrou | Gravidade | O que fazer |
|---|---|---|---|
| MUDANCA-4-ASSISTENTE.diff (linha 15) | A chave pública do Supabase (`sb_publi…`) aparece copiada neste registro de mudança, fora dos lugares permitidos (`app/configuracao.js` e `netlify/functions/`). | MÉDIA | Tire a chave deste arquivo, ou não envie os arquivos MUDANCA-*.diff ao GitHub. |
| app/app.js (linha 799) e netlify/functions/assistente.mjs (linhas 80 e 320) | `Bearer ` seguido de uma variável (`token`), que é o login da pessoa em uso, sem valor escrito no arquivo. | BAIXA | Nada a fazer: é só o nome de uma variável. |
| app/index.html, app/app.js | Campo e variável chamados "senha"/"password" do formulário de entrada, sem nenhum valor escrito. | BAIXA | Nada a fazer: é só o nome do campo. |

Conferido e sem problema:
- Nenhum `sb_secret`, `service_role`, JWT `eyJhbGciOi`, chave `AIza` ou cabeçalho `-----BEGIN` em arquivo do projeto. Os únicos achados estão no próprio texto de instruções do guarda.
- A chave do Gemini só é lida de `process.env.CHAVE_GEMINI` em `netlify/functions/assistente.mjs`, e nunca aparece escrita.
- A chave pública do Supabase está em `app/configuracao.js` e no topo de `netlify/functions/assistente.mjs`, que são lugares permitidos.
- Nenhum e-mail, CPF, telefone, cartão ou conta encontrado nos arquivos do projeto.
- O `.gitignore` tem as linhas `.env` e `.netlify` (e `node_modules`).
- Não existe arquivo `.env` nem `.env.*` no projeto.

PODE ENVIAR
