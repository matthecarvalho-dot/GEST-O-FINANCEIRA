// ============================================
// KRONOS SYSTEM v6.0 - COMPLETO E CORRIGIDO
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
const usuariosRef = db.ref('kronos_system/usuarios');

let todosClientes = {};
let charts = {};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔥 KRONOS SYSTEM iniciando...');
    atualizarDataHora();
    setInterval(atualizarDataHora, 60000);
    await verificarBanco();
    carregarMeses();
    inicializarMenu();
    verificarSessaoSalva();
});

async function verificarBanco() {
    try {
        const snap = await db.ref('kronos_system').once('value');
        const dados = snap.val() || {};
        
        // Verificar usuários
        const usuariosSnap = await usuariosRef.once('value');
        const usuarios = usuariosSnap.val() || {};
        
        if (Object.keys(usuarios).length === 0) {
            console.log('📝 Criando Super Admin...');
            await usuariosRef.push({
                nome: "Mattheus Carvalho",
                usuario: "MattheCarvalho",
                senha: "Kronos@2024",
                cargo: "CEO & Fundador",
                nivel: "super_admin",
                ativo: true,
                data_criacao: new Date().toISOString(),
                criado_por: "sistema"
            });
            console.log('✅ Super Admin criado: MattheCarvalho');
        }
        
        // Verificar clientes
        if (!dados.clientes || Object.keys(dados.clientes).length === 0) {
            console.log('📝 Criando clientes exemplo...');
            await clientesRef.set({
                _ex1: {
                    nome: "EMPRESA ALPHA LTDA",
                    marca: "MARCA GOLD",
                    valor_total: 12000,
                    dia_vencimento: 5,
                    mes_referencia: "2024-06",
                    qtd_parcelas: 12,
                    valor_parcela: 1000,
                    data_cadastro: new Date().toISOString(),
                    criado_por: "sistema",
                    parcelas: {
                        p1: { numero:1, valor:1000, vencimento:"2024-06-05", status:"pago", data_pagamento:"2024-06-03" },
                        p2: { numero:2, valor:1000, vencimento:"2024-07-05", status:"quitado", data_pagamento:"2024-07-01" },
                        p3: { numero:3, valor:1000, vencimento:"2024-08-05", status:"finalizando", data_pagamento:null },
                        p4: { numero:4, valor:1000, vencimento:"2024-09-05", status:"inadimplente", data_pagamento:null }
                    }
                },
                _ex2: {
                    nome: "COMÉRCIO BETA",
                    marca: "MARCA PRATA",
                    valor_total: 8000,
                    dia_vencimento: 20,
                    mes_referencia: "2024-06",
                    qtd_parcelas: 8,
                    valor_parcela: 1000,
                    data_cadastro: new Date().toISOString(),
                    criado_por: "sistema",
                    parcelas: {
                        p1: { numero:1, valor:1000, vencimento:"2024-06-20", status:"pago", data_pagamento:"2024-06-18" },
                        p2: { numero:2, valor:1000, vencimento:"2024-07-20", status:"quitado", data_pagamento:"2024-07-15" },
                        p3: { numero:3, valor:1000, vencimento:"2024-08-20", status:"pendente", data_pagamento:null }
                    }
                }
            });
            console.log('✅ Clientes exemplo criados!');
        }
        
        carregarClientes();
    } catch (error) {
        console.error('❌ Erro ao verificar banco:', error);
    }
}

// ============================================
// MOSTRAR/ESCONDER FORMULÁRIOS
// ============================================
function mostrarCriarConta() {
    document.getElementById('formLogin').style.display = 'none';
    document.getElementById('formCriarConta').style.display = 'block';
    // Limpar campos
    document.getElementById('novoNome').value = '';
    document.getElementById('novoCargo').value = '';
    document.getElementById('novoUsuario').value = '';
    document.getElementById('novaSenha').value = '';
    document.getElementById('novaSenhaConf').value = '';
}

function mostrarLogin() {
    document.getElementById('formCriarConta').style.display = 'none';
    document.getElementById('formLogin').style.display = 'block';
}

