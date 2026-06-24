// ============================================
// KRONOS SYSTEM - Gestão Financeira Executiva
// Firebase Realtime Database
// ============================================

// Configuração Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD6Mv3DiNGWCoC4Rd0iOt6L22qxnS-XAhY",
    authDomain: "kronos-gestao-fincanceira.firebaseapp.com",
    databaseURL: "https://kronos-gestao-fincanceira-default-rtdb.firebaseio.com",
    projectId: "kronos-gestao-fincanceira",
    storageBucket: "kronos-gestao-fincanceira.firebasestorage.app",
    messagingSenderId: "26146570774",
    appId: "1:26146570774:web:0ca1bdf457eae2623eeb37"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const clientesRef = database.ref('kronos_system/clientes');

// Variáveis globais
let todosClientes = {};
let charts = {};
let paginaAtual = 'dashboard';

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Esconder loading
    setTimeout(() => {
        document.getElementById('loadingScreen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
        }, 500);
    }, 1500);
    
    // Inicializar
    atualizarDataHora();
    setInterval(atualizarDataHora, 60000);
    carregarMeses();
    carregarClientes();
    inicializarNavegacao();
    verificarBancoDados();
});

// ============================================
// NAVEGAÇÃO
// ============================================
function inicializarNavegacao() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            navegarPara(page);
        });
    });
}

function navegarPara(page) {
    // Atualizar nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) item.classList.add('active');
    });
    
    // Atualizar páginas
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    
    paginaAtual = page;
    
    // Carregar conteúdo específico
    switch(page) {
        case 'dashboard': atualizarDashboard(); break;
        case 'clientes': renderizarClientes(); break;
        case 'relatorios': carregarRelatorios(); break;
        case 'comparativo': carregarComparativo(); break;
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

// ============================================
// BANCO DE DADOS
// ============================================
async function verificarBancoDados() {
    const snapshot = await database.ref('kronos_system').once('value');
    
    if (!snapshot.exists()) {
        console.log('🔄 Criando estrutura inicial...');
        await database.ref('kronos_system').set({
            configuracoes: {
                empresa: "KRONOS SYSTEM",
                versao: "2.0",
                criado_em: new Date().toISOString()
            },
            clientes: {
                _exemplo: {
                    nome: "EMPRESA EXEMPLO LTDA",
                    marca: "MARCA PREMIUM",
                    valor_total: 15000,
                    dia_vencimento: 5,
                    mes_referencia: "2024-01",
                    qtd_parcelas: 12,
                    valor_parcela: 1250,
                    data_cadastro: new Date().toISOString(),
                    parcelas: {
                        parcela_1: { numero:1, valor:1250, vencimento:"2024-01-05", status:"pago", data_pagamento:"2024-01-04" },
                        parcela_2: { numero:2, valor:1250, vencimento:"2024-02-05", status:"pago", data_pagamento:"2024-02-03" },
                        parcela_3: { numero:3, valor:1250, vencimento:"2024-03-05", status:"quitado", data_pagamento:"2024-03-01" },
                        parcela_4: { numero:4, valor:1250, vencimento:"2024-04-05", status:"finalizando", data_pagamento:null },
                        parcela_5: { numero:5, valor:1250, vencimento:"2024-05-05", status:"inadimplente", data_pagamento:null }
                    }
                }
            }
        });
        console.log('✅ Banco inicializado!');
        carregarClientes();
    }
}

function carregarClientes() {
    clientesRef.on('value', (snapshot) => {
        todosClientes = snapshot.val() || {};
        renderizarClientes();
        atualizarDashboard();
        atualizarQuickStats();
    });
}

// ============================================
// DASHBOARD
// ============================================
function atualizarDashboard() {
    const clientes = Object.values(todosClientes);
    const ano = document.getElementById('dashboardAno').value;
    
    // Filtrar por ano
    const clientesAno = clientes.filter(c => {
        if (!c.mes_referencia) return false;
        return c.mes_referencia.startsWith(ano);
    });
    
    // KPIs
    const totalClientes = clientesAno.length;
    const totalRecebido = calcularTotalRecebido(clientesAno);
    const totalEmAberto = calcularTotalEmAberto(clientesAno);
    const taxaInadimplencia = calcularTaxaInadimplencia(clientesAno);
    
    document.getElementById('kpiTotalClientes').textContent = totalClientes;
    document.getElementById('kpiTotalRecebido').textContent = formatarMoeda(totalRecebido);
    document.getElementById('kpiEmAberto').textContent = formatarMoeda(totalEmAberto);
    document.getElementById('kpiInadimplencia').textContent = taxaInadimplencia.toFixed(1) + '%';
    
    // Gráficos
    criarGraficoPagamentosMensais(clientesAno, ano);
    criarGraficoStatusParcelas(clientesAno);
    criarGraficoPagamentosDia(clientesAno);
    carregarUltimosPagamentos(clientesAno);
}

function criarGraficoPagamentosMensais(clientes, ano) {
    const ctx = document.getElementById('chartPagamentosMensais').getContext('2d');
    
    // Destruir gráfico anterior se existir
    if (charts.pagamentosMensais) charts.pagamentosMensais.destroy();
    
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const recebido = new Array(12).fill(0);
    const emAberto = new Array(12).fill(0);
    
    clientes.forEach(cliente => {
        if (!cliente.parcelas) return;
        
        Object.values(cliente.parcelas).forEach(parcela => {
            const data = new Date(parcela.vencimento);
            if (data.getFullYear() == ano) {
                const mes = data.getMonth();
                if (parcela.status === 'pago' || parcela.status === 'quitado') {
                    recebido[mes] += parcela.valor;
                } else {
                    emAberto[mes] += parcela.valor;
                }
            }
        });
    });
    
    charts.pagamentosMensais = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Recebido',
                    data: recebido,
                    backgroundColor: 'rgba(46, 204, 113, 0.6)',
                    borderColor: '#2ecc71',
                    borderWidth: 1,
                    borderRadius: 5
                },
                {
                    label: 'Em Aberto',
                    data: emAberto,
                    backgroundColor: 'rgba(231, 76, 60, 0.6)',
                    borderColor: '#e74c3c',
                    borderWidth: 1,
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#b0c4d8' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#b0c4d8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#b0c4d8' }
                }
            }
        }
    });
}

