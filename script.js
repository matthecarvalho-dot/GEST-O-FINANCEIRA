// ============================================
// KRONOS SYSTEM - Gestão Financeira Executiva
// ============================================

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
let charts = {};
let currentPage = 'dashboard';

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    atualizarDataHora();
    setInterval(atualizarDataHora, 30000);
    carregarMeses();
    verificarBanco();
});

async function verificarBanco() {
    const snap = await db.ref('kronos_system').once('value');
    if (!snap.exists()) {
        await db.ref('kronos_system').set({
            configuracoes: { empresa: "KRONOS SYSTEM", versao: "4.0" },
            clientes: {
                _ex1: {
                    nome: "EMPRESA ALPHA LTDA", marca: "MARCA GOLD",
                    valor_total: 12000, dia_vencimento: 5, mes_referencia: "2024-06",
                    qtd_parcelas: 12, valor_parcela: 1000,
                    data_cadastro: new Date().toISOString(),
                    parcelas: {
                        p1: { numero:1, valor:1000, vencimento:"2024-06-05", status:"pago", data_pagamento:"2024-06-03" },
                        p2: { numero:2, valor:1000, vencimento:"2024-07-05", status:"pago", data_pagamento:"2024-07-01" },
                        p3: { numero:3, valor:1000, vencimento:"2024-08-05", status:"quitado", data_pagamento:"2024-07-28" },
                        p4: { numero:4, valor:1000, vencimento:"2024-09-05", status:"finalizando", data_pagamento:null },
                        p5: { numero:5, valor:1000, vencimento:"2024-10-05", status:"inadimplente", data_pagamento:null }
                    }
                },
                _ex2: {
                    nome: "COMÉRCIO BETA EIRELI", marca: "MARCA PRATA",
                    valor_total: 8000, dia_vencimento: 20, mes_referencia: "2024-06",
                    qtd_parcelas: 8, valor_parcela: 1000,
                    data_cadastro: new Date().toISOString(),
                    parcelas: {
                        p1: { numero:1, valor:1000, vencimento:"2024-06-20", status:"pago", data_pagamento:"2024-06-18" },
                        p2: { numero:2, valor:1000, vencimento:"2024-07-20", status:"quitado", data_pagamento:"2024-07-15" },
                        p3: { numero:3, valor:1000, vencimento:"2024-08-20", status:"pendente", data_pagamento:null },
                        p4: { numero:4, valor:1000, vencimento:"2024-09-20", status:"pendente", data_pagamento:null }
                    }
                }
            }
        });
    }
    carregarClientes();
}

// ============================================
// LOGIN
// ============================================
function fazerLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    
    if (user === 'admin' && pass === 'admin') {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainSystem').style.display = 'flex';
        document.getElementById('sidebarUserName').textContent = 'Administrador';
        carregarClientes();
    } else {
        alert('Usuário ou senha incorretos!');
    }
}

function sair() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainSystem').style.display = 'none';
    document.getElementById('loginPass').value = '';
}

// ============================================
// NAVEGAÇÃO
// ============================================
function showPage(page) {
    currentPage = page;
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');
    
    const navEl = document.querySelector(`.nav-item[onclick*="${page}"]`);
    if (navEl) navEl.classList.add('active');
    
    const titles = {
        dashboard: 'Dashboard Executivo',
        clientes: 'Todos os Clientes',
        dia5: 'Clientes - Vencimento Dia 5',
        dia20: 'Clientes - Vencimento Dia 20',
        parcelas: 'Todas as Parcelas',
        relatorios: 'Relatórios Gerenciais'
    };
    document.getElementById('pageTitle').textContent = titles[page] || '';
    
    if (page === 'dashboard') atualizarDashboard();
    else if (page === 'clientes') carregarTabelaClientes();
    else if (page === 'dia5') carregarClientesDia(5);
    else if (page === 'dia20') carregarClientesDia(20);
    else if (page === 'parcelas') carregarTodasParcelas();
    else if (page === 'relatorios') carregarRelatorios();
}

// ============================================
// CARREGAR DADOS
// ============================================
function carregarClientes() {
    clientesRef.on('value', (snap) => {
        todosClientes = snap.val() || {};
        atualizarBadgeTotal();
        if (currentPage === 'dashboard') atualizarDashboard();
        else if (currentPage === 'clientes') carregarTabelaClientes();
        else if (currentPage === 'dia5') carregarClientesDia(5);
        else if (currentPage === 'dia20') carregarClientesDia(20);
        else if (currentPage === 'parcelas') carregarTodasParcelas();
        else if (currentPage === 'relatorios') carregarRelatorios();
    });
}

function atualizarBadgeTotal() {
    document.getElementById('totalClientesBadge').textContent = 
        `${Object.keys(todosClientes).length} clientes`;
}

function carregarMeses() {
    const selects = ['filtroMesCliente'];
    selects.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const agora = new Date();
        for (let i = -6; i <= 6; i++) {
            const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            sel.innerHTML += `<option value="${val}">${d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).toUpperCase()}</option>`;
        }
    });
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function getStatus(c) {
    if (!c.parcelas || Object.keys(c.parcelas).length === 0) return 'pendente';
    const ps = Object.values(c.parcelas);
    const pagas = ps.filter(p => p.status === 'pago' || p.status === 'quitado').length;
    if (pagas === ps.length) return 'quitado';
    if (ps.some(p => p.status === 'inadimplente')) return 'inadimplente';
    if (pagas > 0) return 'finalizando';
    if (ps.some(p => p.status === 'pago')) return 'pago';
    return 'pendente';
}

