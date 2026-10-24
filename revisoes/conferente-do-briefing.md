# Relatório do conferente-do-briefing

| Teste | Veredito | Motivo |
|---|---|---|
| 1. Cinco segundos (total do mês e totais por categoria em até 5 s, sem rolar, no celular de 390 px) | SÓ DÁ PARA SABER ABRINDO O APP | O `app/app.js` busca limites e gastos no Supabase pela internet. O total fica no topo do `app/index.html`, logo abaixo do cabeçalho e das boas-vindas (que não aparecem na segunda vez). Só abrindo o app dá para medir o tempo e ver se as barras de 8 categorias cabem sem rolar. |
| 2. Três toques (valor, categoria, Salvar; aparece na lista e no total) | CUMPRE | Em `app/app.js`, a data entra sozinha como hoje (`limparFormulario`). A descrição é opcional e fica escondida. Só valor, chip de categoria e Salvar são obrigatórios. Depois de salvar, `carregarGastos()` refaz lista e total. A gravação em si depende do Supabase. |
| 3. Boas-vindas uma vez só | CUMPRE | `app/app.js` grava "vista" no `localStorage` (uma marca por usuária) ao tocar em "Entendi", e `mostrarBoasVindasSePreciso` não mostra mais o cartão. Em outro aparelho ou depois de limpar o navegador, ela volta. |
| 4. Aviso gentil só na tela, sem e-mail ou notificação | CUMPRE | `desenharAlertas` em `app/app.js` mostra "Mercado está em 80% do seu limite" (com a porcentagem real) a partir de 80% e só para categoria com limite definido. Não há envio de e-mail, mensagem nem uso de notificação do navegador em nenhum arquivo de `app/`. |
| 5. Nada proibido e nada de travar (sem internet, frase em português) | SÓ DÁ PARA SABER ABRINDO O APP | A parte "nada proibido" cumpre: `app/index.html` só pede e-mail e senha. Os erros passam por `frase()` em `app/app.js`, que dá "Sem internet agora. Confira o Wi-Fi…". Mas não existe modo offline (nada guarda a página no aparelho). Sem internet ao abrir, o resultado depende do navegador e do Supabase. Isso só se vê no app. |

Categorias iguais ao briefing: as 8 estão na mesma ordem e "Outros" está presente. Os nomes "Contas da casa" e "Prestação da casa" estão sem os parênteses explicativos do briefing, o que é esperado.

Conferência dos "Limites" e da "Ação" do briefing:
- **Três toques e sem dados de banco:** cumpre.
- **Uma tela só:** cumpre. Os limites e a meta do cofrinho abrem na própria tela.
- **Total do mês no topo, lista do mês, limites por categoria:** cumprem. A lista vai do mais recente ao mais antigo, com valor, categoria e data.
- **Espaço do assistente:** existe, mas já funciona com texto, voz e foto, e não é mais só "Em breve". Isso está adiante do briefing, não atrás.
- **Foto do cupom:** o `app/app.js` reduz a foto no aparelho e não guarda nada. O que o servidor faz com ela (`/api/assistente`) não está em `app/`, então não dá para confirmar daqui.
- **Cores:** diferem do briefing (veja o primeiro item da seção abaixo).
- **Tocar num gasto para corrigir ou apagar:** só apagar existe (veja o segundo item da seção abaixo).

## O que falta para o app ficar como o briefing pediu

- **Botões em verde-menta.** O briefing pede botões verde-menta, mas `app/estilo.css` usa âmbar (#F2A900, comentário "âmbar e coral") nos botões, no título e nas bordas. O mesmo âmbar está no `theme-color` do `app/index.html` e do `app/manifest.webmanifest`. O coral e o fundo quase branco estão certos.
- **Corrigir um gasto.** O briefing diz que tocar num gasto permite corrigir ou apagar, para a revisão do fim do dia. Hoje a lista só tem o botão "Apagar". Quem errou o valor, a categoria ou a data precisa apagar e lançar de novo.
- **Campo de valor já pronto para digitar.** O `app/index.html` não deixa o cursor no campo de valor ao abrir. Não quebra a regra dos três toques, porque tocar no valor conta como o primeiro toque, mas o briefing fala em "já pronto para digitar".
- **Funcionar sem internet.** Hoje, sem internet na hora de abrir, não há garantia da frase em português. Os arquivos do app e o cliente do Supabase vêm da internet, e não há nada que guarde a página no aparelho. O teste 5 só passa de verdade se isso for conferido abrindo o app sem internet.
- **Frase de limite ultrapassado mais gentil.** Acima do limite, o texto é "Atenção: Mercado passou do limite em R$ …". É coerente com o alerta em coral do `CLAUDE.md`, mas pode soar como bronca. O briefing diz "nunca dá bronca", então vale rever o tom.
- **Cartão do assistente bem abaixo do total.** Ele fica depois do cofrinho e do resumo da semana, e a lista do mês fica por último. Isso não quebra nenhum teste, mas empurra a conferência do fim do dia para baixo na tela.