// ============================================
// CRIAR CONTA
// ============================================
async function criarConta() {
    console.log('📝 Iniciando criação de conta...');
    
    const nome = document.getElementById('novoNome').value.trim();
    const cargo = document.getElementById('novoCargo').value.trim();
    const usuario = document.getElementById('novoUsuario').value.trim();
    const senha = document.getElementById('novaSenha').value;
    const senhaConf = document.getElementById('novaSenhaConf').value;
    
    // Validações
    if (!nome || !usuario || !senha) {
        alert('⚠️ Preencha todos os campos obrigatórios!\n\n• Nome completo\n• Usuário\n• Senha');
        return;
    }
    
    if (senha !== senhaConf) {
        alert('❌ As senhas não conferem!');
        return;
    }
    
    if (senha.length < 6) {
        alert('❌ A senha deve ter pelo menos 6 caracteres!');
        return;
    }
    
    if (usuario.length < 3) {
        alert('❌ O nome de usuário deve ter pelo menos 3 caracteres!');
        return;
    }
    
    try {
        // Verificar se usuário já existe
        const snap = await usuariosRef.orderByChild('usuario').equalTo(usuario).once('value');
        
        if (snap.exists()) {
            alert('❌ Este nome de usuário já está em uso!\nEscolha outro nome de usuário.');
            return;
        }
        
        // Criar usuário
        const novoUsuario = {
            nome: nome,
            cargo: cargo || 'Funcionário',
            usuario: usuario,
            senha: senha,
            nivel: 'funcionario',
            ativo: true,
            data_criacao: new Date().toISOString(),
            criado_por: 'auto_cadastro'
        };
        
        await usuariosRef.push(novoUsuario);
        
        console.log('✅ Conta criada:', usuario);
        alert('✅ Perfil criado com sucesso!\n\nFaça login para acessar o sistema.');
        
        // Voltar para login e preencher usuário
        mostrarLogin();
        document.getElementById('loginUser').value = usuario;
        document.getElementById('loginPass').value = '';
        document.getElementById('loginPass').focus();
        
    } catch (error) {
        console.error('❌ Erro ao criar conta:', error);
        alert('❌ Erro ao criar conta!\n\nVerifique sua conexão e tente novamente.\n\nErro: ' + error.message);
    }
}

// ============================================
// LOGIN
// ============================================
async function fazerLogin() {
    console.log('🔑 Tentando login...');
    
    const login = document.getElementById('loginUser').value.trim();
    const senha = document.getElementById('loginPass').value.trim();
    
    if (!login || !senha) {
        alert('⚠️ Preencha usuário e senha!');
        return;
    }
    
    try {
        const snap = await usuariosRef.orderByChild('usuario').equalTo(login).once('value');
        const usuarios = snap.val();
        
        if (!usuarios) {
            alert('❌ Usuário não encontrado!\n\nVerifique o nome de usuário ou crie uma conta.');
            return;
        }
        
        const userId = Object.keys(usuarios)[0];
        const userData = usuarios[userId];
        
        if (userData.senha !== senha) {
            alert('❌ Senha incorreta!');
            return;
        }
        
        if (!userData.ativo) {
            alert('❌ Usuário desativado!\n\nContate o administrador do sistema.');
            return;
        }
        
        // LOGIN SUCESSO
        console.log('✅ Login bem sucedido:', userData.nome);
        
        window.usuarioLogado = {
            id: userId,
            nome: userData.nome,
            usuario: userData.usuario,
            cargo: userData.cargo || 'Funcionário',
            nivel: userData.nivel
        };
        
        // Salvar sessão
        localStorage.setItem('kronos_user', JSON.stringify(window.usuarioLogado));
        
        // Atualizar último login
        await usuariosRef.child(userId).update({ 
            ultimo_login: new Date().toISOString() 
        });
        
        // Entrar no sistema
        entrarSistema();
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        alert('❌ Erro ao fazer login!\n\nVerifique sua conexão com a internet.');
    }
}

