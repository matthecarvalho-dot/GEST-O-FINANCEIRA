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
            labels: ['Clientes', 'Recebido', 'Em Aberto', 'Adimplência'],
            datasets: [
                {
                    label: 'Dia 5',
                    data: [dados.dia5.clientes, dados.dia5.recebido/1000, dados.dia5.aberto/1000, dados.dia5.adimplencia],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52,152,219,0.2)'
                },
                {
                    label: 'Dia 20',
                    data: [dados.dia20.clientes, dados.dia20.recebido/1000, dados.dia20.aberto/1000, dados.dia20.adimplencia],
                    borderColor: '#d4a843',
                    backgroundColor: 'rgba(212,168,67,0.2)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#b0c4d8', backdropColor: 'transparent' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#b0c4d8' }
                }
            }
        }
    });
}

function criarGraficoEvolucaoMensal(clientes) {
    const ctx = document.getElementById('chartEvolucaoMensal').getContext('2d');
    if (charts.evolucaoMensal) charts.evolucaoMensal.destroy();
    
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const recebido = new Array(12).fill(0);
    
    clientes.forEach(cliente => {
        if (!cliente.parcelas) return;
        Object.values(cliente.parcelas).forEach(parcela => {
            if (parcela.status === 'pago' || parcela.status === 'quitado') {
                const mes = new Date(parcela.vencimento).getMonth();
                recebido[mes] += parcela.valor;
            }
        });
    });
    
    charts.evolucaoMensal = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'Recebido',
                data: recebido,
                borderColor: '#d4a843',
                backgroundColor: 'rgba(212,168,67,0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#d4a843'
            }]
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

function carregarTopMarcas(clientes) {
    const marcas = {};
    clientes.forEach(cliente => {
        if (!cliente.marca) return;
        if (!marcas[cliente.marca]) marcas[cliente.marca] = 0;
        marcas[cliente.marca] += cliente.valor_total || 0;
    });
    
    const topMarcas = Object.entries(marcas)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    document.getElementById('topMarcas').innerHTML = topMarcas.map(([marca, valor], index) => `
        <div class="top-item">
            <span class="top-rank">#${index + 1}</span>
            <span class="top-name">${marca}</span>
            <span class="top-value">${formatarMoeda(valor)}</span>
        </div>
    `).join('');
}

// ============================================
// COMPARATIVO
// ============================================
function carregarComparativo() {
    const meses = [];
    const dataAtual = new Date();
    
    for (let i = -6; i <= 6; i++) {
        const data = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + i, 1);
        const valor = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        const nome = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        meses.push({ valor, nome });
    }
    
    const select1 = document.getElementById('compMes1');
    const select2 = document.getElementById('compMes2');
    
    select1.innerHTML = select2.innerHTML = meses.map((m, i) => `
        <option value="${m.valor}" ${i === 4 ? 'selected' : ''}>${m.nome.toUpperCase()}</option>
    `).join('');
    
    atualizarComparativo();
}

