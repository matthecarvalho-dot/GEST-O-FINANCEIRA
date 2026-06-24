// KRONOS SYSTEM - Firebase + Chart.js
const firebaseConfig = {
    apiKey: "AIzaSyD6Mv3DiNGWCoC4Rd0iOt6L22qxnS-XAhY",
    authDomain: "kronos-gestao-fincanceira.firebaseapp.com",
    databaseURL: "https://kronos-gestao-fincanceira-default-rtdb.firebaseio.com",
    projectId: "kronos-gestao-fincanceira",
    storageBucket: "kronos-gestao-fincanceira.firebasestorage.app",
    messagingSenderId: "26146570774",
    appId: "1:26146570774:web:0ca1bdf457eae2623eeb37"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const clientesRef = db.ref('kronos_system/clientes');
let todosClientes = {};
let graficos = {};

function fazerLogin() {
    if (document.getElementById('loginUser').value === 'admin' && document.getElementById('loginPass').value === 'admin') {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainSystem').style.display = 'block';
        inicializar();
    } else { alert('Usuário ou senha incorretos!'); }
}

function sair() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainSystem').style.display = 'none';
}

function inicializar() {
    atualizarData();
    carregarMeses();
    carregarClientes();
    verificarBanco();
    mostrarPagina('dashboard');
}

function atualizarData() {
    document.getElementById('dataAtual').textContent = new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

async function verificarBanco() {
    const snap = await db.ref('kronos_system').once('value');
    if (!snap.exists()) {
        await db.ref('kronos_system').set({
            configuracoes: { empresa: "KRONOS SYSTEM" },
            clientes: {
                _exemplo: {
                    nome: "CLIENTE EXEMPLO", marca: "MARCA XYZ", valor_total: 5000,
                    dia_vencimento: 5, mes_referencia: "2024-01", qtd_parcelas: 5, valor_parcela: 1000,
                    data_cadastro: new Date().toISOString(),
                    parcelas: {
                        p1: { numero:1, valor:1000, vencimento:"2024-01-05", status:"pago", data_pagamento:"2024-01-04" },
                        p2: { numero:2, valor:1000, vencimento:"2024-02-05", status:"quitado", data_pagamento:"2024-02-01" },
                        p3: { numero:3, valor:1000, vencimento:"2024-03-05", status:"finalizando", data_pagamento:null },
                        p4: { numero:4, valor:1000, vencimento:"2024-04-05", status:"inadimplente", data_pagamento:null },
                        p5: { numero:5, valor:1000, vencimento:"2024-05-05", status:"pendente", data_pagamento:null }
                    }
                }
            }
        });
    }
}

function carregarClientes() {
    clientesRef.on('value', (snap) => {
        todosClientes = snap.val() || {};
        atualizarDashboard();
    });
}

function carregarMeses() {
    const sel = document.getElementById('filtroMes');
    const agora = new Date();
    for (let i = -6; i <= 6; i++) {
        const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        sel.innerHTML += `<option value="${val}">${d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).toUpperCase()}</option>`;
    }
}

function mostrarPagina(pagina) {
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    document.getElementById(`pagina-${pagina}`).style.display = 'block';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    if (pagina === 'clientes') carregarTabela();
    if (pagina === 'relatorios') carregarRelatorios();
}

function getStatus(c) {
    if (!c.parcelas) return 'pendente';
    const ps = Object.values(c.parcelas);
    const pagas = ps.filter(p => p.status === 'pago' || p.status === 'quitado').length;
    if (pagas === ps.length) return 'quitado';
    if (ps.some(p => p.status === 'inadimplente')) return 'inadimplente';
    if (pagas > 0) return 'finalizando';
    return 'pendente';
}

function calcAberto(c) {
    if (!c.parcelas) return c.valor_total || 0;
    return Object.values(c.parcelas).filter(p => p.status !== 'pago' && p.status !== 'quitado').reduce((t, p) => t + p.valor, 0);
}

function calcRec(c) {
    if (!c.parcelas) return 0;
    return Object.values(c.parcelas).filter(p => p.status === 'pago' || p.status === 'quitado').reduce((t, p) => t + p.valor, 0);
}

function contarPagas(c) {
    if (!c.parcelas) return 0;
    return Object.values(c.parcelas).filter(p => p.status === 'pago' || p.status === 'quitado').length;
}

function atualizarDashboard() {
    const clientes = Object.values(todosClientes);
    let pago = 0, quitado = 0, finalizando = 0, inadimplente = 0;
    clientes.forEach(c => {
        const s = getStatus(c);
        if (s === 'pago') pago++;
        else if (s === 'quitado') quitado++;
        else if (s === 'finalizando') finalizando++;
        else if (s === 'inadimplente') inadimplente++;
    });
    document.getElementById('cardPago').textContent = pago;
    document.getElementById('cardQuitado').textContent = quitado;
    document.getElementById('cardFinalizando').textContent = finalizando;
    document.getElementById('cardInadimplente').textContent = inadimplente;
    criarGraficoMensal(clientes);
    criarGraficoStatus(clientes);
    criarGraficoDias(clientes);
}

function criarGraficoMensal(clientes) {
    const ctx = document.getElementById('graficoMensal').getContext('2d');
    if (graficos.mensal) graficos.mensal.destroy();
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const rec = new Array(12).fill(0), ab = new Array(12).fill(0);
    clientes.forEach(c => {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach
