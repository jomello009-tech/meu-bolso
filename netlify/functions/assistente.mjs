// Meu Bolso — assistente (função da Netlify).
// Recebe uma frase ou a foto de um cupom, pede ao Gemini para escolher uma ferramenta
// e grava ou consulta os gastos no Supabase COM O LOGIN DA PRÓPRIA PESSOA,
// para a proteção por linha valer. Os totais vêm sempre da soma do banco.
//
// A chave do Gemini fica só no servidor, em process.env.CHAVE_GEMINI.
// Aqui só entram a URL e a chave PÚBLICA do Supabase (as mesmas de app/configuracao.js).

const SUPABASE_URL = "https://konecvfhrsxotttqmjue.supabase.co";
const SUPABASE_CHAVE_PUBLICA = "sb_publishable_5uBMheRjJWEUGHYHuUtagw_lapq_Bav";

const MODELO = "gemini-3.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

const CATEGORIAS_PADRAO = [
  "Mercado", "Contas da casa", "Prestação da casa", "Gasolina",
  "Medicamentos", "Academia", "Lazer", "Outros"
];

const MAX_IMAGEM = 6_000_000; // caracteres em base64 (~4,5 MB)

export const config = { path: "/api/assistente" };

// ---------- Utilidades ----------

class ErroFalado extends Error {
  constructor(frase, status = 400) {
    super(frase);
    this.status = status;
  }
}