// ============================================
// VERIFICAR SESSÃO SALVA
// ============================================
function verificarSessaoSalva() {
    const userData = localStorage.getItem('kronos_user');
    if (userData) {
        try {
            window.usuarioLogado = JSON.parse(userData);
            console.log('🔄 Sessão encontrada:', window.usuarioLogado.nome);
            entrarSistema();
        } catch (e) {
            localStorage.removeItem('kronos_user');
        }
    }
}

// ============================================
// ENTRAR NO SISTEMA
// ============================================
function entrarSistema() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainSystem').style.display = 'flex';
    
    // Atualizar sidebar
    document.getElementById('sidebarUserName').textContent = window.usuarioLogado.nome.split(' ')[0];
    document.getElementById('sidebarUserCargo').textContent = window.usuarioLogado.cargo || 'Funcionário';
    
    // Mostrar/esconder menu admin
    const menuAdmin = document.querySelector('.menu-item[data-page="admin"]');
    if (menuAdmin) {
        if (window.usuarioLogado.nivel === 'super_admin' || window.usuarioLogado.nivel === 'admin') {
            menuAdmin.style.display = 'flex';
        } else {
            menuAdmin.style.display = 'none';
        }
    }
    
    carregarClientes();
    showPage('dashboard');
}

// ============================================
// SAIR
// ============================================
function sair() {
    localStorage.removeItem('kronos_user');
    window.usuarioLogado = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainSystem').style.display = 'none';
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
}

// ============================================
// NAVEGAÇÃO
// ============================================
function inicializarMenu() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            showPage(this.dataset.page);
        });
    });
}

function showPage(page) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');
    
    const menuEl = document.querySelector(`.menu-item[data-page="${page}"]`);
    if (menuEl) menuEl.classList.add('active');
    
    const titles = {
        dashboard: 'Dashboard Executivo',
        clientes: 'Todos os Clientes',
        dia5: 'Vencimento Dia 5',
        dia20: 'Vencimento Dia 20',
        parcelas: 'Todas as Parcelas',
        relatorios: 'Relatórios',
        admin: 'Gerenciar Usuários'
    };
    document.getElementById('pageTitle').textContent = titles[page] || '';
    
    if (page === 'dashboard') atualizarDashboard();
    else if (page === 'clientes') carregarTabelaClientes();
    else if (page === 'dia5') carregarClientesDia(5);
    else if (page === 'dia20') carregarClientesDia(20);
    else if (page === 'parcelas') carregarTodasParcelas();
    else if (page === 'relatorios') carregarRelatorios();
    else if (page === 'admin') carregarUsuarios();
}

// ============================================
// DADOS
// ============================================
function carregarClientes() {
    clientesRef.on('value', (snap) => {
        todosClientes = snap.val() || {};
        document.getElementById('totalClientesTop').textContent = `${Object.keys(todosClientes).length} clientes`;
        
        const badge5 = document.getElementById('badgeDia5');
        const badge20 = document.getElementById('badgeDia20');
        if (badge5) badge5.textContent = Object.values(todosClientes).filter(c => c.dia_vencimento == 5).length;
        if (badge20) badge20.textContent = Object.values(todosClientes).filter(c => c.dia_vencimento == 20).length;
        
        if (document.getElementById('page-dashboard').classList.contains('active')) {
            atualizarDashboard();
        }
    });
}

function carregarMeses() {
    const sel = document.getElementById('filtroMesCliente');
    if (!sel) return;
    const agora = new Date();
    for (let i = -6; i <= 6; i++) {
        const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const nome = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
        sel.innerHTML += `<option value="${val}">${nome}</option>`;
    }
}

