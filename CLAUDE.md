# Meu Bolso — memória do projeto

Este arquivo é a memória do projeto. Leia tudo antes de qualquer trabalho nesta pasta.

## 1. O que é este projeto

O **Meu Bolso** é um app de gastos pessoais, feito durante a Formação Claude Pro.

- **Quem usa:** só a dona do projeto, no celular e no computador.
- **O que ele faz:** registra gastos e mostra o total do mês, separado por categoria.
- **O que vem na sexta:** um assistente que lança o gasto a partir de uma frase escrita ou da foto do cupom.
- **Telas e categorias:** ainda não estão definidas. Elas vão sair de uma entrevista que o Claude conduz com a dona do projeto.

## 2. Regras técnicas que não se discutem

- **Onde ficam os arquivos do app:** na pasta `app/`, que tem `index.html`, `estilo.css`, `app.js`, `configuracao.js`, `manifest.webmanifest` e `icone.svg`.
- **Sem complicação:** nada de Node, de etapa de build ou de framework.
- **Supabase pela internet (CDN):** o cliente do Supabase entra com esta linha:
  `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>`
- **Entrada no app:** por e-mail e senha, sem e-mail de confirmação.
- **Proteção dos dados:** as tabelas `gastos`, `resumos`, `limites` e `poupanca` têm proteção por linha (cada pessoa só enxerga o que é dela). A tabela `limites` guarda o limite do mês que a pessoa escolhe para cada categoria. A tabela `poupanca` guarda a meta do cofrinho (uma por pessoa) e cada valor que a pessoa anota como guardado.
- **Cofrinho:** só registra o que a pessoa decide anotar; nunca pergunta salário, saldo, dívida ou banco.
- **Alertas de limite:** aparecem só dentro do app: a 80% do limite, um aviso gentil; acima do limite, um alerta em coral.
- **Endereço e chave pública:** a URL do projeto Supabase e a chave pública ficam em `app/configuracao.js`, dentro de `window.MEU_BOLSO`.
- **Chaves secretas:** a chave secreta do Supabase e a chave do Gemini **nunca** entram em arquivo nenhum.
- **Publicação:** na raiz, o `netlify.toml` publica a pasta `app`.
- **O que fica fora do Git:** na raiz, o `.gitignore` deixa de fora `.env`, `.netlify` e `node_modules`.
- **Celular primeiro:** o desenho começa pela tela de celular de 390 px de largura.
- **Mensagens de erro:** todo erro aparece como uma frase em português dizendo o que a pessoa deve fazer.

## 3. O que este app nunca faz

- Nunca pede, guarda ou mostra senha de banco, número de conta ou número de cartão.
- Nunca guarda a foto do cupom.
- Nunca envia e-mail ou mensagem.
- Nunca usa dado de outra pessoa.

## 4. Como trabalhar comigo

- Antes de alterar qualquer arquivo, diga o plano em até dez linhas e espere a minha aprovação.
- Uma mudança por vez, mostrando a diferença (o que saiu e o que entrou).
- Toda entrega vai para um arquivo; na conversa vêm só os caminhos.
- Fale em português, para quem não programa.