function criarGraficoStatusParcelas(clientes) {
    const ctx = document.getElementById('chartStatusParcelas').getContext('2d');
    if (charts.statusParcelas) charts.statusParcelas.destroy();
    
    const status = { pago: 0, quitado: 0, finalizando: 0, inadimplente: 0, pendente: 0 };
    
    clientes.forEach(cliente => {
        if (!cliente.parcelas) return;
        Object.values(cliente.parcelas).forEach(parcela => {
            if (status[parcela.status] !== undefined) status[parcela.status]++;
        });
    });
    
    charts.statusParcelas = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pago', 'Quitado', 'Finalizando', 'Inadimplente', 'Pendente'],
            datasets: [{
                data: Object.values(status),
                backgroundColor: [
                    '#2ecc71', '#d4a843', '#f39c12', '#e74c3c', '#3498db'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#b0c4d8', padding: 15 }
                }
            }
        }
    });
}

function criarGraficoPagamentosDia(clientes) {
    const ctx = document.getElementById('chartPagamentosDia').getContext('2d');
    if (charts.pagamentosDia) charts.pagamentosDia.destroy();
    
    let dia5 = { recebido: 0, total: 0 };
    let dia20 = { recebido: 0, total: 0 };
    
    clientes.forEach(cliente => {
        if (!cliente.parcelas) return;
        
        Object.values(cliente.parcelas).forEach(parcela => {
            const dia = new Date(parcela.vencimento).getDate();
            if (dia === 5) {
                dia5.total += parcela.valor;
                if (parcela.status === 'pago' || parcela.status === 'quitado') dia5.recebido += parcela.valor;
            } else if (dia === 20) {
                dia20.total += parcela.valor;
                if (parcela.status === 'pago' || parcela.status === 'quitado') dia20.recebido += parcela.valor;
            }
        });
    });
    
    charts.pagamentosDia = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Dia 5', 'Dia 20'],
            datasets: [
                {
                    label: 'Total',
                    data: [dia5.total, dia20.total],
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    borderRadius: 5
                },
                {
                    label: 'Recebido',
                    data: [dia5.recebido, dia20.recebido],
                    backgroundColor: 'rgba(46, 204, 113, 0.8)',
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#b0c4d8' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#b0c4d8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#b0c4d8' }
                }
            }
        }
    });
}

function carregarUltimosPagamentos(clientes) {
    const container = document.getElementById('ultimosPagamentos');
    let pagamentos = [];
    
    clientes.forEach(cliente => {
        if (!cliente.parcelas) return;
        Object.values(cliente.parcelas).forEach(parcela => {
            if (parcela.data_pagamento && (parcela.status === 'pago' || parcela.status === 'quitado')) {
                pagamentos.push({
                    cliente: cliente.nome,
                    valor: parcela.valor,
                    data: parcela.data_pagamento,
                    parcela: parcela.numero
                });
            }
        });
    });
    
    // Ordenar por data (mais recentes primeiro)
    pagamentos.sort((a, b) => new Date(b.data) - new Date(a.data));
    pagamentos = pagamentos.slice(0, 10);
    
    container.innerHTML = pagamentos.map(p => `
        <div class="activity-item">
            <div class="activity-icon" style="background: rgba(46,204,113,0.1);">
                <i class="fas fa-check" style="color: #2ecc71;"></i>
            </div>
            <div class="activity-info">
                <strong>${p.cliente}</strong>
                <small>Parcela ${p.parcela} - ${formatarData(p.data)}</small>
            </div>
            <div class="activity-value">${formatarMoeda(p.valor)}</div>
        </div>
    `).join('');
}

// ============================================
// RELATÓRIOS
// ============================================
function carregarRelatorios() {
    const clientes = Object.values(todosClientes);
    
    // Resumo
    document.getElementById('relClientes').textContent = clientes.length;
    document.getElementById('relRecebido').textContent = formatarMoeda(calcularTotalRecebido(clientes));
    document.getElementById('relAberto').textContent = formatarMoeda(calcularTotalEmAberto(clientes));
    document.getElementById('relInadimplencia').textContent = calcularTaxaInadimplencia(clientes).toFixed(1) + '%';
    
    // Gráficos
    criarGraficoComparativoDias(clientes);
    criarGraficoEvolucaoMensal(clientes);
    carregarTopMarcas(clientes);
}

function criarGraficoComparativoDias(clientes) {
    const ctx = document.getElementById('chartComparativoDias').getContext('2d');
    if (charts.comparativoDias) charts.comparativoDias.destroy();
    
    // Calcular dados...
    const dados = calcularComparativoDias(clientes);
    
    charts.comparativoDias = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Clientes', 'Recebido', 'Em Aberto',