function atualizarDataHora() {
    const el = document.getElementById('currentDateTime');
    if (el) {
        el.textContent = new Date().toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }
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

// ============================================
// DASHBOARD
// ============================================
function atualizarDashboard() {
    const clientes = Object.values(todosClientes);
    let p = 0, q = 0, f = 0, i = 0, tr = 0, ta = 0, tp = 0, inad = 0;
    
    clientes.forEach(c => {
        const st = getStatus(c);
        if (st === 'pago') p++;
        else if (st === 'quitado') q++;
        else if (st === 'finalizando') f++;
        else if (st === 'inadimplente') i++;
        
        tr += calcRecebido(c);
        ta += calcAberto(c);
        
        if (c.parcelas) {
            Object.values(c.parcelas).forEach(pr => {
                tp++;
                if (pr.status === 'inadimplente') inad++;
            });
        }
    });
    
    document.getElementById('kpiPago').textContent = p;
    document.getElementById('kpiQuitado').textContent = q;
    document.getElementById('kpiFinalizando').textContent = f;
    document.getElementById('kpiInadimplente').textContent = i;
    document.getElementById('resumoRecebido').textContent = formatMoeda(tr);
    document.getElementById('resumoAberto').textContent = formatMoeda(ta);
    document.getElementById('resumoInadimplencia').textContent = tp > 0 ? ((inad/tp)*100).toFixed(1) + '%' : '0%';
    
    criarGraficoMensal(clientes);
    criarGraficoStatus(clientes);
    criarGraficoComparativo(clientes);
    carregarUltimosClientes();
}

function carregarUltimosClientes() {
    const tbody = document.getElementById('ultimosClientes');
    if (!tbody) return;
    const clientes = Object.entries(todosClientes).slice(-5).reverse();
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#8899aa;">Nenhum cliente cadastrado</td></tr>';
        return;
    }
    tbody.innerHTML = clientes.map(([_, c]) => `
        <tr>
            <td><strong>${c.nome}</strong></td>
            <td>${c.marca}</td>
            <td>Dia ${c.dia_vencimento}</td>
            <td>${formatMoeda(c.valor_total || 0)}</td>
            <td>${contarPagas(c)}/${c.qtd_parcelas || 0}</td>
            <td><span class="badge-status badge-${getStatus(c)}">${getStatus(c).toUpperCase()}</span></td>
        </tr>
    `).join('');
}

function criarGraficoMensal(clientes) {
    const canvas = document.getElementById('chartMensal');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
                { label: 'Recebido', data: rec, backgroundColor: '#27ae60', borderRadius: 5 },
                { label: 'Em Aberto', data: ab, backgroundColor: '#e74c3c', borderRadius: 5 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#8899aa' } } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8899aa' } },
                x: { grid: { display: false }, ticks: { color: '#8899aa' } }
            }
        }
    });
}

function criarGraficoStatus(clientes) {
    const canvas = document.getElementById('chartStatus');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (charts.status) charts.status.destroy();
    
    let pa = 0, qu = 0, fi = 0, ina = 0, pe = 0;
    clientes.forEach(c => {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach(p => {
            if (p.status === 'pago') pa++;
            else if (p.status === 'quitado') qu++;
            else if (p.status === 'finalizando') fi++;
            else if (p.status === 'inadimplente') ina++;
            else pe++;
        });
    });
    
    charts.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pago', 'Quitado', 'Finalizando', 'Inadimplente', 'Pendente'],
            datasets: [{
                data: [pa, qu, fi, ina, pe],
                backgroundColor: ['#27ae60', '#c9a84c', '#f39c12', '#e74c3c', '#3498db']
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#8899aa', padding: 15 } } }
        }
    });
}

function criarGraficoComparativo(clientes) {
    const canvas = document.getElementById('chartComparativo');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (charts.comp) charts.comp.destroy();
    
    let d5t = 0, d5r = 0, d20t = 0, d20r = 0;
    clientes.forEach(c => {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach(p => {
            const dia = new Date(p.vencimento).getDate();
            if (dia === 5) {
                d5t += p.valor;
                if (p.status === 'pago' || p.status === 'quitado') d5r += p.valor;
            } else if (dia === 20) {
                d20t += p.valor;
                if (p.status === 'pago' || p.status === 'quitado') d20r += p.valor;
            }
        });
    });
    
    charts.comp = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['DIA 5', 'DIA 20'],
            datasets: [
                { label: 'Total', data: [d5t, d20t], backgroundColor: '#3498db', borderRadius: 5 },
                { label: 'Recebido', data: [d5r, d20r], backgroundColor: '#27ae60', borderRadius: 5 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#8899aa' } } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8899aa' } },
                x: { grid: { display: false }, ticks: { color: '#8899aa' } }
            }
        }
    });
}

