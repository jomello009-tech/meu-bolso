# Briefing do Meu Bolso

Resultado da entrevista de oito perguntas, no formato CLARO.

## C — Contexto

- **Nome do app:** Meu Bolso.
- **Quem usa:** só a dona do projeto, no celular e no computador.
- **Onde lança:** no celular, **logo depois de pagar** (no caixa, em pé, com pressa).
- **Quando confere:** **no fim do dia**, com calma, para revisar e corrigir o que lançou.
- **Sensação ao abrir:** alegre e leve.
- **Cores:** fundo quase branco, botões verde-menta e detalhes em coral (laranja rosado).

## L — Limites

- **No máximo 3 toques** para lançar um gasto, contando a partir do app aberto: valor, categoria e Salvar. A data entra sozinha como "hoje".
- **Nunca pede dados de banco:** senha de banco, número de conta ou número de cartão.
- **Nunca pede dados pessoais.** Para entrar, só o e-mail e uma senha criada para o próprio app.
- **Nunca guarda a foto do cupom.**
- **Nunca envia e-mail, mensagem ou notificação.** Os avisos aparecem só dentro do app.
- **Nunca usa dado de outra pessoa.**
- **Nunca dá bronca.** Os avisos de moderação são gentis e só aparecem para categorias em que ela mesma definiu um limite.
- **Nunca trava e nunca espalha o lançamento por várias telas para digitar.** Esses são os dois motivos que a fariam desistir na primeira semana.

## A — Ação

Construir **uma tela só**, pensada primeiro para o celular de 390 px, com quatro partes.

1. **O que aparece em cinco segundos**
   - **Primeira vez:** boas-vindas com uma explicação curta de como o app funciona. Depois de fechada, não aparece mais.
   - **Nas outras vezes:** a tela abre direto no **total gasto no mês**, em destaque no topo, com o total de cada categoria logo abaixo.
   - Quando uma categoria com limite chega perto dele, aparece ali uma frase gentil, por exemplo: "Mercado está em 80% do seu limite".

2. **Lançamento à mão**
   - Campo de valor já pronto para digitar, botões das categorias e o botão Salvar.
   - Data automática de hoje, que pode ser trocada na revisão do fim do dia.

3. **Lista do mês**
   - Os gastos do mês, do mais recente para o mais antigo, com valor, categoria e data.
   - Tocar num gasto permite corrigir ou apagar (é a conferência do fim do dia).
   - Um lugar simples para definir, se ela quiser, o limite de cada categoria.

4. **Espaço do assistente (chega na sexta)**
   - Um espaço reservado na mesma tela para lançar o gasto por uma frase escrita ou pela foto do cupom.
   - Até sexta, ele aparece só como "Em breve".

**Categorias, com os nomes dela:**

1. Mercado
2. Contas da casa (água, luz, gás, telefone, internet, condomínio)
3. Prestação da casa
4. Gasolina
5. Medicamentos
6. Academia
7. Lazer
8. Outros

Cartão de crédito não é categoria: é forma de pagar. Cada gasto vai para a categoria do que foi comprado, para não contar duas vezes.

## R — Resultado

A pergunta dos cinco segundos é **"Quanto já gastei este mês, e em quê?"**. Ao abrir o app, ela tem a resposta na tela, sem rolar e sem tocar em nada: o total do mês no topo e o total de cada categoria logo abaixo.

## O — Observáveis (cinco testes que provam que o app está pronto)

1. **Cinco segundos:** num celular de 390 px, abrindo o app pela segunda vez, o total do mês e os totais por categoria aparecem em até 5 segundos, sem rolar a tela.
2. **Três toques:** com o app aberto, um gasto é lançado tocando no valor, na categoria e em Salvar, e já aparece na lista do mês e no total.
3. **Boas-vindas uma vez só:** no primeiro acesso aparece a explicação; depois de fechá-la e abrir o app de novo, ela não volta.
4. **Aviso gentil, só na tela:** com um limite definido para Mercado, ao chegar a 80% dele aparece a frase gentil na tela, e nenhum e-mail, mensagem ou notificação é enviado.
5. **Nada proibido e nada de travar:** nenhuma tela pede dados de banco, conta, cartão ou dados pessoais além do e-mail de entrada; sem internet, o app mostra uma frase em português dizendo o que fazer, em vez de travar ou mostrar erro técnico.