function responder(corpo, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function hojeSaoPaulo() {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function dataValida(texto) {
  if (typeof texto !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const d = new Date(texto + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

function dataBR(iso) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function limparCategorias(lista) {
  if (!Array.isArray(lista)) return CATEGORIAS_PADRAO;
  const ok = lista
    .filter((c) => typeof c === "string" && c.trim() && c.length <= 40)
    .map((c) => c.trim())
    .slice(0, 20);
  if (!ok.length) return CATEGORIAS_PADRAO;
  if (!ok.includes("Outros")) ok.push("Outros");
  return ok;
}

function acharCategoria(nome, categorias) {
  if (typeof nome !== "string") return null;
  const alvo = nome.trim().toLocaleLowerCase("pt-BR");
  return categorias.find((c) => c.toLocaleLowerCase("pt-BR") === alvo) || null;
}

// ---------- Supabase (sempre com o token da pessoa) ----------

function cabecalhosSupabase(token, extra = {}) {
  return {
    apikey: SUPABASE_CHAVE_PUBLICA,
    Authorization: `Bearer ${token}`,
    ...extra
  };
}

async function conferirLogin(token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: cabecalhosSupabase(token) });
  if (r.status === 401 || r.status === 403) {
    throw new ErroFalado("Sua entrada venceu. Toque em Sair, entre de novo e repita.", 401);
  }
  if (!r.ok) {
    throw new ErroFalado("Não consegui conferir sua entrada agora. Tente de novo em instantes.", 502);
  }
  const usuario = await r.json();
  if (!usuario || !usuario.id) {
    throw new ErroFalado("Sua entrada venceu. Toque em Sair, entre de novo e repita.", 401);
  }
  return usuario;
}

async function erroDoBanco(r) {
  let corpo = {};
  try { corpo = await r.json(); } catch (_) {}
  const texto = `${corpo.code || ""} ${corpo.message || ""}`.toLowerCase();
  if (r.status === 401 || texto.includes("jwt")) {
    return new ErroFalado("Sua entrada venceu. Toque em Sair, entre de novo e repita.", 401);
  }
  if (texto.includes("42p01") || texto.includes("pgrst205") || texto.includes("does not exist") || texto.includes("could not find the table")) {
    return new ErroFalado("A tabela de gastos não existe no Supabase. Crie a tabela gastos e tente de novo.", 500);
  }
  if (texto.includes("row-level security") || r.status === 403) {
    return new ErroFalado("O banco não deixou gravar este gasto. Saia, entre de novo e repita.", 403);
  }
  return new ErroFalado("O banco não respondeu como esperado. Tente de novo em instantes.", 502);
}

async function gravarGasto(token, gasto) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/gastos`, {
    method: "POST",
    headers: cabecalhosSupabase(token, {
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify(gasto)
  });
  if (!r.ok) throw await erroDoBanco(r);
  const linhas = await r.json();
  return linhas[0] || gasto;
}

async function somarGastos(token, desde, ate, categoria) {
  const p = new URLSearchParams();
  p.set("select", "valor");
  p.append("data", `gte.${desde}`);
  p.append("data", `lte.${ate}`);
  if (categoria) p.set("categoria", `eq.${categoria}`);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/gastos?${p}`, { headers: cabecalhosSupabase(token) });
  if (!r.ok) throw await erroDoBanco(r);
  const linhas = await r.json();
  // Soma em centavos para não errar arredondamento.
  const centavos = linhas.reduce((a, l) => a + Math.round(Number(l.valor) * 100), 0);
  return { total: centavos / 100, quantidade: linhas.length };
}

// ---------- Gemini ----------

function ferramentas(categorias) {
  return [{
    function_declarations: [
      {
        name: "registrar_gasto",
        description: "Registra um gasto que a pessoa fez.",
        parameters: {
          type: "OBJECT",
          properties: {
            data: { type: "STRING", description: "Data do gasto no formato AAAA-MM-DD." },
            descricao: { type: "STRING", description: "Onde ou com o quê foi o gasto (ex.: nome da loja)." },
            valor: { type: "NUMBER", description: "Valor em reais, maior que zero. Em cupom, o VALOR TOTAL." },
            categoria: { type: "STRING", enum: categorias, description: "Uma das categorias da pessoa." }
          },
          required: ["data", "valor", "categoria"]
        }
      },
      {
        name: "consultar_gastos",
        description: "Consulta quanto a pessoa gastou num período, opcionalmente numa categoria.",
        parameters: {
          type: "OBJECT",
          properties: {
            desde: { type: "STRING", description: "Primeiro dia do período, AAAA-MM-DD." },
            ate: { type: "STRING", description: "Último dia do período, AAAA-MM-DD." },
            categoria: { type: "STRING", enum: categorias, description: "Categoria, se a pergunta citar uma." }
          },
          required: ["desde", "ate"]
        }
      }
    ]
  }];
}

function promptDoSistema(hoje, categorias) {
  return [
    "Você é o assistente do Meu Bolso, um app de gastos pessoais. Responda sempre em português do Brasil, em frases curtas e gentis.",
    `Hoje é ${hoje} (horário de São Paulo). Use esta data para entender "hoje", "ontem", "este mês", "semana passada" etc.`,
    `As categorias da pessoa são: ${categorias.join(", ")}. Use sempre uma delas; se nenhuma servir, use "Outros".`,
    "Quando a pessoa contar um gasto, chame registrar_gasto. Se faltar a data, use hoje. Se faltar o valor, NÃO invente: pergunte o valor.",
    "Quando a pessoa perguntar quanto gastou, chame consultar_gastos com o período certo. Nunca calcule nem invente totais: o app soma no banco.",
    "Quando vier a foto de um cupom fiscal, chame registrar_gasto usando o VALOR TOTAL do cupom, a DATA DE EMISSÃO e o NOME DA LOJA como descrição, e escolha a categoria pelo tipo de loja ou de produtos. Se a foto não for um cupom ou estiver ilegível, diga isso e peça outra foto.",
    "Nunca peça nem comente senha, número de cartão, conta bancária, salário ou saldo."
  ].join("\n");
}

async function perguntarAoGemini(chave, { mensagem, imagem, mime, hoje, categorias }) {
  const partes = [];
  if (mensagem) partes.push({ text: mensagem });
  if (imagem) {
    if (!mensagem) partes.push({ text: "Esta é a foto de um cupom fiscal. Lance o gasto." });
    partes.push({ inline_data: { mime_type: mime, data: imagem } });
  }

  let r;
  try {
    r = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: promptDoSistema(hoje, categorias) }] },
        contents: [{ role: "user", parts: partes }],
        tools: ferramentas(categorias),
        tool_config: { function_calling_config: { mode: "AUTO" } },
        generationConfig: { temperature: 0 }
      })
    });
  } catch (_) {
    throw new ErroFalado("Não consegui falar com o Gemini agora. Tente de novo em instantes.", 502);
  }

  if (!r.ok) {
    let corpo = {};
    try { corpo = await r.json(); } catch (_) {}
    const texto = JSON.stringify(corpo).toLowerCase();
    if (r.status === 429 || texto.includes("resource_exhausted") || texto.includes("quota")) {
      throw new ErroFalado("O assistente atingiu o limite de uso por agora. Espere alguns minutos e tente de novo, ou lance à mão.", 429);
    }
    if (texto.includes("api key") || texto.includes("api_key") || r.status === 401 || r.status === 403) {
      throw new ErroFalado("A chave do Gemini não foi aceita. Confira a CHAVE_GEMINI na Netlify e publique de novo.", 500);
    }
    if (r.status === 404) {
      throw new ErroFalado(`O modelo ${MODELO} não foi encontrado no Gemini. Confira o nome do modelo na função.`, 500);
    }
    if (texto.includes("image") || texto.includes("inline_data")) {
      throw new ErroFalado("Não consegui ler essa foto. Tire outra, com o cupom inteiro e bem iluminado.", 400);
    }
    throw new ErroFalado("O Gemini não respondeu como esperado. Tente de novo em instantes.", 502);
  }

  const dados = await r.json();
  const candidato = dados.candidates && dados.candidates[0];
  const partesResposta = (candidato && candidato.content && candidato.content.parts) || [];
  const chamada = partesResposta.find((p) => p.functionCall || p.function_call);
  if (chamada) {
    const fc = chamada.functionCall || chamada.function_call;
    return { ferramenta: fc.name, args: fc.args || {} };
  }
  const texto = partesResposta.map((p) => p.text || "").join("").trim();
  return { texto: texto || "Não entendi. Conte o gasto assim: mercado 50 hoje." };
}

// ---------- Ferramentas ----------

async function executarRegistro(token, usuario, args, { hoje, categorias, origem }) {
  const valor = Math.round(Number(args.valor) * 100) / 100;
  if (!(valor > 0)) {
    return { resposta: "Não achei o valor do gasto. Qual foi o valor?", lancou: false };
  }
  const data = dataValida(args.data) ? args.data : hoje;
  const categoria = acharCategoria(args.categoria, categorias) || "Outros";
  const descricao = typeof args.descricao === "string" && args.descricao.trim()
    ? args.descricao.trim().slice(0, 80)
    : null;

  const salvo = await gravarGasto(token, {
    dono: usuario.id,
    data,
    descricao,
    valor,
    categoria,
    origem
  });

  const v = moeda.format(Number(salvo.valor));
  const desc = salvo.descricao ? `: ${salvo.descricao}` : "";
  return {
    resposta: `Lancei ${v} em ${salvo.categoria}${desc}, ${dataBR(salvo.data)}.`,
    lancou: true
  };
}

async function executarConsulta(token, args, { hoje, categorias }) {
  const inicioDoMes = hoje.slice(0, 8) + "01";
  let desde = dataValida(args.desde) ? args.desde : inicioDoMes;
  let ate = dataValida(args.ate) ? args.ate : hoje;
  if (desde > ate) [desde, ate] = [ate, desde];
  const categoria = acharCategoria(args.categoria, categorias);

  const { total, quantidade } = await somarGastos(token, desde, ate, categoria);
  const onde = categoria ? ` com ${categoria}` : "";
  const periodo = desde === ate ? `em ${dataBR(desde)}` : `de ${dataBR(desde)} a ${dataBR(ate)}`;
  const vezes = quantidade === 1 ? "1 gasto" : `${quantidade} gastos`;
  return {
    resposta: quantidade
      ? `Você gastou ${moeda.format(total)}${onde} ${periodo} (${vezes}).`
      : `Não encontrei gastos${onde} ${periodo}.`,
    lancou: false
  };
}

// ---------- Entrada da função ----------

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return responder({ erro: "Use o assistente pelo app." }, 405);
    }

    const chave = process.env.CHAVE_GEMINI;
    if (!chave) {
      throw new ErroFalado("O assistente ainda não tem a chave do Gemini. Cadastre CHAVE_GEMINI na Netlify e publique de novo.", 500);
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token) {
      throw new ErroFalado("Você precisa entrar no app para usar o assistente.", 401);
    }

    let corpo;
    try { corpo = await req.json(); } catch (_) {
      throw new ErroFalado("Não entendi o pedido. Recarregue a página e tente de novo.", 400);
    }

    const mensagem = typeof corpo.mensagem === "string" ? corpo.mensagem.trim().slice(0, 500) : "";
    const imagem = typeof corpo.imagem === "string" ? corpo.imagem : "";
    const mime = ["image/jpeg", "image/png", "image/webp"].includes(corpo.mime) ? corpo.mime : "image/jpeg";
    const categorias = limparCategorias(corpo.categorias);

    if (!mensagem && !imagem) {
      throw new ErroFalado("Escreva um gasto, como mercado 50 hoje, ou mande a foto do cupom.", 400);
    }
    if (imagem.length > MAX_IMAGEM) {
      throw new ErroFalado("A foto ficou grande demais. Tente de novo com uma foto mais leve.", 413);
    }

    const usuario = await conferirLogin(token);
    const hoje = hojeSaoPaulo();
    const origem = imagem ? "foto" : "texto";

    const escolha = await perguntarAoGemini(chave, { mensagem, imagem, mime, hoje, categorias });

    if (escolha.ferramenta === "registrar_gasto") {
      return responder(await executarRegistro(token, usuario, escolha.args, { hoje, categorias, origem }));
    }
    if (escolha.ferramenta === "consultar_gastos") {
      return responder(await executarConsulta(token, escolha.args, { hoje, categorias }));
    }
    return responder({ resposta: escolha.texto, lancou: false });
  } catch (erro) {
    if (erro instanceof ErroFalado) {
      return responder({ erro: erro.message }, erro.status);
    }
    console.error("assistente:", erro);
    return responder({ erro: "Algo deu errado no assistente. Tente de novo em instantes ou lance à mão." }, 500);
  }
};