// ============================================
// TABELAS CLIENTES
// ============================================
function carregarTabelaClientes() {
    const tbody = document.getElementById('tabelaTodosClientes');
    if (!tbody) return;
    
    const busca = (document.getElementById('buscaCliente')?.value || '').toLowerCase();
    const mes = document.getElementById('filtroMesCliente')?.value || '';
    
    let clientes = Object.entries(todosClientes);
    if (busca) clientes = clientes.filter(([_, c]) => 
        c.nome.toLowerCase().includes(busca) || c.marca.toLowerCase().includes(busca)
    );
    if (mes) clientes = clientes.filter(([_, c]) => c.mes_referencia === mes);
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#8899aa;">Nenhum cliente encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map(([id, c]) => renderLinha(id, c)).join('');
}

function carregarClientesDia(dia) {
    const tbody = document.getElementById(`tabelaDia${dia}`);
    const total = document.getElementById(`totalDia${dia}`);
    if (!tbody) return;
    
    const clientes = Object.entries(todosClientes).filter(([_, c]) => c.dia_vencimento == dia);
    if (total) total.textContent = `${clientes.length} clientes`;
    
    if (clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#8899aa;">Nenhum cliente com vencimento dia ${dia}</td></tr>`;
        return;
    }
    
    tbody.innerHTML = clientes.map(([id, c]) => renderLinha(id, c)).join('');
}

function renderLinha(id, c) {
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
                <button class="btn-sm edit" onclick="editarCliente('${id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-sm" onclick="verParcelas('${id}')"><i class="fas fa-list"></i></button>
                <button class="btn-sm danger" onclick="excluirCliente('${id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `;
}

function carregarTodasParcelas() {
    const tbody = document.getElementById('tabelaParcelas');
    if (!tbody) return;
    
    const fs = document.getElementById('filtroStatusParcela')?.value || '';
    const fd = document.getElementById('filtroDiaParcela')?.value || '';
    
    let parcelas = [];
    Object.entries(todosClientes).forEach(([id, c]) => {
        if (!c.parcelas) return;
        Object.entries(c.parcelas).forEach(([key, p]) => {
            if (fs && p.status !== fs) return;
            if (fd && new Date(p.vencimento).getDate() != fd) return;
            parcelas.push({ clienteId: id, parcelaKey: key, clienteNome: c.nome, ...p });
        });
    });
    
    parcelas.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
    
    if (parcelas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#8899aa;">Nenhuma parcela encontrada</td></tr>';
        return;
    }
    
    tbody.innerHTML = parcelas.map(p => `
        <tr>
            <td><strong>${p.clienteNome}</strong></td>
            <td>${p.numero}ª Parcela</td>
            <td>${formatMoeda(p.valor)}</td>
            <td>${formatData(p.vencimento)}</td>
            <td><span class="badge-status badge-${p.status}">${p.status.toUpperCase()}</span></td>
            <td>${p.data_pagamento ? formatData(p.data_pagamento) : 'Não pago'}</td>
            <td><button class="btn-sm edit" onclick="abrirModalEditarParcela('${p.clienteId}','${p.parcelaKey}')"><i class="fas fa-pen"></i></button></td>
        </tr>
    `).join('');
}

function verParcelas(id) {
    showPage('parcelas');
    setTimeout(carregarTodasParcelas, 100);
}