function calcAberto(c) {
    if (!c.parcelas) return c.valor_total || 0;
    return Object.values(c.parcelas)
        .filter(p => p.status !== 'pago' && p.status !== 'quitado')
        .reduce((t, p) => t + p.valor, 0);
}

function calcRecebido(c) {
    if (!c.parcelas) return 0;
    return Object.values(c.parcelas)
        .filter(p => p.status === 'pago' || p.status === 'quitado')
        .reduce((t, p) => t + p.valor, 0);
}

function contarPagas(c) {
    if (!c.parcelas) return 0;
    return Object.values(c.parcelas)
        .filter(p => p.status === 'pago' || p.status === 'quitado').length;
}

function formatMoeda(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function formatData(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR');
}

function atualizarDataHora() {
    document.getElementById('currentDateTime').textContent = 
        new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ============================================
// DASHBOARD
// ============================================
function atualizarDashboard() {
    const clientes = Object.values(todosClientes);
    let p=0, q=0, f=0, i=0, totalRec=0, totalAb=0, totalParc=0, inadParc=0;
    
    clientes.forEach(c => {
        const st = getStatus(c);
        if (st === 'pago') p++;
        else if (st === 'quitado') q++;
        else if (st === 'finalizando') f++;
        else if (st === 'inadimplente') i++;
        
        totalRec += calcRecebido(c);
        totalAb += calcAberto(c);
        
        if (c.parcelas) {
            Object.values(c.parcelas).forEach(parc => {
                totalParc++;
                if (parc.status === 'inadimplente') inadParc++;
            });
        }
    });
    
    document.getElementById('kpiPago').textContent = p;
    document.getElementById('kpiQuitado').textContent = q;
    document.getElementById('kpiFinalizando').textContent = f;
    document.getElementById('kpiInadimplente').textContent = i;
    document.getElementById('resumoRecebido').textContent = formatMoeda(totalRec);
    document.getElementById('resumoAberto').textContent = formatMoeda(totalAb);
    document.getElementById('resumoInadimplencia').textContent = totalParc > 0 ? ((inadParc/totalParc)*100).toFixed(1) + '%' : '0%';
    
    criarGraficoMensal(clientes);
    criarGraficoStatus(clientes);
    criarGraficoComparativo(clientes);
}

function criarGraficoMensal(clientes) {
    const ctx = document.getElementById('chartMensal')?.getContext('2d');
    if (!ctx) return;
    if (charts.mensal) charts.mensal.destroy();
    
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const rec = new Array(12).fill(0), ab = new Array(12).fill(0);
    
    clientes.forEach(c => {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach(p => {
            const m = new Date(p.vencimento).getMonth();
            if (p.status === 'pago' || p.status === 'quitado') rec[m] += p.valor;
            else ab[m] += p.valor;
        });
    });
    
    charts.mensal = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                { label:'Recebido', data:rec, backgroundColor:'#27ae60', borderRadius:5 },
                { label:'Em Aberto', data:ab, backgroundColor:'#e74c3c', borderRadius:5 }
            ]
        },
        options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ labels:{ color:'#8899aa' } } },
            scales:{
                y:{ grid:{ color:'rgba(255,255,255,0.05)' }, ticks:{ color:'#8899aa' } },
                x:{ grid:{ display:false }, ticks:{ color:'#8899aa' } }
            }
        }
    });
}

function criarGraficoStatus(clientes) {
    const ctx = document.getElementById('chartStatus')?.getContext('2d');
    if (!ctx) return;
    if (charts.status) charts.status.destroy();
    
    let pa=0, q=0, f=0, i=0, pe=0;
    clientes.forEach(c => {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach(p => {
            if(p.status==='pago') pa++;
            else if(p.status==='quitado') q++;
            else if(p.status==='finalizando') f++;
            else if(p.status==='inadimplente') i++;
            else pe++;
        });
    });
    
    charts.status = new Chart(ctx, {
        type:'doughnut',
        data:{
            labels:['Pago','Quitado','Finalizando','Inadimplente','Pendente'],
            datasets:[{ data:[pa,q,f,i,pe], backgroundColor:['#27ae60','#c9a84c','#f39c12','#e74c3c','#3498db'] }]
        },
        options:{
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ position:'bottom', labels:{ color:'#8899aa', padding:15 } } }
        }
    });
}

function criarGraficoComparativo(clientes) {
    const ctx = document.getElementById('chartComparativo')?.getContext('2d');
    if (!ctx) return;
    if (charts.comp) charts.comp.destroy();
    
    let d5t=0, d5r=0, d20t=0, d20r=0;
    clientes.forEach(c => {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach(p => {
            const dia = new Date(p.vencimento).getDate();
            if(dia===5){ d5t+=p.valor; if(p.status==='pago'||p.status==='quitado') d5r+=p.valor; }
            else if(dia===20){ d20t+=p.valor; if(p.status==='pago'||p.status==='quitado') d20r+=
