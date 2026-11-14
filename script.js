/* =========================================================
   ASTRONER.D · Lógica do site
   Módulos:
     1. Utilitários
     2. Menu mobile
     3. Fundo de estrelas (canvas)
     4. Hub de conteúdo
     5. Calendário e fase da Lua
     6. Calculadora (distâncias e magnitudes)
     7. Formulário de contato (mailto)
   ========================================================= */

'use strict';

/* ---------- 1. Utilitários ---------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* Constantes astronômicas úteis */
const AU_KM   = 149_597_870.7;  // 1 UA em km
const LY_KM   = 9.4607e12;      // 1 ano-luz em km
const PC_KM   = 3.0857e13;      // 1 parsec em km

/* ---------- 2. Menu mobile ---------- */
function initMenu() {
  const toggle = $('.menu-toggle');
  const menu   = $('#menu');

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Fecha o menu ao clicar em um link (melhor UX no mobile)
  $$('a', menu).forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ---------- 3. Fundo de estrelas (canvas) ---------- */
function initStarfield() {
  const canvas = $('#starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];

  // Quantidade de estrelas proporcional à área da tela (limitada para performance)
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const count = Math.min(220, Math.floor((canvas.width * canvas.height) / 9000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.2,
      speed: Math.random() * 0.15 + 0.02,
      alpha: Math.random(),
      twinkle: Math.random() * 0.02 + 0.005
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of stars) {
      // Cintilação suave
      s.alpha += s.twinkle;
      if (s.alpha > 1 || s.alpha < 0.15) s.twinkle *= -1;

      // Movimento lento de "deriva"
      s.y += s.speed;
      if (s.y > canvas.height) s.y = 0;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232, 236, 255, ${s.alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  // Respeita a preferência de movimento reduzido: desenha uma vez, sem animar
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  resize();
  window.addEventListener('resize', resize);
  if (reduceMotion) { draw(); cancelAnimationFrame; } else { draw(); }
}

/* ---------- 4. Hub de conteúdo ---------- */
// Conteúdo de cada categoria. Para expandir, basta adicionar entradas aqui.
const CATEGORIAS = {
  'sistema-solar': {
    titulo: 'Sistema Solar',
    texto: 'Oito planetas, luas, asteroides, cometas e o Cinturão de Kuiper.',
    itens: [
      'Planetas rochosos: Mercúrio, Vênus, Terra e Marte.',
      'Planetas gasosos e gigantes gelados: Júpiter, Saturno, Urano e Netuno.',
      'Cinturão de asteroides entre Marte e Júpiter.',
      'Objetos próximos da Terra (NEOs), foco das campanhas de caça a asteroides.'
    ]
  },
  'espaco-profundo': {
    titulo: 'Espaço Profundo',
    texto: 'Nebulosas, galáxias e buracos negros.',
    itens: [
      'Nebulosas: berçários de estrelas formados por gás e poeira.',
      'Galáxias: sistemas com bilhões de estrelas, como a Via Láctea.',
      'Buracos negros: regiões onde a gravidade impede a saída de luz.'
    ]
  },
  'missoes': {
    titulo: 'Missões Espaciais',
    texto: 'Acompanhe missões de agências como NASA, ESA e JAXA.',
    itens: [
      'NASA: telescópios como o James Webb e missões a Marte e à Lua.',
      'ESA: observatórios como Gaia e missões de exploração planetária.',
      'JAXA e ISRO: missões japonesas e indianas à Lua e a asteroides.'
    ]
  },
  'observacao': {
    titulo: 'Guia de Observação',
    texto: 'Primeiros passos para quem quer observar o céu.',
    itens: [
      'Comece a olho nu, em local escuro, longe das luzes da cidade.',
      'Binóculos 7x50 ou 10x50 são ótimos para começar.',
      'Use aplicativos de mapa celeste para identificar constelações.',
      'Acompanhe a Lua: a fase crescente é ideal para ver crateras.'
    ]
  }
};

function initHub() {
  const output = $('#category-output');

  $$('.category-card').forEach(card => {
    card.addEventListener('click', (event) => {
      event.preventDefault();
      const key = card.dataset.category;
      const data = CATEGORIAS[key];
      if (!data) return;

      // Marca o cartão ativo
      $$('.category-card').forEach(c => c.classList.remove('is-active'));
      card.classList.add('is-active');

      // Monta o conteúdo com segurança (sem innerHTML para texto dinâmico)
      output.textContent = '';
      const box = document.createElement('article');
      box.className = 'card';

      const h3 = document.createElement('h3');
      h3.textContent = data.titulo;

      const p = document.createElement('p');
      p.textContent = data.texto;

      const ul = document.createElement('ul');
      data.itens.forEach(texto => {
        const li = document.createElement('li');
        li.textContent = texto;
        ul.appendChild(li);
      });

      box.append(h3, p, ul);
      output.appendChild(box);
    });
  });
}

/* ---------- 5. Calendário e fase da Lua ---------- */

// Referência: lua nova conhecida (6 de janeiro de 2000, 18:14 UTC)
const LUA_NOVA_REF = Date.UTC(2000, 0, 6, 18, 14);
const LUNAR_CICLO_DIAS = 29.530588853;

// Fases com ícone e nome
const FASES = [
  { limite: 0.0625, nome: 'Lua nova',            icone: '🌑' },
  { limite: 0.1875, nome: 'Lua crescente',       icone: '🌒' },
  { limite: 0.3125, nome: 'Quarto crescente',    icone: '🌓' },
  { limite: 0.4375, nome: 'Crescente gibosa',    icone: '🌔' },
  { limite: 0.5625, nome: 'Lua cheia',           icone: '🌕' },
  { limite: 0.6875, nome: 'Minguante gibosa',    icone: '🌖' },
  { limite: 0.8125, nome: 'Quarto minguante',    icone: '🌗' },
  { limite: 0.9375, nome: 'Lua minguante',       icone: '🌘' },
  { limite: 1.0001, nome: 'Lua nova',            icone: '🌑' }
];

/* Calcula a idade da Lua (0 a ~29,53 dias) para uma data */
function idadeDaLua(data = new Date()) {
  const dias = (data.getTime() - LUA_NOVA_REF) / 86_400_000;
  return ((dias % LUNAR_CICLO_DIAS) + LUNAR_CICLO_DIAS) % LUNAR_CICLO_DIAS;
}

/* Iluminação aproximada (0 a 100%) a partir da idade */
function iluminacao(idade) {
  const fracao = idade / LUNAR_CICLO_DIAS;
  return Math.round((1 - Math.cos(2 * Math.PI * fracao)) / 2 * 100);
}

/* Próxima data em que ocorre uma fase específica (aprox.) */
function proximaFase(alvoFracao, de = new Date()) {
  const idadeAtual = idadeDaLua(de);
  const alvoIdade = alvoFracao * LUNAR_CICLO_DIAS;
  let diff = alvoIdade - idadeAtual;
  if (diff <= 0) diff += LUNAR_CICLO_DIAS;
  return new Date(de.getTime() + diff * 86_400_000);
}

// Eventos astronômicos fixos (exemplos; atualize conforme o calendário anual)
// Formato: { data: 'AAAA-MM-DD', nome: '...' }
const EVENTOS = [
  { data: '2026-12-13', nome: 'Chuva de meteoros Geminídeas (pico)' },
  { data: '2027-01-03', nome: 'Quadrantídeas (pico)' },
  { data: '2027-08-02', nome: 'Eclipse solar total (visível em faixa)' },
  { data: '2027-08-22', nome: 'Chuva de meteoros Perseidas (pico, aprox.)' }
];

function formatarData(d) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initCalendario() {
  const agora = new Date();
  const idade = idadeDaLua(agora);
  const fracao = idade / LUNAR_CICLO_DIAS;

  // Encontra a fase atual pelo limite correspondente
  const fase = FASES.find(f => fracao < f.limite) || FASES[0];

  $('#moon-icon').textContent = fase.icone;
  $('#moon-phase-name').textContent = fase.nome;
  $('#moon-illumination').textContent = `Iluminação aprox.: ${iluminacao(idade)}%`;

  // Lista de eventos futuros, ordenada por data
  const lista = $('#events-list');
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  // Próxima lua cheia e nova, adicionadas dinamicamente
  const luaCheia = proximaFase(0.5, agora);
  const luaNova  = proximaFase(0,   agora);
  const eventos = [
    { data: luaNova,  nome: 'Próxima lua nova (aprox.)' },
    { data: luaCheia, nome: 'Próxima lua cheia (aprox.)' },
    ...EVENTOS.map(e => ({ data: new Date(e.data + 'T00:00:00'), nome: e.nome }))
  ]
    .filter(e => e.data >= hoje)
    .sort((a, b) => a.data - b.data)
    .slice(0, 6);

  eventos.forEach(e => {
    const li = document.createElement('li');
    const nome = document.createElement('span');
    nome.textContent = e.nome;
    const time = document.createElement('time');
    time.textContent = formatarData(e.data);
    li.append(nome, time);
    lista.appendChild(li);
  });
}

/* ---------- 6. Calculadora ---------- */

// Conversão de distância: tudo passa por quilômetros
const PARA_KM = { km: 1, au: AU_KM, ly: LY_KM, pc: PC_KM };

function converterDistancia() {
  const valor = parseFloat($('#dist-value').value);
  const de    = $('#dist-from').value;
  const para  = $('#dist-to').value;
  const out   = $('#dist-result');

  if (Number.isNaN(valor)) {
    out.textContent = 'Digite um valor válido.';
    return;
  }

  const emKm    = valor * PARA_KM[de];
  const resultado = emKm / PARA_KM[para];

  // Notação científica para valores muito grandes ou pequenos
  const texto = (Math.abs(resultado) >= 1e6 || (Math.abs(resultado) < 1e-3 && resultado !== 0))
    ? resultado.toExponential(4)
    : resultado.toLocaleString('pt-BR', { maximumFractionDigits: 4 });

  out.textContent = `${valor} ${de.toUpperCase()} = ${texto} ${para.toUpperCase()}`;
}

// Diferença de magnitude: Δm = m_B − m_A
// Brilho relativo: a razão de brilho entre os objetos é 10^(0,4 · Δm)
function calcularMagnitude() {
  const magA = parseFloat($('#mag-a').value);
  const magB = parseFloat($('#mag-b').value);
  const out  = $('#mag-result');

  if (Number.isNaN(magA) || Number.isNaN(magB)) {
    out.textContent = 'Digite as duas magnitudes.';
    return;
  }

  const delta = magB - magA;
  const razao = Math.pow(10, 0.4 * Math.abs(delta));
  const maisBrilhante = delta > 0 ? 'A' : (delta < 0 ? 'B' : null);

  if (!maisBrilhante) {
    out.textContent = 'As duas magnitudes são iguais.';
    return;
  }

  out.textContent =
    `Δm = ${delta.toFixed(2)} · O objeto ${maisBrilhante} é ` +
    `${razao.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}× mais brilhante.`;
}

function initCalculadora() {
  const form = $('#calc-form');

  // Atualiza ao digitar ou trocar opções (sem precisar de botão)
  form.addEventListener('input', () => {
    converterDistancia();
    calcularMagnitude();
  });
  form.addEventListener('change', () => {
    converterDistancia();
    calcularMagnitude();
  });
  form.addEventListener('submit', e => e.preventDefault());

  // Primeiro cálculo ao carregar a página
  converterDistancia();
  calcularMagnitude();
}

/* ---------- 7. Formulário de contato ---------- */
const EMAIL_CONTATO = 'fdacruzchagas@gmail.com';

function initContato() {
  const form = $('#contact-form');
  const feedback = $('#form-feedback');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const nome     = form.nome.value.trim();
    const email    = form.email.value.trim();
    const mensagem = form.mensagem.value.trim();

    if (!nome || !email || !mensagem) {
      feedback.textContent = 'Preencha todos os campos.';
      return;
    }

    // Monta um e-mail pronto no cliente de e-mail do visitante
    const assunto = `Contato pelo Astroner.d: ${nome}`;
    const corpo   = `${mensagem}\n\n---\nNome: ${nome}\nE-mail: ${email}`;
    const link    = `mailto:${EMAIL_CONTATO}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;

    window.location.href = link;
    feedback.textContent = 'Abrindo seu aplicativo de e-mail...';
    form.reset();
  });
}

/* ---------- 8. Inicialização ---------- */
document.addEventListener('DOMContentLoaded', () => {
  $('#year').textContent = new Date().getFullYear();

  initMenu();
  initStarfield();
  initHub();
  initCalendario();
  initCalculadora();
  initContato();
});