function atualizarComparativo() {
    const mes1 = document.getElementById('compMes1').value;
    const mes2 = document.getElementById('compMes2').value;
    
    const clientes = Object.values(todosClientes);
    const dados1 = calcularDadosMes(clientes, mes1);
    const dados2 = calcularDadosMes(clientes, mes2);
    
    document.getElementById('compTitulo1').textContent = mes1;
    document.getElementById('compTitulo2').textContent = mes2;
    
    document.getElementById('compStats1').innerHTML = `
        <div class="stat-item"><span>Clientes:</span><strong>${dados1.clientes}</strong></div>
        <div class="stat-item"><span>Recebido:</span><strong>${formatarMoeda(dados1.recebido)}</strong></div>
        <div class="stat-item"><span>Em Aberto:</span><strong>${formatarMoeda(dados1.aberto)}</strong></div>
        <div class="stat-item"><span>Adimplência:</span><strong>${dados1.adimplencia}%</strong></div>
    `;
    
    document.getElementById('compStats2').innerHTML = `
        <div class="stat-item"><span>Clientes:</span><strong>${dados2.clientes}</strong></div>
        <div class="stat-item"><span>Recebido:</span><strong>${formatarMoeda(dados2.recebido)}</strong></div>
        <div class="stat-item"><span>Em Aberto:</span><strong>${formatarMoeda(dados2.aberto)}</strong></div>
        <div class="stat-item"><span>Adimplência:</span><strong>${dados2.adimplencia}%</strong></div>
    `;
    
    // Gráfico comparativo
    if (charts.comparativo) charts.comparativo.destroy();
    const ctx = document.getElementById('chartComparativo').getContext('2d');
    
    charts.comparativo = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Clientes', 'Recebido (R$)', 'Em Aberto (R$)', 'Adimplência (%)'],
            datasets: [
                {
                    label: mes1,
                    data: [dados1.clientes, dados1.recebido, dados1.aberto, dados1.adimplencia],
                    backgroundColor: 'rgba(52,152,219,0.6)',
                    borderRadius: 5
                },
                {
                    label: mes2,
                    data: [dados2.clientes, dados2.recebido, dados2.aberto, dados2.adimplencia],
                    backgroundColor: 'rgba(212,168,67,0.6)',
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

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function calcularTotalRecebido(clientes) {
    let total = 0;
    clientes.forEach(cliente => {
        if (!cliente.parcelas) return;
        Object.values(cliente.parcelas).forEach(parcela => {
            if (parcela.status === 'pago' || parcela.status === 'quitado') {
                total += parcela.valor;
            }
        });
    });
    return total;
}

function calcularTotalEmAberto(clientes) {
    let total = 0;
    clientes.forEach(cliente => {
        if (!cliente.parcelas) return;
        Object.values(cliente.parcelas).forEach(parcela => {
            if (parcela.status !== 'pago' && parcela.status !== 'quitado') {
                total += parcela.valor;
            }
        });
    });
    return total;
}

function calcularTaxaInadimplencia(clientes) {
    let totalParcelas = 0;
    let inadimplentes = 0;
    
    clientes.forEach(cliente => {
        if (!cliente.parcelas) return;
        Object.values(cliente.parcelas).forEach(parcela => {
            totalParcelas++;
            if (parcela.status === 'inadimplente') inadimplentes++;
        });
    });
    
    return totalParcelas > 0 ? (inadimplentes / totalParcelas) * 100 : 0;
}

function calcularComparativoDias(clientes) {
    const resultado = {
        dia5: { clientes: 0, recebido: 0, aberto: 0, adimplencia: 0, totalParcelas: 0, pagas: 0 },
        dia20: { clientes: 0, recebido: 0, aberto: 0, adimplencia: 0, totalParcelas: 0, pagas: 0 }
    };
    
    clientes.forEach(cliente => {
        const dia = cliente.dia_vencimento;
        const key = dia === 5 ? 'dia5' : dia === 20 ? 'dia20' : null;
        if (!key) return;
        
        resultado[key].clientes++;
        
        if (!cliente.parcelas) return;
        Object.values(cliente.parcelas).forEach(parcela => {
            resultado[key].totalParcelas++;
            if (parcela.status === 'pago' || parcela.status === 'quitado') {
                resultado[key].recebido += parcela.valor;
                resultado[key].pagas++;
            } else {
                resultado[key].aberto += parcela.valor;
            }
        });
    });
    
    resultado.dia5.adimplencia = resultado.dia5.totalParcelas > 0 
        ? (resultado.dia5.pagas / resultado.dia5.totalParcelas) * 100 : 0;
    resultado.dia20.adimplencia = resultado.dia20.totalParcelas > 0 
        ? (resultado.dia20.pagas / resultado.dia20.totalParcelas) * 100 : 0;
    
    return resultado;
}

function calcularDadosMes(clientes, mesAno) {
    const dados = { clientes: 0, recebido: 0, aberto: 0, adimplencia: 0, totalParcelas: 0, pagas: 0 };
    
    clientes.filter(c => c.mes_referencia === mesAno).forEach(cliente => {
        dados.clientes++;
        if (!cliente.parcelas) return;
        
        Object.values(cliente.parcelas).forEach(parcela => {
            dados.totalParcelas++;
            if (parcela.status === 'pago' || parcela.status === 'quitado') {
                dados.recebido += parcela.valor;
                dados.pagas++;
            } else {
                dados.aberto += parcela.valor;
            }
        });
    });
    
    dados.adimplencia = dados.totalParcelas > 0 
        ? parseFloat(((dados.pagas / dados.totalParcelas) * 100).toFixed(1)) : 0;
    
    return dados;
}

// ============================================
// CRUD CLIENTES
// ============================================
function abrirModalCliente() {
    document.getElementById('formCliente').reset();
    document.getElementById('clienteId').value = '';
    document.getElementById('modalTitulo').textContent = 'NOVO CLIENTE';
    document.getElementById('valorParcelaPreview').textContent = '0,00';
    new bootstrap.Modal(document.getElementById('modalCliente')).show();
}

async function salvarCliente() {
    const id = document.getElementById('clienteId').value;
    const nome = document.getElementById('nomeCliente').value.trim();
    const marca = document.getElementById('marca').value.trim();
    const valorTotal = parseFloat(document.getElementById('valorTotal').value);
    const diaVencimento = parseInt(document.getElementById('diaVencimento').value);
    const mesReferencia = document.getElementById('mesReferencia').value;
    const qtdParcelas = parseInt(document.getElementById('qtdParcelas').value);
    const statusInicial = document.getElementById('statusInicial').value;
    
    if (!nome || !marca || !valorTotal || !mesReferencia || !qtdParcelas) {
        alert('Preencha todos os campos!');
        return;
    }
    
    const valorParcela = valorTotal / qtdParcelas;
    const parcelas = {};
    const [ano, mes] = mesReferencia.split('-').map(Number);
    
    for (let i = 1; i <= qtdParcelas; i++) {
        const dataVencimento = new Date(ano, mes - 1 + (i - 1), diaVencimento);
        parcelas[`parcela_${i}`] = {
            numero: i,
            valor: valorParcela,
            vencimento: dataVencimento.toISOString().split('T')[0],
            status: i === 1 ? statusInicial : 'pendente',
            data_pagamento: i === 1 && statusInicial === 'pago' ? new Date().toISOString() : null
        };
    }
    
    const dados = { nome, marca, valor_total: valorTotal, dia_vencimento: diaVencimento, 
                   mes_referencia: mesReferencia, qtd_parcelas: qtdParcelas, 
                   valor_parcela: valorParcela, parcelas, data_atualizacao: new Date().toISOString() };
    
    try {
        if (id) {
            await clientesRef.child(id).update(dados);
        } else {
            dados.data_cadastro = new Date().toISOString();
            await clientesRef.push(dados);
        }
        bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao salvar!');
    }
}

function renderizarClientes() {
    const tbody = document.getElementById('tabelaClientes');
    const clientes = Object.entries(todosClientes);
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Nenhum cliente</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map(([id, c]) => {
        const status = calcularStatus(c);
        const aberto = calcularTotalEmAberto([c]);
        
        return `
            <tr>
                <td><strong>${c.nome}</strong></td>
                <td>${c.marca}</td>
                <td>Dia ${c.dia_vencimento} - ${c.mes_referencia}</td>
                <td>${formatarMoeda(c.valor_total)}</td>
                <td>${formatarMoeda(aberto)}</td>
                <td>${contarPagas(c)}/${c.qtd_parcelas || 0}</td>
                <td><span class="badge-status badge-${status}">${status.toUpperCase()}</span></td>
                <td>
                    <button class="btn-acao" onclick="gerenciarParcelas('${id}')"><i class="fas fa-cog"></i></button>
                    <button class="btn-acao excluir" onclick="excluirCliente('${id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function calcularStatus(cliente) {
    if (!cliente.parcelas) return 'pendente';
    const parcelas = Object.values(cliente.parcelas);
    const pagas = parcelas.filter(p => p.status === 'pago' || p.status === 'quitado').length;
    if (pagas === parcelas.length) return 'quitado';
    if (parcelas.some(p => p.status === 'inadimplente')) return 'inadimplente';
    if (pagas > 0) return 'finalizando';
    return 'pendente';
}

function contarPagas(cliente) {
    if (!cliente.parcelas) return 0;
    return Object.values(cliente.parcelas).filter(p => p.status === 'pago' || p.status === 'quitado').length;
}

async function excluirCliente(id) {
    if (!confirm('Excluir este cliente?')) return;
    await clientesRef.child(id).remove();
}

function gerenciarParcelas(clienteId) {
    const cliente = todosClientes[clienteId];
    if (!cliente) return;
    
    document.getElementById('clienteNomeParcelas').textContent = cliente.nome;
    const container = document.getElementById('parcelasContainer');
    const parcelas = Object.entries(cliente.parcelas || {}).sort((a, b) => a[1].numero - b[1].numero);
    
    container.innerHTML = parcelas.map(([key, p]) => `
        <div class="parcela-card">
            <div>
                <strong>Parcela ${p.numero}</strong><br>
                <small>Venc: ${formatarData(p.vencimento)}</small><br>
                <small>Valor: ${formatarMoeda(p.valor)}</small>
            </div>
            <div>
                <select class="custom-select-mini" id="status_${clienteId}_${key}" style="width:160px;">
                    ${['pendente','pago','quitado','finalizando','inadimplente'].map(s => 
                        `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s.toUpperCase()}</option>`
                    ).join('')}
                </select>
                <button class="btn-acao" onclick="atualizarParcela('${clienteId}','${key}')" style="width:100%;margin-top:5px;">
                    ATUALIZAR
                </button>
            </div>
        </div>
    `).join('');
    
    new bootstrap.Modal(document.getElementById('modalParcelas')).show();
}

async function atualizarParcela(clienteId, parcelaKey) {
    const status = document.getElementById(`status_${clienteId}_${parcelaKey}`).value;
    const dataPagamento = (status === 'pago' || status === 'quitado') ? new Date().toISOString() : null;
    
    await clientesRef.child(`${clienteId}/parcelas/${parcelaKey}`).update({ status, data_pagamento });
    gerenciarParcelas(clienteId);
}

// ============================================
// UTILITÁRIOS
// ============================================
function atualizarQuickStats() {
    const clientes = Object.values(todosClientes);
    document.getElementById('quickTotalClientes').textContent = clientes.length;
    document.getElementById('quickTotalRecebido').textContent = formatarMoeda(calcularTotalRecebido(clientes));
    document.getElementById('quickTotalAberto').textContent = formatarMoeda(calcularTotalEmAberto(clientes));
}

function atualizarDataHora() {
    const agora = new Date();
    document.getElementById('currentDate').textContent = 
        agora.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

function carregarMeses() {
    const selects = ['mesFiltro', 'clienteMesFiltro'];
    const dataAtual = new Date();
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        for (let i = -6; i <= 6; i++) {
            const data = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + i, 1);
            const valor = `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}`;
            const nome = data.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
            const option = document.createElement('option');
            option.value = valor;
            option.textContent = nome.toUpperCase();
            select.appendChild(option);
        }
    });
}

function filtrarClientes() {
    renderizarClientes();
}

function calcularParcela() {
    const valor = parseFloat(document.getElementById('valorTotal').value) || 0;
    const qtd = parseInt(document.getElementById('qtdParcelas').value) || 1;
    document.getElementById('valorParcelaPreview').textContent = (valor / qtd).toFixed(2);
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarData(data) {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
}

function exportarRelatorio() {
    alert('📊 Relatório exportado com sucesso!\n\nFuncionalidade completa requer integração com serviço de PDF.');
    window.print();
}
