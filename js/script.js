// ============================================
// KRONOS SYSTEM - Firebase + Chart.js
// ============================================

// CONFIGURAÇÃO FIREBASE
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

// ============================================
// LOGIN
// ============================================
function fazerLogin() {
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    
    if (user === 'admin' && pass === 'admin') {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainSystem').style.display = 'block';
        inicializar();
    } else {
        alert('Usuário ou senha incorretos!');
    }
}

function sair() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainSystem').style.display = 'none';
}

// ============================================
// INICIALIZAÇÃO
// ============================================
function inicializar() {
    atualizarData();
    carregarMeses();
    carregarClientes();
    verificarBanco();
    mostrarPagina('dashboard');
}

function atualizarData() {
    const agora = new Date();
    document.getElementById('dataAtual').textContent = 
        agora.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

async function verificarBanco() {
    const snap = await db.ref('kronos_system').once('value');
    if (!snap.exists()) {
        await db.ref('kronos_system').set({
            configuracoes: { empresa: "KRONOS SYSTEM", versao: "2.0" },
            clientes: {
                _exemplo: {
                    nome: "CLIENTE EXEMPLO",
                    marca: "MARCA XYZ",
                    valor_total: 5000,
                    dia_vencimento: 5,
                    mes_referencia: "2024-01",
                    qtd_parcelas: 5,
                    valor_parcela: 1000,
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
    const selects = ['filtroMes'];
    const agora = new Date();
    
    selects.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        
        for (let i = -6; i <= 6; i++) {
            const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const nome = d.toLocaleDateString('pt-BR', { month:'long', year:'numeric' }).toUpperCase();
            sel.innerHTML += `<option value="${val}">${nome}</option>`;
        }
    });
}

// ============================================
// NAVEGAÇÃO
// ============================================
function mostrarPagina(pagina) {
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    document.getElementById(`pagina-${pagina}`).style.display = 'block';
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => {
        if (b.textContent.toLowerCase().includes(pagina)) b.classList.add('active');
    });
    
    if (pagina === 'clientes') carregarTabela();
    if (pagina === 'relatorios') carregarRelatorios();
}

// ============================================
// DASHBOARD
// ============================================
function atualizarDashboard() {
    const clientes = Object.values(todosClientes);
    
    // Contadores
    let pago = 0, quitado = 0, finalizando = 0, inadimplente = 0;
    
    clientes.forEach(c => {
        const status = getStatus(c);
        if (status === 'pago') pago++;
        else if (status === 'quitado') quitado++;
        else if (status === 'finalizando') finalizando++;
        else if (status === 'inadimplente') inadimplente++;
    });
    
    document.getElementById('cardPago').textContent = pago;
    document.getElementById('cardQuitado').textContent = quitado;
    document.getElementById('cardFinalizando').textContent = finalizando;
    document.getElementById('cardInadimplente').textContent = inadimplente;
    
    // Gráficos
    criarGraficoMensal(clientes);
    criarGraficoStatus(clientes);
    criarGraficoDias(clientes);
}

function criarGraficoMensal(clientes) {
    const ctx = document.getElementById('graficoMensal').getContext('2d');
    if (graficos.mensal) graficos.mensal.destroy();
    
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const recebido = new Array(12).fill(0);
    const aberto = new Array(12).fill(0);
    
    clientes.forEach(c => {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach(p => {
            const mes = new Date(p.vencimento).getMonth();
            if (p.status === 'pago' || p.status === 'quitado') recebido[mes] += p.valor;
            else aberto[mes] += p.valor;
        });
    });
    
    graficos.mensal = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                { label: 'Recebido', data: recebido, backgroundColor: '#27ae60', borderRadius: 5 },
                { label: 'Em Aberto', data: aberto, backgroundColor: '#e74c3c', borderRadius: 5 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#8899aa' } } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8899aa' } },
                x: { grid: { display: false }, ticks: { color: '#8899aa' } }
            }
        }
    });
}

function criarGraficoStatus(clientes) {
    const ctx = document.getElementById('graficoStatus').getContext('2d');
    if (graficos.status) graficos.status.destroy();
    
    let pago = 0, quitado = 0, finalizando = 0, inadimplente = 0, pendente = 0;
    
    clientes.forEach(c => {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach(p => {
            if (p.status === 'pago') pago++;
            else if (p.status === 'quitado') quitado++;
            else if (p.status === 'finalizando') finalizando++;
            else if (p.status === 'inadimplente') inadimplente++;
            else pendente++;
        });
    });
    
    graficos.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['PAGO','QUITADO','FINALIZANDO','INADIMPLENTE','PENDENTE'],
            datasets: [{
                data: [pago, quitado, finalizando, inadimplente, pendente],
                backgroundColor: ['#27ae60','#c9a84c','#f39c12','#e74c3c','#3498db']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#8899aa', padding: 15 } } }
        }
    });
}

