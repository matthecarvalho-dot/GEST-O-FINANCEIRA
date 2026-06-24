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
            else if(dia===20){ d20t+=p.valor; if(p.status==='pago'||p.status==='quitado') d20r+=p.valor; }
        });
    });
    
    charts.comp = new Chart(ctx, {
        type:'bar',
        data:{
            labels:['DIA 5','DIA 20'],
            datasets:[
                { label:'Total', data:[d5t,d20t], backgroundColor:'#3498db', borderRadius:5 },
                { label:'Recebido', data:[d5r,d20r], backgroundColor:'#27ae60', borderRadius:5 }
            ]
        },
        options:{
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ labels:{ color:'#8899aa' } } },
            scales:{
                y:{ grid:{ color:'rgba(255,255,255,0.05)' }, ticks:{ color:'#8899aa' } },
                x:{ grid:{ display:false }, ticks:{ color:'#8899aa' } }
            }
        }
    });
}

// ============================================
// TABELAS DE CLIENTES
// ============================================
function carregarTabelaClientes() {
    const tbody = document.getElementById('tabelaTodosClientes');
    if (!tbody) return;
    
    const busca = (document.getElementById('buscaCliente')?.value || '').toLowerCase();
    const mes = document.getElementById('filtroMesCliente')?.value || '';
    
    let clientes = Object.entries(todosClientes);
    if (busca) clientes = clientes.filter(([_,c]) => c.nome.toLowerCase().includes(busca) || c.marca.toLowerCase().includes(busca));
    if (mes) clientes = clientes.filter(([_,c]) => c.mes_referencia === mes);
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#8899aa;">Nenhum cliente encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map(([id, c]) => renderLinhaCliente(id, c)).join('');
}

function carregarClientesDia(dia) {
    const pageId = dia === 5 ? 'dia5' : 'dia20';
    const tbody = document.getElementById(`tabelaDia${dia === 5 ? '5' : '20'}`);
    const totalSpan = document.getElementById(`totalDia${dia === 5 ? '5' : '20'}`);
    if (!tbody) return;
    
    const clientes = Object.entries(todosClientes).filter(([_,c]) => c.dia_vencimento == dia);
    
    if (totalSpan) totalSpan.textContent = `${clientes.length} clientes`;
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#8899aa;">Nenhum cliente com vencimento dia ' + dia + '</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map(([id, c]) => renderLinhaCliente(id, c)).join('');
}

function renderLinhaCliente(id, c) {
    const st = getStatus(c);
    return `
        <tr>
            <td><strong>${c.nome}</strong></td>
            <td>${c.marca}</td>
            <td>Dia ${c.dia_vencimento} - ${c.mes_referencia || '-'}</td>
            <td>${formatMoeda(c.valor_total || 0)}</td>
            <td>${contarPagas(c)}/${c.qtd_parcelas || 0}</td>
            <td>${formatMoeda(calcAberto(c))}</td>
            <td><span class="badge-status badge-${st}">${st.toUpperCase()}</span></td>
            <td>
                <button class="btn-sm edit" onclick="editarCliente('${id}')" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-sm" onclick="verParcelas('${id}')" title="Ver Parcelas"><i class="fas fa-list"></i></button>
                <button class="btn-sm danger" onclick="excluirCliente('${id}')" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `;
}

// ============================================
// PARCELAS
// ============================================
function carregarTodasParcelas() {
    const tbody = document.getElementById('tabelaParcelas');
    if (!tbody) return;
    
    const filtroStatus = document.getElementById('filtroStatusParcela')?.value || '';
    const filtroDia = document.getElementById('filtroDiaParcela')?.value || '';
    
    let todasParcelas = [];
    
    Object.entries(todosClientes).forEach(([id, c]) => {
        if (!c.parcelas) return;
        Object.entries(c.parcelas).forEach(([key, p]) => {
            if (filtroStatus && p.status !== filtroStatus) return;
            if (filtroDia && new Date(p.vencimento).getDate() != filtroDia) return;
            
            todasParcelas.push({
                clienteId: id,
                parcelaKey: key,
                clienteNome: c.nome,
                ...p
            });
        });
    });
    
    todasParcelas.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
    
    if (todasParcelas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;">Nenhuma parcela encontrada</td></tr>';
        return;
    }
    
    tbody.innerHTML = todasParcelas.map(p => `
        <tr>
            <td><strong>${p.clienteNome}</strong></td>
            <td>${p.numero}ª Parcela</td>
            <td>${formatMoeda(p.valor)}</td>
            <td>${formatData(p.vencimento)}</td>
            <td><span class="badge-status badge-${p.status}">${p.status.toUpperCase()}</span></td>
            <td>${p.data_pagamento ? formatData(p.data_pagamento) : 'Não pago'}</td>
            <td>
                <button class="btn-sm edit" onclick="abrirModalEditarParcela('${p.clienteId}','${p.parcelaKey}')">
                    <i class="fas fa-pen"></i> Alterar
                </button>
            </td>
        </tr>
    `).join('');
}

function verParcelas(id) {
    showPage('parcelas');
    document.getElementById('filtroDiaParcela').value = '';
    document.getElementById('filtroStatusParcela').value = '';
    setTimeout(() => carregarTodasParcelas(), 100);
}