// ============================================
// MODAL PARCELA
// ============================================
function abrirModalEditarParcela(clienteId, parcelaKey) {
    const c = todosClientes[clienteId];
    if (!c || !c.parcelas || !c.parcelas[parcelaKey]) return;
    const p = c.parcelas[parcelaKey];
    
    document.getElementById('infoParcela').innerHTML = `
        <strong>${c.nome}</strong><br>
        Parcela ${p.numero} - ${formatMoeda(p.valor)}<br>
        Vencimento: ${formatData(p.vencimento)}
    `;
    document.getElementById('novoStatus').value = p.status;
    document.getElementById('parcelaClienteId').value = clienteId;
    document.getElementById('parcelaKey').value = parcelaKey;
    document.getElementById('modalParcela').style.display = 'flex';
}

function fecharModalParcela() {
    document.getElementById('modalParcela').style.display = 'none';
}

async function atualizarStatusParcela() {
    const cid = document.getElementById('parcelaClienteId').value;
    const key = document.getElementById('parcelaKey').value;
    const st = document.getElementById('novoStatus').value;
    const dp = (st === 'pago' || st === 'quitado') ? new Date().toISOString() : null;
    
    await clientesRef.child(`${cid}/parcelas/${key}`).update({ status: st, data_pagamento: dp });
    fecharModalParcela();
    carregarTodasParcelas();
}

