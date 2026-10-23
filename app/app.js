// Meu Bolso — lógica do app.
// Usa só o cliente do Supabase (carregado pela CDN) e window.MEU_BOLSO (configuracao.js).

(function () {
  "use strict";

  const cfg = window.MEU_BOLSO;
  const $ = (id) => document.getElementById(id);

  const telaEntrada = $("tela-entrada");
  const telaApp = $("tela-app");
  const carregando = $("carregando");

  // ---------- Erros em português ----------

  function frase(erro) {
    const texto = String((erro && (erro.message || erro.error_description)) || erro || "").toLowerCase();
    if (!navigator.onLine || texto.includes("failed to fetch") || texto.includes("network")) {
      return "Sem internet agora. Confira o Wi-Fi ou os dados móveis e tente de novo.";
    }
    if (texto.includes("invalid login credentials")) {
      return "E-mail ou senha não conferem. Confira e tente de novo, ou toque em Criar conta.";
    }
    if (texto.includes("already registered") || texto.includes("already been registered")) {
      return "Este e-mail já tem conta. Toque em Entrar.";
    }
    if (texto.includes("password") && (texto.includes("6") || texto.includes("short") || texto.includes("weak"))) {
      return "A senha precisa ter pelo menos 6 caracteres. Escolha uma maior.";
    }
    if (texto.includes("email") && (texto.includes("invalid") || texto.includes("valid"))) {
      return "Esse e-mail não parece certo. Confira se tem @ e o final, como .com.";
    }
    if (texto.includes("email not confirmed")) {
      return "A entrada pede confirmação de e-mail. Desligue isso no Supabase e tente de novo.";
    }
    if (texto.includes("rate limit") || texto.includes("too many")) {
      return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
    }
    if (texto.includes("jwt") || texto.includes("session")) {
      return "Sua entrada expirou. Toque em Sair e entre de novo.";
    }
    return "Algo deu errado. Tente de novo em instantes; se continuar, saia e entre de novo.";
  }

  function mostrarMsg(el, texto, tipo) {
    el.textContent = texto || "";
    el.className = "msg" + (tipo ? " " + tipo : "");
  }

  // ---------- Supabase ----------

  if (!window.supabase || !cfg) {
    carregando.textContent = "Não foi possível abrir o app. Confira a internet e recarregue a página.";
    return;
  }

  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_CHAVE_PUBLICA);

  // ---------- Utilidades ----------

  const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  function hojeISO() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function limitesDoMes() {
    const d = new Date();
    const ini = new Date(d.getFullYear(), d.getMonth(), 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const iso = (x) => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-01";
    return { inicio: iso(ini), fim: iso(fim) };
  }

  function lerValor(texto) {
    // Aceita "12,50", "12.50", "1.234,56" e "R$ 12,50".
    let t = String(texto).replace(/[^\d,.]/g, "");
    if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
    const n = Number(t);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  }

  function dataCurta(iso) {
    const [a, m, d] = iso.split("-");
    return d + "/" + m;
  }

  // ---------- Entrada ----------

  const formEntrada = $("form-entrada");
  const msgEntrada = $("msg-entrada");

  function lerCredenciais() {
    const email = $("email").value.trim();
    const senha = $("senha").value;
    if (!email || !senha) {
      mostrarMsg(msgEntrada, "Preencha o e-mail e a senha para continuar.", "erro");
      return null;
    }
    if (senha.length < 6) {
      mostrarMsg(msgEntrada, "A senha precisa ter pelo menos 6 caracteres. Escolha uma maior.", "erro");
      return null;
    }
    return { email, password: senha };
  }

  function travarEntrada(sim) {
    $("btn-entrar").disabled = sim;
    $("btn-criar").disabled = sim;
  }

  formEntrada.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cred = lerCredenciais();
    if (!cred) return;
    travarEntrada(true);
    mostrarMsg(msgEntrada, "Entrando…");
    const { error } = await sb.auth.signInWithPassword(cred);
    travarEntrada(false);
    if (error) mostrarMsg(msgEntrada, frase(error), "erro");
  });

  $("btn-criar").addEventListener("click", async () => {
    const cred = lerCredenciais();
    if (!cred) return;
    travarEntrada(true);
    mostrarMsg(msgEntrada, "Criando sua conta…");
    const { data, error } = await sb.auth.signUp(cred);
    travarEntrada(false);
    if (error) {
      mostrarMsg(msgEntrada, frase(error), "erro");
    } else if (!data.session) {
      mostrarMsg(msgEntrada, "Conta criada, mas a entrada pede confirmação de e-mail. Desligue isso no Supabase e toque em Entrar.", "erro");
    } else {
      $("senha").value = "";
    }
  });

  $("btn-sair").addEventListener("click", async () => {
    await sb.auth.signOut();
  });

  // ---------- Troca de telas ----------

  let usuario = null;

  sb.auth.onAuthStateChange((_evento, sessao) => {
    const novo = sessao ? sessao.user : null;
    if ((novo && novo.id) === (usuario && usuario.id)) return;
    usuario = novo;
    carregando.hidden = true;
    if (usuario) {
      telaEntrada.hidden = true;
      telaApp.hidden = false;
      abrirApp();
    } else {
      telaApp.hidden = true;
      telaEntrada.hidden = false;
      mostrarMsg(msgEntrada, "");
    }
  });

  // Se ninguém estiver conectado, mostra a entrada logo.
  sb.auth.getSession().then(({ data }) => {
    if (!data.session) {
      carregando.hidden = true;
      telaEntrada.hidden = false;
    }
  });

  // ---------- Boas-vindas (só no primeiro acesso) ----------

  function chaveBoasVindas() {
    return "meu-bolso-boas-vindas-" + usuario.id;
  }

  function mostrarBoasVindasSePreciso() {
    let ja = false;
    try { ja = localStorage.getItem(chaveBoasVindas()) === "vista"; } catch (_) {}
    $("boas-vindas").hidden = ja;
  }

  $("btn-fechar-boas-vindas").addEventListener("click", () => {
    try { localStorage.setItem(chaveBoasVindas(), "vista"); } catch (_) {}
    $("boas-vindas").hidden = true;
  });

  // ---------- Tela principal ----------

  let categoriaEscolhida = null;
  let gastosAtuais = [];
  let limites = {}; // { categoria: valor }
  let meta = null; // { id, nome, valor }
  let guardados = []; // [{ id, valor, data }]

  function montarChips() {
    const chips = $("chips");
    chips.textContent = "";
    cfg.CATEGORIAS.forEach((nome) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = nome;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", "false");
      b.addEventListener("click", () => {
        categoriaEscolhida = nome;
        chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-checked", c === b ? "true" : "false"));
      });
      chips.appendChild(b);
    });
  }

  function limparFormulario() {
    $("valor").value = "";
    $("descricao").value = "";
    $("data").value = hojeISO();
    categoriaEscolhida = null;
    $("chips").querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-checked", "false"));
  }

  function abrirApp() {
    const nomeMes = new Date().toLocaleDateString("pt-BR", { month: "long" });
    $("rotulo-mes").textContent = "Gasto em " + nomeMes;
    montarChips();
    limparFormulario();
    mostrarMsg($("msg-gasto"), "");
    mostrarMsg($("msg-assistente"), "");
    mostrarBoasVindasSePreciso();
    fecharLimites();
    fecharMeta();
    mostrarMsg($("msg-cofrinho"), "");
    limites = {};
    carregarLimites().then(carregarGastos);
    carregarCofrinho();
    carregarResumo();
  }

  async function carregarGastos() {
    const { inicio, fim } = limitesDoMes();
    const { data, error } = await sb
      .from("gastos")
      .select("id, data, descricao, valor, categoria")
      .gte("data", inicio)
      .lt("data", fim)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false });
    if (error) {
      mostrarMsg($("msg-gasto"), "Não consegui carregar seus gastos. " + frase(error), "erro");
      return;
    }
    gastosAtuais = data || [];
    desenhar(gastosAtuais);
  }

  function somarPorCategoria(gastos) {
    const porCategoria = {};
    gastos.forEach((g) => {
      porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + Number(g.valor);
    });
    return porCategoria;
  }

  function desenhar(gastos) {
    // Total e barras
    const porCategoria = somarPorCategoria(gastos);
    const total = Object.values(porCategoria).reduce((a, b) => a + b, 0);
    $("total-mes").textContent = moeda.format(total);

    const barras = $("barras");
    barras.textContent = "";
    const maior = Math.max(0, ...Object.values(porCategoria));
    cfg.CATEGORIAS
      .filter((c) => porCategoria[c] || limites[c])
      .sort((a, b) => (porCategoria[b] || 0) - (porCategoria[a] || 0))
      .forEach((c) => {
        const gasto = porCategoria[c] || 0;
        const limite = limites[c];
        const linha = document.createElement("div");
        linha.className = "barra";
        if (limite && gasto > limite) linha.classList.add("passou");
        else if (limite && gasto >= limite * 0.8) linha.classList.add("perto");
        const topo = document.createElement("div");
        topo.className = "barra-topo";
        const nome = document.createElement("span");
        nome.textContent = c;
        const valor = document.createElement("span");
        valor.textContent = limite
          ? moeda.format(gasto) + " de " + moeda.format(limite)
          : moeda.format(gasto);
        topo.append(nome, valor);
        const trilho = document.createElement("div");
        trilho.className = "trilho";
        const cheio = document.createElement("div");
        cheio.className = "cheio";
        const parte = limite ? gasto / limite : (maior ? gasto / maior : 0);
        cheio.style.width = Math.min(parte, 1) * 100 + "%";
        trilho.appendChild(cheio);
        linha.append(topo, trilho);
        barras.appendChild(linha);
      });

    desenharAlertas(porCategoria);
    desenharSugestao(porCategoria);

    // Lista
    const lista = $("lista");
    lista.textContent = "";
    $("lista-vazia").hidden = gastos.length > 0;
    gastos.forEach((g) => {
      const li = document.createElement("li");
      const info = document.createElement("div");
      info.className = "item-info";
      const titulo = document.createElement("strong");
      titulo.textContent = g.descricao || g.categoria;
      const detalhe = document.createElement("small");
      detalhe.textContent = dataCurta(g.data) + " · " + g.categoria;
      info.append(titulo, detalhe);
      const valor = document.createElement("span");
      valor.className = "item-valor";
      valor.textContent = moeda.format(Number(g.valor));
      const apagar = document.createElement("button");
      apagar.type = "button";
      apagar.className = "btn-apagar";
      apagar.textContent = "Apagar";
      apagar.setAttribute("aria-label", "Apagar " + titulo.textContent + " de " + valor.textContent);
      apagar.addEventListener("click", () => apagarGasto(g, apagar));
      li.append(info, valor, apagar);
      lista.appendChild(li);
    });
  }

  // ---------- Limites por categoria ----------

  function desenharAlertas(porCategoria) {
    const caixa = $("alertas");
    caixa.textContent = "";
    cfg.CATEGORIAS.forEach((c) => {
      const limite = limites[c];
      const gasto = porCategoria[c] || 0;
      if (!limite || gasto < limite * 0.8) return;
      const p = document.createElement("p");
      if (gasto > limite) {
        p.className = "alerta passou";
        p.textContent = "Atenção: " + c + " passou do limite em " + moeda.format(gasto - limite) + ".";
      } else {
        p.className = "alerta perto";
        p.textContent = c + " está em " + Math.round((gasto / limite) * 100) + "% do seu limite.";
      }
      caixa.appendChild(p);
    });
  }

  async function carregarLimites() {
    const { data, error } = await sb.from("limites").select("categoria, valor");
    if (error) {
      mostrarMsg($("msg-gasto"), "Não consegui carregar seus limites. " + frase(error), "erro");
      return;
    }
    limites = {};
    (data || []).forEach((l) => { limites[l.categoria] = Number(l.valor); });
  }

  function valorParaCampo(n) {
    return n ? n.toFixed(2).replace(".", ",") : "";
  }

  function abrirLimites() {
    const campos = $("campos-limites");
    campos.textContent = "";
    cfg.CATEGORIAS.forEach((c, i) => {
      const label = document.createElement("label");
      label.htmlFor = "limite-" + i;
      label.textContent = c;
      const input = document.createElement("input");
      input.id = "limite-" + i;
      input.type = "text";
      input.inputMode = "decimal";
      input.placeholder = "Sem limite";
      input.autocomplete = "off";
      input.dataset.categoria = c;
      input.value = valorParaCampo(limites[c]);
      campos.append(label, input);
    });
    mostrarMsg($("msg-limites"), "");
    $("form-limites").hidden = false;
    $("btn-limites").textContent = "Fechar limites";
    $("btn-limites").setAttribute("aria-expanded", "true");
  }

  function fecharLimites() {
    $("form-limites").hidden = true;
    $("btn-limites").textContent = "Definir limites";
    $("btn-limites").setAttribute("aria-expanded", "false");
  }

  $("btn-limites").addEventListener("click", () => {
    if ($("form-limites").hidden) abrirLimites();
    else fecharLimites();
  });

  $("form-limites").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("msg-limites");
    const salvar = [];
    const tirar = [];
    for (const input of $("campos-limites").querySelectorAll("input")) {
      const c = input.dataset.categoria;
      const texto = input.value.trim();
      if (!texto) {
        if (limites[c]) tirar.push(c);
        continue;
      }
      const valor = lerValor(texto);
      if (!(valor > 0)) {
        mostrarMsg(msg, "O limite de " + c + " não parece um valor. Escreva, por exemplo, 300,00.", "erro");
        input.focus();
        return;
      }
      salvar.push({ dono: usuario.id, categoria: c, valor });
    }
    const btn = $("btn-salvar-limites");
    btn.disabled = true;
    mostrarMsg(msg, "Salvando limites…");
    let erro = null;
    if (salvar.length) {
      const r = await sb.from("limites").upsert(salvar, { onConflict: "dono,categoria" });
      erro = r.error;
    }
    if (!erro && tirar.length) {
      const r = await sb.from("limites").delete().in("categoria", tirar);
      erro = r.error;
    }
    btn.disabled = false;
    if (erro) {
      mostrarMsg(msg, "Não consegui salvar os limites. " + frase(erro), "erro");
      return;
    }
    await carregarLimites();
    desenhar(gastosAtuais);
    fecharLimites();
  });

  // ---------- Meu cofrinho ----------

  function incentivo(parte) {
    if (parte >= 1) return "Meta alcançada! Parabéns, você conseguiu.";
    if (parte >= 0.75) return "Falta pouco: você já passou de 75%!";
    if (parte >= 0.5) return "Metade da meta! Você está indo muito bem.";
    if (parte >= 0.25) return "Um quarto do caminho! Continue assim.";
    if (parte > 0) return "Ótimo começo! Cada valor guardado conta.";
    return "Todo começo conta. Que tal guardar o primeiro valor?";
  }

  function totalGuardado() {
    return guardados.reduce((a, g) => a + Number(g.valor), 0);
  }

  async function carregarCofrinho() {
    const { data, error } = await sb
      .from("poupanca")
      .select("id, tipo, nome, valor, data")
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false });
    if (error) {
      mostrarMsg($("msg-cofrinho"), "Não consegui abrir o cofrinho. " + frase(error), "erro");
      return;
    }
    const linhas = data || [];
    const m = linhas.find((l) => l.tipo === "meta");
    meta = m ? { id: m.id, nome: m.nome, valor: Number(m.valor) } : null;
    guardados = linhas.filter((l) => l.tipo === "guardado");
    desenharCofrinho();
  }

  function desenharCofrinho() {
    $("cofrinho-convite").hidden = !!meta;
    $("cofrinho-meta").hidden = !meta;
    $("form-guardar").hidden = !meta;
    if ($("form-meta").hidden) $("btn-meta").textContent = meta ? "Mudar meta" : "Definir meta";

    const lista = $("lista-guardados");
    lista.textContent = "";
    if (!meta) return;

    const total = totalGuardado();
    const parte = total / meta.valor;
    $("meta-nome").textContent = meta.nome || "Minha meta";
    $("meta-guardado").textContent = moeda.format(total);
    $("meta-alvo").textContent = moeda.format(meta.valor);
    $("meta-barra").style.width = Math.min(parte, 1) * 100 + "%";
    $("meta-incentivo").textContent = incentivo(parte);
    $("cofrinho-meta").classList.toggle("alcancada", parte >= 1);

    // Últimos valores guardados, para corrigir se precisar.
    guardados.slice(0, 5).forEach((g) => {
      const li = document.createElement("li");
      const info = document.createElement("div");
      info.className = "item-info";
      const titulo = document.createElement("strong");
      titulo.textContent = "Guardei " + moeda.format(Number(g.valor));
      const detalhe = document.createElement("small");
      detalhe.textContent = dataCurta(g.data);
      info.append(titulo, detalhe);
      const apagar = document.createElement("button");
      apagar.type = "button";
      apagar.className = "btn-apagar";
      apagar.textContent = "Apagar";
      apagar.setAttribute("aria-label", "Apagar " + titulo.textContent + " de " + detalhe.textContent);
      apagar.addEventListener("click", () => apagarGuardado(g, apagar));
      li.append(info, apagar);
      lista.appendChild(li);
    });

    desenharSugestao(somarPorCategoria(gastosAtuais));
  }

  // Nos últimos dias do mês, se os gastos com limite estão abaixo do planejado, sugere guardar a sobra.
  function desenharSugestao(porCategoria) {
    const caixa = $("sugestao-guardar");
    caixa.textContent = "";
    caixa.hidden = true;
    const cats = Object.keys(limites);
    if (!meta || !cats.length) return;
    const hoje = new Date();
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    if (ultimoDia - hoje.getDate() > 5) return;
    const planejado = cats.reduce((a, c) => a + limites[c], 0);
    const gasto = cats.reduce((a, c) => a + (porCategoria[c] || 0), 0);
    const { inicio, fim } = limitesDoMes();
    const guardadoNoMes = guardados
      .filter((g) => g.data >= inicio && g.data < fim)
      .reduce((a, g) => a + Number(g.valor), 0);
    const sobra = Math.floor((planejado - gasto - guardadoNoMes) * 100) / 100;
    if (sobra <= 0) return;
    const texto = document.createElement("span");
    texto.textContent = "Sobraram " + moeda.format(sobra) + " do que você planejou gastar este mês. Que tal guardar?";
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn-texto";
    botao.textContent = "Guardar " + moeda.format(sobra);
    botao.addEventListener("click", () => {
      $("valor-guardar").value = valorParaCampo(sobra);
      $("valor-guardar").focus();
    });
    caixa.append(texto, botao);
    caixa.hidden = false;
  }

  $("form-guardar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("msg-cofrinho");
    const valor = lerValor($("valor-guardar").value);
    if (!(valor > 0)) {
      mostrarMsg(msg, "Digite quanto você guardou, por exemplo 50,00.", "erro");
      $("valor-guardar").focus();
      return;
    }
    const btn = $("btn-guardar");
    btn.disabled = true;
    mostrarMsg(msg, "Anotando…");
    const { error } = await sb.from("poupanca").insert({
      dono: usuario.id,
      tipo: "guardado",
      valor,
      data: hojeISO()
    });
    btn.disabled = false;
    if (error) {
      mostrarMsg(msg, "Não consegui anotar. " + frase(error), "erro");
      return;
    }
    $("valor-guardar").value = "";
    await carregarCofrinho();
    mostrarMsg(msg, "Anotado! Mais " + moeda.format(valor) + " no cofrinho.", "ok");
  });

  async function apagarGuardado(g, botao) {
    if (!confirm("Apagar o valor guardado de " + moeda.format(Number(g.valor)) + "?")) return;
    botao.disabled = true;
    const { error } = await sb.from("poupanca").delete().eq("id", g.id);
    if (error) {
      botao.disabled = false;
      alert("Não consegui apagar. " + frase(error));
      return;
    }
    mostrarMsg($("msg-cofrinho"), "");
    carregarCofrinho();
  }

  function abrirMeta() {
    $("meta-nome-campo").value = meta ? meta.nome || "" : "";
    $("meta-valor-campo").value = meta ? valorParaCampo(meta.valor) : "";
    mostrarMsg($("msg-meta"), "");
    $("form-meta").hidden = false;
    $("btn-meta").textContent = "Fechar";
    $("btn-meta").setAttribute("aria-expanded", "true");
  }

  function fecharMeta() {
    $("form-meta").hidden = true;
    $("btn-meta").textContent = meta ? "Mudar meta" : "Definir meta";
    $("btn-meta").setAttribute("aria-expanded", "false");
  }

  $("btn-meta").addEventListener("click", () => {
    if ($("form-meta").hidden) abrirMeta();
    else fecharMeta();
  });

  $("form-meta").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("msg-meta");
    const nome = $("meta-nome-campo").value.trim();
    const valor = lerValor($("meta-valor-campo").value);
    if (!nome) {
      mostrarMsg(msg, "Escreva para quê você quer juntar, por exemplo viagem.", "erro");
      $("meta-nome-campo").focus();
      return;
    }
    if (!(valor > 0)) {
      mostrarMsg(msg, "Escreva quanto quer juntar, por exemplo 2.000,00.", "erro");
      $("meta-valor-campo").focus();
      return;
    }
    const btn = $("btn-salvar-meta");
    btn.disabled = true;
    mostrarMsg(msg, "Salvando meta…");
    const r = meta
      ? await sb.from("poupanca").update({ nome, valor }).eq("id", meta.id)
      : await sb.from("poupanca").insert({ dono: usuario.id, tipo: "meta", nome, valor });
    btn.disabled = false;
    if (r.error) {
      mostrarMsg(msg, "Não consegui salvar a meta. " + frase(r.error), "erro");
      return;
    }
    await carregarCofrinho();
    fecharMeta();
  });

  async function apagarGasto(g, botao) {
    const nome = g.descricao || g.categoria;
    if (!confirm("Apagar " + nome + " de " + moeda.format(Number(g.valor)) + "?")) return;
    botao.disabled = true;
    const { error } = await sb.from("gastos").delete().eq("id", g.id);
    if (error) {
      botao.disabled = false;
      alert("Não consegui apagar. " + frase(error));
      return;
    }
    carregarGastos();
  }

  // ---------- Lançar à mão ----------

  $("form-gasto").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("msg-gasto");
    const valor = lerValor($("valor").value);
    if (!(valor > 0)) {
      mostrarMsg(msg, "Digite o valor do gasto, por exemplo 12,50.", "erro");
      $("valor").focus();
      return;
    }
    if (!categoriaEscolhida) {
      mostrarMsg(msg, "Toque numa categoria antes de salvar.", "erro");
      return;
    }
    const data = $("data").value || hojeISO();
    const categoria = categoriaEscolhida;
    const antes = somarPorCategoria(gastosAtuais)[categoria] || 0;
    const btn = $("btn-salvar");
    btn.disabled = true;
    mostrarMsg(msg, "Salvando…");
    const { error } = await sb.from("gastos").insert({
      dono: usuario.id,
      data,
      descricao: $("descricao").value.trim() || null,
      valor,
      categoria: categoriaEscolhida,
      origem: "manual"
    });
    btn.disabled = false;
    if (error) {
      mostrarMsg(msg, "Não consegui salvar. " + frase(error), "erro");
      return;
    }
    // Alerta na hora, se este gasto cruzou o limite (só conta para o mês atual).
    const limite = limites[categoria];
    const doMes = data >= limitesDoMes().inicio && data < limitesDoMes().fim;
    const depois = antes + valor;
    if (limite && doMes && depois > limite && antes <= limite) {
      mostrarMsg(msg, "Gasto salvo. Atenção: " + categoria + " passou do limite do mês.", "alerta-msg");
    } else if (limite && doMes && depois >= limite * 0.8 && antes < limite * 0.8 && depois <= limite) {
      mostrarMsg(msg, "Gasto salvo. " + categoria + " chegou a " + Math.round((depois / limite) * 100) + "% do limite.", "ok");
    } else {
      mostrarMsg(msg, "Gasto salvo!", "ok");
    }
    limparFormulario();
    carregarGastos();
  });

  // ---------- Resumo da semana ----------

  async function carregarResumo() {
    const { data, error } = await sb
      .from("resumos")
      .select("texto")
      .order("criado_em", { ascending: false })
      .limit(1);
    const cartao = $("cartao-resumo");
    if (error || !data || !data.length || !data[0].texto) {
      cartao.hidden = true;
      return;
    }
    $("texto-resumo").textContent = data[0].texto;
    cartao.hidden = false;
  }

  // ---------- Assistente ----------

  const LADO_MAXIMO = 1600;

  function travarAssistente(sim) {
    $("btn-enviar").disabled = sim;
    $("btn-camera").disabled = sim;
    $("btn-galeria").disabled = sim;
  }

  // Reduz a foto no aparelho (no máximo 1600 px, JPEG) e devolve só o base64.
  // A foto não é guardada em lugar nenhum.
  function reduzirFoto(arquivo) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
        const largura = Math.round(img.naturalWidth * escala);
        const altura = Math.round(img.naturalHeight * escala);
        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, largura, altura);
        ctx.drawImage(img, 0, 0, largura, altura);
        URL.revokeObjectURL(url);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        canvas.width = canvas.height = 0;
        const imagem = dataUrl.split(",")[1] || "";
        if (imagem.length < 100) {
          reject(new Error("foto"));
          return;
        }
        resolve({ imagem, largura, altura });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("foto"));
      };
      img.src = url;
    });
  }

  async function falarComAssistente(pedido) {
    const msg = $("msg-assistente");
    const { data } = await sb.auth.getSession();
    const token = data.session && data.session.access_token;
    if (!token) {
      mostrarMsg(msg, "Sua entrada venceu. Toque em Sair e entre de novo.", "erro");
      return;
    }
    travarAssistente(true);
    mostrarMsg(msg, pedido.imagem ? "Lendo o cupom…" : "Pensando…", "info");
    let resposta;
    try {
      const r = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(Object.assign({ categorias: cfg.CATEGORIAS }, pedido))
      });
      if (r.status === 404) {
        mostrarMsg(msg, "Não encontrei o assistente. Ele funciona no endereço publicado na Netlify.", "erro");
        return;
      }
      try { resposta = await r.json(); } catch (_) { resposta = {}; }
      if (!r.ok || resposta.erro) {
        mostrarMsg(msg, resposta.erro || "O assistente não respondeu. Tente de novo em instantes ou lance à mão.", "erro");
        return;
      }
    } catch (erro) {
      mostrarMsg(msg, frase(erro), "erro");
      return;
    } finally {
      travarAssistente(false);
    }
    mostrarMsg(msg, resposta.resposta, resposta.lancou ? "ok" : "info");
    if (resposta.lancou) {
      $("frase").value = "";
      carregarGastos();
    }
  }

  $("form-assistente").addEventListener("submit", (e) => {
    e.preventDefault();
    const mensagem = $("frase").value.trim();
    if (!mensagem) {
      mostrarMsg($("msg-assistente"), "Escreva um gasto, como mercado 50 hoje, ou uma pergunta.", "erro");
      $("frase").focus();
      return;
    }
    falarComAssistente({ mensagem });
  });

  // "Tirar foto" abre a câmera traseira; "Da galeria" abre as fotos salvas.
  $("btn-camera").addEventListener("click", () => $("foto-camera").click());
  $("btn-galeria").addEventListener("click", () => $("foto-galeria").click());
  $("foto-camera").addEventListener("change", (e) => enviarFoto(e.target));
  $("foto-galeria").addEventListener("change", (e) => enviarFoto(e.target));

  async function enviarFoto(input) {
    const arquivo = input.files && input.files[0];
    input.value = ""; // esquece o arquivo escolhido
    if (!arquivo) return;
    // Alguns celulares entregam a foto sem tipo; nesses casos tentamos abrir mesmo assim.
    if (arquivo.type && !arquivo.type.startsWith("image/")) {
      mostrarMsg($("msg-assistente"), "Escolha uma foto do cupom (imagem).", "erro");
      return;
    }
    let foto;
    try {
      foto = await reduzirFoto(arquivo);
    } catch (_) {
      mostrarMsg($("msg-assistente"), "Não consegui abrir essa foto. Tente pelo botão Tirar foto, ou escolha uma foto em JPEG na galeria.", "erro");
      return;
    }
    falarComAssistente({
      mensagem: $("frase").value.trim(),
      imagem: foto.imagem,
      mime: "image/jpeg"
    });
  }
})();