function criarGraficoDias(clientes) {
    const ctx = document.getElementById('graficoDias').getContext('2d');
    if (graficos.dias) graficos.dias.destroy();
    
    let dia5Total = 0, dia5Pago = 0, dia20Total = 0, dia20Pago = 0;
    
    clientes.forEach(c => {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach(p => {
            const dia = new Date(p.vencimento).getDate();
            if (dia === 5) {
                dia5Total += p.valor;
                if (p.status === 'pago' || p.status === 'quitado') dia5Pago += p.valor;
            } else if (dia === 20) {
                dia20Total += p.valor;
                if (p.status === 'pago' || p.status === 'quitado') dia20Pago += p.valor;
            }
        });
    });
    
    graficos.dias = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['DIA 5', 'DIA 20'],
            datasets: [
                { label: 'Total', data: [dia5Total, dia20Total], backgroundColor: '#3498db', borderRadius: 5 },
                { label: 'Recebido', data: [dia5Pago, dia20Pago], backgroundColor: '#27ae60', borderRadius: 5 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#8899aa' } } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8899aa' } },
                x: { grid: { display: false }, ticks: { color: '#8899aa' } }
            }
        }
    });
}

// ============================================
// CLIENTES
// ============================================
function carregarTabela() {
    const tbody = document.getElementById('corpoTabela');
    const mes = document.getElementById('filtroMes').value;
    const dia = document.getElementById('filtroDia').value;
    const status = document.getElementById('filtroStatus').value;
    
    let clientes = Object.entries(todosClientes);
    
    if (mes) clientes = clientes.filter(([_,c]) => c.mes_referencia === mes);
    if (dia) clientes = clientes.filter(([_,c]) => c.dia_vencimento == dia);
    if (status) clientes = clientes.filter(([_,c]) => getStatus(c) === status);
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Nenhum cliente encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map(([id, c]) => {
        const st = getStatus(c);
        const aberto = calcAberto(c);
        const pagas = contarPagas(c);
        
        return `
            <tr>
                <td><strong>${c.nome}</strong></td>
                <td>${c.marca}</td>
                <td>Dia ${c.dia_vencimento} - ${c.mes_referencia}</td>
                <td>R$ ${c.valor_total.toFixed(2)}</td>
                <td>R$ ${aberto.toFixed(2)}</td>
                <td>${pagas}/${c.qtd_parcelas || 0}</td>
                <td><span class="badge badge-${st}">${st.toUpperCase()}</span></td>
                <td>
                    <button class="btn-sm" onclick="abrirParcelas('${id}')" title="Parcelas">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="btn-sm danger" onclick="excluirCliente('${id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getStatus(c) {
    if (!c.parcelas) return 'pendente';
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

function contarPagas(c) {
    if (!c.parcelas) return 0;
    return Object.values(c.parcelas).filter(p => p.status === 'pago' || p.status === 'quitado').length;
}

// ============================================
// MODAL CLIENTE
// ============================================
function abrirModalCliente() {
    document.getElementById('editId').value = '';
    document.getElementById('modalTitulo').textContent = 'NOVO CLIENTE';
    document.getElementById('nome').value = '';
    document.getElementById('marca').value = '';
    document.getElementById('valorTotal').value = '';
    document.getElementById('qtdParcelas').value = '1';
    document.getElementById('previewParcela').textContent = '0,00';
    document.getElementById('modalCliente').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modalCliente').style.display = 'none';
}

function calcParcela() {
    const total = parseFloat(document.getElementById('valorTotal').value) || 0;
    const qtd = parseInt(document.getElementById('qtdParcelas').value) || 1;
    document.getElementById('previewParcela').textContent = (total / qtd).toFixed(2);
}

async function salvarCliente() {
    const nome = document.getElementById('nome').value.trim();
    const marca = document.getElementById('marca').value.trim();
    const valorTotal = parseFloat(document.getElementById('valorTotal').value);
    const diaVencimento = parseInt(document.getElementById('diaVencimento').value);
    const mesReferencia = document.getElementById('mesReferencia').value;
    const qtdParcelas = parseInt(document.getElementById('qtdParcelas').value);
    const editId = document.getElementById('editId').value;
    
    if (!nome || !marca || !valorTotal || !mesReferencia) {
        alert('Preencha todos os campos!');
        return;
    }
    
    const valorParcela = valorTotal / qtdParcelas;
    const parcelas = {};
    const [ano, mes] = mesReferencia.split('-').map(Number);
    
    for (let i = 1; i <= qtdParcelas; i++) {
        const venc = new Date(ano, mes - 1 + (i - 1), diaVencimento);
        parcelas[`p${i}`] = {
            numero: i,
            valor: valorParcela,
            vencimento: venc.toISOString().split('T')[0],
            status: 'pendente',
            data_pagamento: null
        };
    }
    
    const dados = {
        nome, marca,
        valor_total: valorTotal,
        dia_vencimento: diaVencimento,
        mes_referencia: mesReferencia,
        qtd_parcelas: qtdParcelas,
        valor_parcela: valorParcela,
        parcelas,
        data_atualizacao: new Date().toISOString()
    };
    
    if (editId) {
        await clientesRef.child(editId).update(dados);
    } else {
        dados.data_cadastro = new Date().toISOString();
        await clientesRef.push(dados);
    }
    
    fecharModal();
}

async function excluirCliente(id) {
    if (!confirm('Excluir este cliente?')) return;
    await clientesRef.child(id).remove();
}

// ============================================
// PARCELAS
// ============================================
function abrirParcelas(id) {
    const c = todosClientes[id];
    if (!c) return;
    
    const container = document.getElementById('parcelasContainer');
    const parcelas = Object.entries(c.parcelas || {}).sort((a,b) => a[1].numero - b[1].numero);
    
    container.innerHTML = parcelas.map(([key, p]) => `
        <div style="background:var(--bg3);padding:15px;border-radius:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <strong>Parcela ${p.numero}</strong><br>
                <small>Venc: ${new Date(p.vencimento).toLocaleDateString('pt-BR')}</small><br>
                <small>Valor: R$ ${p.valor.toFixed(2)}</small>
            </div>
            <div>
                <select id="st_${id}_${key}" class="input-full" style="width:160px;">
                    ${['pendente','pago','quitado','finalizando','inadimplente'].map(s => 
                        `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s.toUpperCase()}</option>`
                    ).join('')}
                </select>
                <button class="btn-sm" onclick="atualizarParcela('${id}','${key}')" style="width:100%;margin-top:5px;">
                    ATUALIZAR
                </button>
            </div>
        </div>
    `).join('');
    
    document.getElementById('modalParcelas').style.display = 'flex';
}

function fecharModalParcelas() {
    document.getElementById('modalParcelas').style.display = 'none';
}

async function atualizarParcela(id, key) {
    const status = document.getElementById(`st_${id}_${key}`).value;
    const dataPag = (status === 'pago' || status === 'quitado') ? new Date().toISOString() : null;
    await clientesRef.child(`${id}/parcelas/${key}`).update({ status, data_pagamento: dataPag });
    abrirParcelas(id);
}

// ============================================
// RELATÓRIOS
// ============================================
function carregarRelatorios() {
    const clientes = Object.values(todosClientes);
    
    document.getElementById('relClientes').textContent = clientes.length;
    
    let totalRec = 0, totalAb = 0, totalParc = 0, inad = 0;
    let dia5Cli = 0, dia5Rec = 0, dia20Cli = 0, dia20Rec = 0;
    
    clientes.forEach(c => {
        totalRec += calcRec(c);
        totalAb += calcAberto(c);
        
        if (c.dia_vencimento === 5) { dia5Cli++; dia5Rec += calcRec(c); }
        if (c.dia_vencimento === 20) { dia20Cli++; dia20Rec += calcRec(c); }
        
        if (c.parcelas) {
            Object.values(c.parcelas).forEach(p => {
                totalParc++;
                if (p.status === 'inadimplente') inad++;
            });
        }
    });
    
    document.getElementById('relRecebido').textContent = `R$ ${totalRec.toFixed(2)}`;
    document.getElementById('relAberto').textContent = `R$ ${totalAb.toFixed(2)}`;
    document.getElementById('relInadimplencia').textContent = 
        totalParc > 0 ? ((inad/totalParc)*100).toFixed(1) + '%' : '0%';
    document.getElementById('relDia5Clientes').textContent = dia5Cli;
    document.getElementById('relDia5Recebido').textContent = `R$ ${dia5Rec.toFixed(2)}`;
    document.getElementById('relDia20Clientes').textContent = dia20Cli;
    document.getElementById('relDia20Recebido').textContent = `R$ ${dia20Rec.toFixed(2)}`;
}

function calcRec(c) {
    if (!c.parcelas) return 0;
    return Object.values(c.parcelas)
        .filter(p => p.status === 'pago' || p.status === 'quitado')
        .reduce((t, p) => t + p.valor, 0);
}