// ============================================
// CRUD CLIENTES
// ============================================
function abrirModalCliente() {
    document.getElementById('editId').value = '';
    document.getElementById('modalTitulo').textContent = 'NOVO CLIENTE';
    ['nomeCliente', 'marcaCliente', 'valorTotal'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('qtdParcelas').value = '1';
    document.getElementById('previewParcela').textContent = 'R$ 0,00';
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
    document.getElementById('modalTitulo').textContent = 'EDITAR CLIENTE';
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
    const t = parseFloat(document.getElementById('valorTotal').value) || 0;
    const q = parseInt(document.getElementById('qtdParcelas').value) || 1;
    document.getElementById('previewParcela').textContent = formatMoeda(t / q);
    document.getElementById('previewParcelas').textContent = `${q} parcela(s)`;
}

async function salvarCliente() {
    const eid = document.getElementById('editId').value;
    const nome = document.getElementById('nomeCliente').value.trim();
    const marca = document.getElementById('marcaCliente').value.trim();
    const vt = parseFloat(document.getElementById('valorTotal').value);
    const qp = parseInt(document.getElementById('qtdParcelas').value);
    const dv = parseInt(document.getElementById('diaVencimento').value);
    const mr = document.getElementById('mesReferencia').value;
    
    if (!nome || !marca || !vt || !qp || !mr) {
        alert('Preencha todos os campos!');
        return;
    }
    
    const vp = vt / qp;
    const parcelas = {};
    const [ano, mes] = mr.split('-').map(Number);
    
    for (let i = 1; i <= qp; i++) {
        const venc = new Date(ano, mes - 1 + (i - 1), dv);
        parcelas[`p${i}`] = {
            numero: i,
            valor: vp,
            vencimento: venc.toISOString().split('T')[0],
            status: 'pendente',
            data_pagamento: null
        };
    }
    
    const dados = {
        nome, marca,
        valor_total: vt,
        qtd_parcelas: qp,
        valor_parcela: vp,
        dia_vencimento: dv,
        mes_referencia: mr,
        parcelas,
        data_atualizacao: new Date().toISOString(),
        criado_por: window.usuarioLogado ? window.usuarioLogado.usuario : 'admin'
    };
    
    if (eid) {
        await clientesRef.child(eid).update(dados);
    } else {
        dados.data_cadastro = new Date().toISOString();
        await clientesRef.push(dados);
    }
    
    fecharModalCliente();
}

async function excluirCliente(id) {
    if (confirm('Excluir este cliente?')) {
        await clientesRef.child(id).remove();
    }
}

// ============================================
// RELATÓRIOS
// ============================================
function carregarRelatorios() {
    const clientes = Object.values(todosClientes);
    let tr = 0, ta = 0, tp = 0, ina = 0;
    let d5c = 0, d5r = 0, d5a = 0, d20c = 0, d20r = 0, d20a = 0;
    
    clientes.forEach(c => {
        tr += calcRecebido(c);
        ta += calcAberto(c);
        
        if (c.dia_vencimento === 5) {
            d5c++;
            d5r += calcRecebido(c);
            d5a += calcAberto(c);
        }
        if (c.dia_vencimento === 20) {
            d20c++;
            d20r += calcRecebido(c);
            d20a += calcAberto(c);
        }
        
        if (c.parcelas) {
            Object.values(c.parcelas).forEach(p => {
                tp++;
                if (p.status === 'inadimplente') ina++;
            });
        }
    });
    
    document.getElementById('relClientes').textContent = clientes.length;
    document.getElementById('relRecebido').textContent = formatMoeda(tr);
    document.getElementById('relAberto').textContent = formatMoeda(ta);
    document.getElementById('relInadimplencia').textContent = tp > 0 ? ((ina/tp)*100).toFixed(1) + '%' : '0%';
    document.getElementById('relDia5Cli').textContent = d5c;
    document.getElementById('relDia5Rec').textContent = formatMoeda(d5r);
    document.getElementById('relDia5Ab').textContent = formatMoeda(d5a);
    document.getElementById('relDia20Cli').textContent = d20c;
    document.getElementById('relDia20Rec').textContent = formatMoeda(d20r);
    document.getElementById('relDia20Ab').textContent = formatMoeda(d20a);
}

// ============================================
// GERENCIAR USUÁRIOS
// ============================================
async function carregarUsuarios() {
    const snap = await usuariosRef.once('value');
    const usuarios = snap.val() || {};
    
    // Meu perfil
    if (window.usuarioLogado) {
        document.getElementById('meuPerfil').innerHTML = `
            <h4>${window.usuarioLogado.nome}</h4>
            <p>${window.usuarioLogado.cargo} • ${window.usuarioLogado.nivel.replace('_', ' ').toUpperCase()}</p>
            <small style="color:#8899aa;">@${window.usuarioLogado.usuario}</small>
        `;
    }
    
    // Lista de usuários
    const container = document.getElementById('listaUsuarios');
    const lista = Object.entries(usuarios);
    
    if (lista.length === 0) {
        container.innerHTML = '<p style="color:#8899aa;text-align:center;padding:20px;">Nenhum funcionário cadastrado</p>';
        return;
    }
    
    container.innerHTML = lista.map(([id, u]) => {
        const isMe = window.usuarioLogado && window.usuarioLogado.id === id;
        const nivelBadge = u.nivel === 'super_admin' ? 'badge-pago' :
                          u.nivel === 'admin' ? 'badge-quitado' :
                          u.nivel === 'gerente' ? 'badge-finalizando' : 'badge-pendente';
        
        return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #1e293b;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:40px;height:40px;border-radius:50%;background:rgba(212,168,83,0.15);display:flex;align-items:center;justify-content:center;color:#c9a84c;font-weight:700;font-size:1rem;">${u.nome.charAt(0).toUpperCase()}</div>
                    <div>
                        <strong style="color:#fff;">${u.nome} ${isMe ? '(Você)' : ''}</strong>
                        <small style="color:#8899aa;display:block;">@${u.usuario} • ${u.cargo}</small>
                        <span class="badge-status ${nivelBadge}" style="font-size:0.6rem;">${u.nivel.replace('_',' ').toUpperCase()}</span>
                        <span class="badge-status ${u.ativo ? 'badge-pago' : 'badge-inadimplente'}" style="font-size:0.6rem;margin-left:4px;">${u.ativo ? 'ATIVO' : 'INATIVO'}</span>
                    </div>
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="btn-sm edit" onclick="editarUsuario('${id}')"><i class="fas fa-edit"></i></button>
                    ${!isMe ? `
                        <button class="btn-sm" onclick="toggleUsuario('${id}',${!u.ativo})"><i class="fas fa-power-off"></i></button>
                        <button class="btn-sm danger" onclick="excluirUsuario('${id}')"><i class="fas fa-trash"></i></button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function abrirModalUsuario() {
    document.getElementById('editUserId').value = '';
    document.getElementById('modalUsuarioTitulo').textContent = 'NOVO USUÁRIO';
    ['usuarioNome', 'usuarioCargo', 'usuarioLogin', 'usuarioSenha'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('usuarioNivel').value = 'funcionario';
    document.getElementById('usuarioAtivo').value = 'true';
    document.getElementById('modalUsuario').style.display = 'flex';
}

function editarUsuario(id) {
    usuariosRef.child(id).once('value').then(snap => {
        const u = snap.val();
        if (!u) return;
        document.getElementById('editUserId').value = id;
        document.getElementById('modalUsuarioTitulo').textContent = 'EDITAR USUÁRIO';
        document.getElementById('usuarioNome').value = u.nome;
        document.getElementById('usuarioCargo').value = u.cargo || '';
        document.getElementById('usuarioLogin').value = u.usuario;
        document.getElementById('usuarioSenha').value = u.senha;
        document.getElementById('usuarioNivel').value = u.nivel;
        document.getElementById('usuarioAtivo').value = u.ativo ? 'true' : 'false';
        document.getElementById('modalUsuario').style.display = 'flex';
    });
}

function editarMeuPerfil() {
    if (!window.usuarioLogado) return;
    editarUsuario(window.usuarioLogado.id);
}

function fecharModalUsuario() {
    document.getElementById('modalUsuario').style.display = 'none';
}

async function salvarUsuario() {
    const editId = document.getElementById('editUserId').value;
    const nome = document.getElementById('usuarioNome').value.trim();
    const cargo = document.getElementById('usuarioCargo').value.trim();
    const login = document.getElementById('usuarioLogin').value.trim();
    const senha = document.getElementById('usuarioSenha').value.trim();
    const nivel = document.getElementById('usuarioNivel').value;
    const ativo = document.getElementById('usuarioAtivo').value === 'true';
    
    if (!nome || !login || !senha) {
        alert('Preencha os campos obrigatórios!');
        return;
    }
    
    const dados = { nome, cargo, usuario: login, senha, nivel, ativo, data_atualizacao: new Date().toISOString() };
    
    if (editId) {
        await usuariosRef.child(editId).update(dados);
        if (window.usuarioLogado && window.usuarioLogado.id === editId) {
            window.usuarioLogado.nome = nome;
            window.usuarioLogado.cargo = cargo;
            window.usuarioLogado.usuario = login;
            window.usuarioLogado.nivel = nivel;
            localStorage.setItem('kronos_user', JSON.stringify(window.usuarioLogado));
            document.getElementById('sidebarUserName').textContent = nome.split(' ')[0];
            document.getElementById('sidebarUserCargo').textContent = cargo;
        }
    } else {
        dados.data_criacao = new Date().toISOString();
        dados.criado_por = window.usuarioLogado ? window.usuarioLogado.usuario : 'sistema';
        await usuariosRef.push(dados);
    }
    
    fecharModalUsuario();
    carregarUsuarios();
    alert('✅ Usuário salvo com sucesso!');
}

async function toggleUsuario(id, ativo) {
    await usuariosRef.child(id).update({ ativo });
    carregarUsuarios();
}

async function excluirUsuario(id) {
    if (!confirm('Excluir este usuário?')) return;
    const snap = await usuariosRef.child(id).once('value');
    const u = snap.val();
    if (u && u.nivel === 'super_admin') {
        alert('❌ Não é possível excluir o Super Administrador!');
        return;
    }
    await usuariosRef.child(id).remove();
    carregarUsuarios();
}

// Enter para login
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen && loginScreen.style.display !== 'none') {
            fazerLogin();
        }
    }
});

console.log('🚀 KRONOS SYSTEM v6.0 - PRONTO PARA USO!');
console.log('👤 Super Admin: MattheCarvalho / Kronos@2024');
console.log('📝 Use "Criar perfil" para cadastrar novos funcionários');