// ============================================
// MODAL PARCELA
// ============================================
function abrirModalEditarParcela(clienteId, parcelaKey) {
    const cliente = todosClientes[clienteId];
    if (!cliente || !cliente.parcelas || !cliente.parcelas[parcelaKey]) return;
    
    const parcela = cliente.parcelas[parcelaKey];
    
    document.getElementById('infoParcela').innerHTML = `
        <strong>${cliente.nome}</strong><br>
        Parcela ${parcela.numero} - ${formatMoeda(parcela.valor)}<br>
        Vencimento: ${formatData(parcela.vencimento)}
    `;
    document.getElementById('novoStatus').value = parcela.status;
    document.getElementById('parcelaClienteId').value = clienteId;
    document.getElementById('parcelaKey').value = parcelaKey;
    document.getElementById('modalParcela').style.display = 'flex';
}

function fecharModalParcela() {
    document.getElementById('modalParcela').style.display = 'none';
}

async function atualizarStatusParcela() {
    const clienteId = document.getElementById('parcelaClienteId').value;
    const parcelaKey = document.getElementById('parcelaKey').value;
    const novoStatus = document.getElementById('novoStatus').value;
    const dataPag = (novoStatus === 'pago' || novoStatus === 'quitado') ? new Date().toISOString() : null;
    
    await clientesRef.child(`${clienteId}/parcelas/${parcelaKey}`).update({
        status: novoStatus,
        data_pagamento: dataPag
    });
    
    fecharModalParcela();
    carregarTodasParcelas();
}

// ============================================
// CRUD CLIENTES
// ============================================
function abrirModalCliente() {
    document.getElementById('editId').value = '';
    document.getElementById('nomeCliente').value = '';
    document.getElementById('marcaCliente').value = '';
    document.getElementById('valorTotal').value = '';
    document.getElementById('qtdParcelas').value = '1';
    document.getElementById('diaVencimento').value = '5';
    document.getElementById('previewParcela').textContent = '0,00';
    document.getElementById('previewParcelas').textContent = '';
    document.getElementById('modalCliente').style.display = 'flex';
}

function fecharModalCliente() {
    document.getElementById('modalCliente').style.display = 'none';
}

function editarCliente(id) {
    const c = todosClientes[id];
    if (!c) return;
    
    document.getElementById('editId').value = id;
    document.getElementById('nomeCliente').value = c.nome;
    document.getElementById('marcaCliente').value = c.marca;
    document.getElementById('valorTotal').value = c.valor_total;
    document.getElementById('qtdParcelas').value = c.qtd_parcelas;
    document.getElementById('diaVencimento').value = c.dia_vencimento;
    document.getElementById('mesReferencia').value = c.mes_referencia || '';
    calcParcela();
    document.getElementById('modalCliente').style.display = 'flex';
}

function calcParcela() {
    const total = parseFloat(document.getElementById('valorTotal').value) || 0;
    const qtd = parseInt(document.getElementById('qtdParcelas').value) || 1;
    const valor = total / qtd;
    document.getElementById('previewParcela').textContent = valor.toFixed(2);
    document.getElementById('previewParcelas').textContent = `${qtd} parcela(s) de ${formatMoeda(valor)}`;
}

async function salvarCliente() {
    const editId = document.getElementById('editId').value;
    const nome = document.getElementById('nomeCliente').value.trim();
    const marca = document.getElementById('marcaCliente').value.trim();
    const valorTotal = parseFloat(document.getElementById('valorTotal').value);
    const qtdParcelas = parseInt(document.getElementById('qtdParcelas').value);
    const diaVencimento = parseInt(document.getElementById('diaVencimento').value);
    const mesReferencia = document.getElementById('mesReferencia').value;
    
    if (!nome || !marca || !valorTotal || !qtdParcelas || !mesReferencia) {
        alert('Preencha todos os campos obrigatórios!');
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
        qtd_parcelas: qtdParcelas,
        valor_parcela: valorParcela,
        dia_vencimento: diaVencimento,
        mes_referencia: mesReferencia,
        parcelas,
        data_atualizacao: new Date().toISOString()
    };
    
    if (editId) {
        await clientesRef.child(editId).update(dados);
    } else {
        dados.data_cadastro = new Date().toISOString();
        await clientesRef.push(dados);
    }
    
    fecharModalCliente();
}

async function excluirCliente(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    await clientesRef.child(id).remove();
}

// ============================================
// RELATÓRIOS
// ============================================
function carregarRelatorios() {
    const clientes = Object.values(todosClientes);
    let totalRec=0, totalAb=0, totalParc=0, inadParc=0;
    let d5c=0, d5r=0, d5a=0, d20c=0, d20r=0, d20a=0;
    
    clientes.forEach(c => {
        totalRec += calcRecebido(c);
        totalAb += calcAberto(c);
        
        if (c.dia_vencimento === 5) {
            d5c++;
            d5r += calcRecebido(c);
            d5a += calcAberto(c);
        } else if (c.dia_vencimento === 20) {
            d20c++;
            d20r += calcRecebido(c);
            d20a += calcAberto(c);
        }
        
        if (c.parcelas) {
            Object.values(c.parcelas).forEach(p => {
                totalParc++;
                if (p.status === 'inadimplente') inadParc++;
            });
        }
    });
    
    document.getElementById('relClientes').textContent = clientes.length;
    document.getElementById('relRecebido').textContent = formatMoeda(totalRec);
    document.getElementById('relAberto').textContent = formatMoeda(totalAb);
    document.getElementById('relInadimplencia').textContent = totalParc > 0 ? ((inadParc/totalParc)*100).toFixed(1) + '%' : '0%';
    document.getElementById('relDia5Cli').textContent = d5c;
    document.getElementById('relDia5Rec').textContent = formatMoeda(d5r);
    document.getElementById('relDia5Ab').textContent = formatMoeda(d5a);
    document.getElementById('relDia20Cli').textContent = d20c;
    document.getElementById('relDia20Rec').textContent = formatMoeda(d20r);
    document.getElementById('relDia20Ab').textContent = formatMoeda(d20a);
}
