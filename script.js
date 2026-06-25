// ============================================
// KRONOS SYSTEM v12.0 - COMPLETO E CORRIGIDO
// Login para todos os perfis funcionando
// Dias: 5, 15, 20, 30 + Relatórios + Impressão
// Tempo Real + Salvamento Automático + 2 Telefones
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
const sistemaRef = db.ref('kronos_system');

let todosClientes = {};
let charts = {};
let relatorioAtual = 'mensal';

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔥 KRONOS SYSTEM v12.0 iniciando...');
    atualizarDataHora();
    setInterval(atualizarDataHora, 60000);
    await verificarBanco();
    carregarMeses();
    inicializarMenu();
    verificarSessaoSalva();
});

async function verificarBanco() {
    const snap = await sistemaRef.once('value');
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
                nome: "EMPRESA ALPHA LTDA", marca: "MARCA GOLD",
                telefone1: "(11) 99999-0001", telefone2: "(11) 3333-0001",
                valor_total: 12000, dia_vencimento: 5, mes_referencia: "2024-06",
                qtd_parcelas: 12, valor_parcela: 1000,
                data_cadastro: new Date().toISOString(), criado_por: "sistema",
                parcelas: {
                    p1: { numero:1, valor:1000, vencimento:"2024-06-05", status:"pago", data_pagamento:"2024-06-03" },
                    p2: { numero:2, valor:1000, vencimento:"2024-07-05", status:"quitado", data_pagamento:"2024-07-01" },
                    p3: { numero:3, valor:1000, vencimento:"2024-08-05", status:"finalizando", data_pagamento:null },
                    p4: { numero:4, valor:1000, vencimento:"2024-09-05", status:"inadimplente", data_pagamento:null }
                }
            },
            _ex2: {
                nome: "COMÉRCIO BETA EIRELI", marca: "MARCA PRATA",
                telefone1: "(21) 98888-0002", telefone2: "",
                valor_total: 8000, dia_vencimento: 20, mes_referencia: "2024-06",
                qtd_parcelas: 8, valor_parcela: 1000,
                data_cadastro: new Date().toISOString(), criado_por: "sistema",
                parcelas: {
                    p1: { numero:1, valor:1000, vencimento:"2024-06-20", status:"pago", data_pagamento:"2024-06-18" },
                    p2: { numero:2, valor:1000, vencimento:"2024-07-20", status:"quitado", data_pagamento:"2024-07-15" },
                    p3: { numero:3, valor:1000, vencimento:"2024-08-20", status:"pendente", data_pagamento:null }
                }
            },
            _ex3: {
                nome: "CLIENTE ANTIGO LTDA", marca: "MARCA BRONZE",
                telefone1: "(31) 97777-0003", telefone2: "",
                valor_total: 5000, dia_vencimento: 15, mes_referencia: "2023-01",
                qtd_parcelas: 5, valor_parcela: 1000,
                data_cadastro: "2023-01-10T00:00:00Z", criado_por: "sistema",
                parcelas: {
                    p1: { numero:1, valor:1000, vencimento:"2023-01-15", status:"quitado", data_pagamento:"2023-01-14" },
                    p2: { numero:2, valor:1000, vencimento:"2023-02-15", status:"quitado", data_pagamento:"2023-02-13" }
                }
            },
            _ex4: {
                nome: "EMPRESA 30 DIAS LTDA", marca: "MARCA OURO",
                telefone1: "(41) 96666-0004", telefone2: "(41) 4444-0004",
                valor_total: 15000, dia_vencimento: 30, mes_referencia: "2024-03",
                qtd_parcelas: 15, valor_parcela: 1000,
                data_cadastro: new Date().toISOString(), criado_por: "sistema",
                parcelas: {
                    p1: { numero:1, valor:1000, vencimento:"2024-03-30", status:"pago", data_pagamento:"2024-03-28" },
                    p2: { numero:2, valor:1000, vencimento:"2024-04-30", status:"finalizando", data_pagamento:null }
                }
            }
        });
        console.log('✅ Clientes exemplo criados');
    }
    
    carregarClientesTempoReal();
}

// ============================================
// TEMPO REAL
// ============================================
function carregarClientesTempoReal() {
    clientesRef.on('value', (snap) => {
        todosClientes = snap.val() || {};
        const totalEl = document.getElementById('totalClientesTop');
        if (totalEl) totalEl.textContent = `${Object.keys(todosClientes).length} clientes`;
        atualizarBadgesDias();
        atualizarPaginaAtiva();
    });
}

function atualizarBadgesDias() {
    const clientes = Object.values(todosClientes);
    const b5 = document.getElementById('badgeDia5');
    const b15 = document.getElementById('badgeDia15');
    const b20 = document.getElementById('badgeDia20');
    const b30 = document.getElementById('badgeDia30');
    if (b5) b5.textContent = clientes.filter(c => c.dia_vencimento == 5).length;
    if (b15) b15.textContent = clientes.filter(c => c.dia_vencimento == 15).length;
    if (b20) b20.textContent = clientes.filter(c => c.dia_vencimento == 20).length;
    if (b30) b30.textContent = clientes.filter(c => c.dia_vencimento == 30).length;
}

function atualizarPaginaAtiva() {
    const dp = document.getElementById('page-dashboard');
    const cp = document.getElementById('page-clientes');
    const d5 = document.getElementById('page-dia5');
    const d15 = document.getElementById('page-dia15');
    const d20 = document.getElementById('page-dia20');
    const d30 = document.getElementById('page-dia30');
    const pp = document.getElementById('page-parcelas');
    const rp = document.getElementById('page-relatorios');
    
    if (dp && dp.classList.contains('active')) atualizarDashboard();
    else if (cp && cp.classList.contains('active')) carregarTabelaClientes();
    else if (d5 && d5.classList.contains('active')) carregarClientesDia(5);
    else if (d15 && d15.classList.contains('active')) carregarClientesDia(15);
    else if (d20 && d20.classList.contains('active')) carregarClientesDia(20);
    else if (d30 && d30.classList.contains('active')) carregarClientesDia(30);
    else if (pp && pp.classList.contains('active')) carregarTodasParcelas();
    else if (rp && rp.classList.contains('active')) carregarRelatorios();
}

// ============================================
// LOGIN / CRIAR CONTA (CORRIGIDO)
// ============================================
function mostrarCriarConta() {
    document.getElementById('formLogin').style.display = 'none';
    document.getElementById('formCriarConta').style.display = 'block';
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

async function criarConta() {
    const nome = document.getElementById('novoNome').value.trim();
    const cargo = document.getElementById('novoCargo').value.trim();
    const usuario = document.getElementById('novoUsuario').value.trim();
    const senha = document.getElementById('novaSenha').value;
    const senhaConf = document.getElementById('novaSenhaConf').value;

    if (!nome || !usuario || !senha) {
        alert('⚠️ Preencha todos os campos obrigatórios!\n\n• Nome completo\n• Usuário\n• Senha');
        return;
    }

    if (senha !== senhaConf) {
        alert('❌ As senhas não conferem!');
        return;
    }

    if (senha.length < 4) {
        alert('❌ A senha deve ter pelo menos 4 caracteres!');
        return;
    }

    if (usuario.length < 3) {
        alert('❌ O usuário deve ter pelo menos 3 caracteres!');
        return;
    }

    try {
        // Verificar se usuário já existe
        const snap = await usuariosRef.once('value');
        const usuarios = snap.val() || {};
        
        for (const [id, u] of Object.entries(usuarios)) {
            if (u.usuario && u.usuario.toLowerCase() === usuario.toLowerCase()) {
                alert('❌ Este nome de usuário já está em uso!\n\nEscolha outro nome.');
                return;
            }
        }

        // Criar novo usuário
        const novoUsuario = {
            nome: nome,
            cargo: cargo || 'Funcionário',
            usuario: usuario,
            senha: senha,
            nivel: 'funcionario',
            ativo: true,
            data_criacao: new Date().toISOString(),
            criado_por: 'auto_cadastro',
            ultimo_login: null
        };

        await usuariosRef.push(novoUsuario);

        console.log('✅ Novo usuário criado:', usuario);
        alert('✅ Perfil criado com sucesso!\n\nFaça login com:\nUsuário: ' + usuario);

        mostrarLogin();
        document.getElementById('loginUser').value = usuario;
        document.getElementById('loginPass').value = '';

    } catch (error) {
        console.error('❌ Erro ao criar conta:', error);
        alert('❌ Erro ao criar conta! Tente novamente.');
    }
}

async function fazerLogin() {
    const login = document.getElementById('loginUser').value.trim();
    const senha = document.getElementById('loginPass').value.trim();

    if (!login || !senha) {
        alert('⚠️ Preencha usuário e senha!');
        return;
    }

    try {
        console.log('🔑 Tentando login:', login);
        
        // Buscar todos os usuários
        const snap = await usuariosRef.once('value');
        const usuarios = snap.val() || {};
        
        console.log('📋 Total de usuários:', Object.keys(usuarios).length);
        
        // Procurar usuário (case insensitive)
        let userId = null;
        let userData = null;
        
        for (const [id, u] of Object.entries(usuarios)) {
            if (u.usuario && u.usuario.toLowerCase() === login.toLowerCase()) {
                userId = id;
                userData = u;
                break;
            }
        }

        if (!userData) {
            console.log('❌ Usuário não encontrado:', login);
            alert('❌ Usuário não encontrado!\n\nVerifique o nome de usuário ou crie uma conta.');
            return;
        }

        console.log('✅ Usuário encontrado:', userData.usuario);

        if (userData.senha !== senha) {
            console.log('❌ Senha incorreta');
            alert('❌ Senha incorreta!');
            return;
        }

        if (!userData.ativo) {
            console.log('❌ Usuário desativado');
            alert('❌ Usuário desativado!\n\nContate o administrador.');
            return;
        }

        // LOGIN SUCESSO
        console.log('✅ Login bem-sucedido:', userData.nome);
        
        window.usuarioLogado = {
            id: userId,
            nome: userData.nome,
            usuario: userData.usuario,
            cargo: userData.cargo || 'Funcionário',
            nivel: userData.nivel || 'funcionario'
        };

        localStorage.setItem('kronos_user', JSON.stringify(window.usuarioLogado));
        
        await usuariosRef.child(userId).update({
            ultimo_login: new Date().toISOString()
        });

        entrarSistema();

    } catch (error) {
        console.error('❌ Erro no login:', error);
        alert('❌ Erro ao fazer login! Tente novamente.');
    }
}

function verificarSessaoSalva() {
    const userData = localStorage.getItem('kronos_user');
    if (userData) {
        try {
            const dados = JSON.parse(userData);
            console.log('🔄 Verificando sessão:', dados.usuario);
            
            usuariosRef.once('value').then(snap => {
                const usuarios = snap.val() || {};
                let encontrado = false;
                
                for (const [id, u] of Object.entries(usuarios)) {
                    if (u.usuario === dados.usuario && u.ativo) {
                        encontrado = true;
                        window.usuarioLogado = dados;
                        entrarSistema();
                        break;
                    }
                }
                
                if (!encontrado) {
                    console.log('❌ Sessão expirada');
                    localStorage.removeItem('kronos_user');
                }
            });
        } catch (e) {
            localStorage.removeItem('kronos_user');
        }
    }
}

function entrarSistema() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainSystem').style.display = 'flex';
    document.getElementById('sidebarUserName').textContent = window.usuarioLogado.nome.split(' ')[0];
    document.getElementById('sidebarUserCargo').textContent = window.usuarioLogado.cargo || 'Funcionário';
    
    const menuAdmin = document.querySelector('.menu-item[data-page="admin"]');
    if (menuAdmin) {
        menuAdmin.style.display = (window.usuarioLogado.nivel === 'super_admin' || window.usuarioLogado.nivel === 'admin') ? 'flex' : 'none';
    }
    
    carregarClientesTempoReal();
    showPage('dashboard');
}

function sair() {
    localStorage.removeItem('kronos_user');
    window.usuarioLogado = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainSystem').style.display = 'none';
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
        dashboard: 'Dashboard Executivo', clientes: 'Todos os Clientes',
        dia5: 'Vencimento Dia 5', dia15: 'Vencimento Dia 15',
        dia20: 'Vencimento Dia 20', dia30: 'Vencimento Dia 30',
        parcelas: 'Todas as Parcelas', relatorios: 'Relatórios',
        admin: 'Gerenciar Usuários', backup: 'Backup e Restauração'
    };
    document.getElementById('pageTitle').textContent = titles[page] || '';

    if (page === 'dashboard') atualizarDashboard();
    else if (page === 'clientes') carregarTabelaClientes();
    else if (page === 'dia5') carregarClientesDia(5);
    else if (page === 'dia15') carregarClientesDia(15);
    else if (page === 'dia20') carregarClientesDia(20);
    else if (page === 'dia30') carregarClientesDia(30);
    else if (page === 'parcelas') carregarTodasParcelas();
    else if (page === 'relatorios') carregarRelatorios();
    else if (page === 'admin') carregarUsuarios();
}

// ============================================
// DADOS
// ============================================
function carregarMeses() {
    const sel = document.getElementById('filtroMesCliente');
    if (!sel) return;
    sel.innerHTML = '<option value="">Todos os Meses</option>';
    const agora = new Date();
    for (let i = -12; i <= 6; i++) {
        const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const nome = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
        sel.innerHTML += `<option value="${val}">${nome}</option>`;
    }
}

function atualizarDataHora() {
    const el = document.getElementById('currentDateTime');
    if (el) el.textContent = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
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
    return 'pendente';
}

function calcAberto(c) { if (!c.parcelas) return c.valor_total || 0; return Object.values(c.parcelas).filter(p => p.status !== 'pago' && p.status !== 'quitado').reduce((t, p) => t + p.valor, 0); }
function calcRecebido(c) { if (!c.parcelas) return 0; return Object.values(c.parcelas).filter(p => p.status === 'pago' || p.status === 'quitado').reduce((t, p) => t + p.valor, 0); }
function contarPagas(c) { if (!c.parcelas) return 0; return Object.values(c.parcelas).filter(p => p.status === 'pago' || p.status === 'quitado').length; }
function formatMoeda(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function formatData(d) { if (!d) return '-'; return new Date(d).toLocaleDateString('pt-BR'); }

// ============================================
// BACKUP
// ============================================
async function fazerBackup() {
    try {
        const snap = await sistemaRef.once('value');
        const dados = snap.val();
        const json = JSON.stringify(dados, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const data = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `kronos_backup_${data}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('✅ Backup baixado com sucesso!');
    } catch (error) {
        alert('❌ Erro ao fazer backup!');
    }
}

async function restaurarBackup() {
    const fileInput = document.getElementById('arquivoBackup');
    const file = fileInput.files[0];
    if (!file) { alert('⚠️ Selecione um arquivo de backup (.json)!'); return; }
    if (!confirm('⚠️ Isso substituirá TODOS os dados! Continuar?')) return;
    try {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const dados = JSON.parse(e.target.result);
                await sistemaRef.set(dados);
                alert('✅ Backup restaurado! Recarregando...');
                location.reload();
            } catch (error) {
                alert('❌ Arquivo inválido!');
            }
        };
        reader.readAsText(file);
    } catch (error) {
        alert('❌ Erro ao restaurar!');
    }
}

// ============================================
// DASHBOARD
// ============================================
function atualizarDashboard() {
    const clientes = Object.values(todosClientes);
    let p = 0, q = 0, f = 0, i = 0, tr = 0, ta = 0, tp = 0, inad = 0;
    
    clientes.forEach(c => {
        const st = getStatus(c);
        if (st === 'pago') p++; else if (st === 'quitado') q++;
        else if (st === 'finalizando') f++; else if (st === 'inadimplente') i++;
        tr += calcRecebido(c); ta += calcAberto(c);
        if (c.parcelas) Object.values(c.parcelas).forEach(pr => { tp++; if (pr.status === 'inadimplente') inad++; });
    });
    
    document.getElementById('kpiPago').textContent = p;
    document.getElementById('kpiQuitado').textContent = q;
    document.getElementById('kpiFinalizando').textContent = f;
    document.getElementById('kpiInadimplente').textContent = i;
    document.getElementById('resumoRecebido').textContent = formatMoeda(tr);
    document.getElementById('resumoAberto').textContent = formatMoeda(ta);
    document.getElementById('resumoInadimplencia').textContent = tp > 0 ? ((inad / tp) * 100).toFixed(1) + '%' : '0%';
    
    criarGraficoMensal(clientes);
    criarGraficoStatus(clientes);
    criarGraficoComparativo(clientes);
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
                { label: 'Recebido', data: rec, backgroundColor: '#10b981', borderRadius: 5 },
                { label: 'Em Aberto', data: ab, backgroundColor: '#ef4444', borderRadius: 5 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8' } } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
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
            if (p.status === 'pago') pa++; else if (p.status === 'quitado') qu++;
            else if (p.status === 'finalizando') fi++; else if (p.status === 'inadimplente') ina++;
            else pe++;
        });
    });
    
    charts.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pago','Quitado','Finalizando','Inadimplente','Pendente'],
            datasets: [{ data: [pa,qu,fi,ina,pe], backgroundColor: ['#10b981','#e2b94b','#f59e0b','#ef4444','#3b82f6'] }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 15 } } }
        }
    });
}

function criarGraficoComparativo(clientes) {
    const canvas = document.getElementById('chartComparativo');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (charts.comp) charts.comp.destroy();
    
    let d5t = 0, d5r = 0, d15t = 0, d15r = 0, d20t = 0, d20r = 0, d30t = 0, d30r = 0;
    clientes.forEach(c => {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach(p => {
            const dia = new Date(p.vencimento).getDate();
            if (dia === 5) { d5t += p.valor; if (p.status === 'pago' || p.status === 'quitado') d5r += p.valor; }
            else if (dia === 15) { d15t += p.valor; if (p.status === 'pago' || p.status === 'quitado') d15r += p.valor; }
            else if (dia === 20) { d20t += p.valor; if (p.status === 'pago' || p.status === 'quitado') d20r += p.valor; }
            else if (dia === 30) { d30t += p.valor; if (p.status === 'pago' || p.status === 'quitado') d30r += p.valor; }
        });
    });
    
    charts.comp = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['DIA 5','DIA 15','DIA 20','DIA 30'],
            datasets: [
                { label: 'Total', data: [d5t,d15t,d20t,d30t], backgroundColor: '#3b82f6', borderRadius: 5 },
                { label: 'Recebido', data: [d5r,d15r,d20r,d30r], backgroundColor: '#10b981', borderRadius: 5 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8' } } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// ============================================
// TABELAS
// ============================================
function carregarTabelaClientes() {
    const tbody = document.getElementById('tabelaTodosClientes');
    if (!tbody) return;
    const busca = (document.getElementById('buscaCliente')?.value || '').toLowerCase();
    const mes = document.getElementById('filtroMesCliente')?.value || '';
    let clientes = Object.entries(todosClientes);
    if (busca) clientes = clientes.filter(([_, c]) => c.nome.toLowerCase().includes(busca) || c.marca.toLowerCase().includes(busca));
    if (mes) clientes = clientes.filter(([_, c]) => c.mes_referencia === mes);
    if (clientes.length === 0) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;">Nenhum cliente</td></tr>'; return; }
    tbody.innerHTML = clientes.map(([id, c]) => renderLinha(id, c)).join('');
}

function carregarClientesDia(dia) {
    const tbody = document.getElementById(`tabelaDia${dia}`);
    const total = document.getElementById(`totalDia${dia}`);
    if (!tbody) return;
    const clientes = Object.entries(todosClientes).filter(([_, c]) => c.dia_vencimento == dia);
    if (total) total.textContent = `${clientes.length} clientes`;
    if (clientes.length === 0) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;">Nenhum cliente dia ${dia}</td></tr>`; return; }
    tbody.innerHTML = clientes.map(([id, c]) => renderLinha(id, c)).join('');
}

function renderLinha(id, c) {
    const st = getStatus(c);
    const tel1 = c.telefone1 ? `<br><small style="color:#94a3b8;">📱 ${c.telefone1}</small>` : '';
    return `<tr>
        <td><strong>${c.nome}</strong>${tel1}</td>
        <td>${c.marca}</td>
        <td>Dia ${c.dia_vencimento} - ${c.mes_referencia || '-'}</td>
        <td>${formatMoeda(c.valor_total || 0)}</td>
        <td>${contarPagas(c)}/${c.qtd_parcelas || 0}</td>
        <td>${formatMoeda(calcAberto(c))}</td>
        <td><span class="badge-status badge-${st}">${st.toUpperCase()}</span></td>
        <td>
            <button class="btn-sm edit" onclick="abrirPerfilCliente('${id}')"><i class="fas fa-id-card"></i></button>
            <button class="btn-sm danger" onclick="excluirCliente('${id}')"><i class="fas fa-trash"></i></button>
        </td>
    </tr>`;
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
    if (parcelas.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;">Nenhuma parcela</td></tr>'; return; }
    tbody.innerHTML = parcelas.map(p => `<tr>
        <td><strong>${p.clienteNome}</strong></td><td>${p.numero}ª</td>
        <td>${formatMoeda(p.valor)}</td><td>${formatData(p.vencimento)}</td>
        <td><span class="badge-status badge-${p.status}">${p.status.toUpperCase()}</span></td>
        <td>${p.data_pagamento ? formatData(p.data_pagamento) : 'Não pago'}</td>
        <td><button class="btn-sm edit" onclick="abrirModalEditarParcela('${p.clienteId}','${p.parcelaKey}')"><i class="fas fa-pen"></i></button></td>
    </tr>`).join('');
}

// ============================================
// PERFIL CLIENTE
// ============================================
function abrirPerfilCliente(id) {
    const c = todosClientes[id];
    if (!c) return;
    if (!c.telefone1) c.telefone1 = '';
    if (!c.telefone2) c.telefone2 = '';
    const ex = document.getElementById('modalPerfilCliente');
    if (ex) ex.remove();
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalPerfilCliente';
    modal.style.display = 'flex';
    const st = getStatus(c);
    const parcelas = Object.entries(c.parcelas || {}).sort((a, b) => a[1].numero - b[1].numero);
    
    modal.innerHTML = `
        <div class="modal-modern" style="width:950px;max-width:98%;max-height:90vh;">
            <div class="modal-header" style="background:linear-gradient(135deg,rgba(226,185,75,0.1),transparent);">
                <div><h2>${c.nome}</h2><small style="color:#94a3b8;">${c.marca} • Dia ${c.dia_vencimento} • ${c.mes_referencia || 'N/A'}</small></div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span class="badge-status badge-${st}" style="font-size:0.8rem;">${st.toUpperCase()}</span>
                    <button onclick="document.getElementById('modalPerfilCliente').remove()" style="background:none;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;">&times;</button>
                </div>
            </div>
            <div class="modal-body" style="padding:25px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:25px;">
                    <div style="background:var(--bg-tertiary,#152238);padding:20px;border-radius:14px;">
                        <h4 style="color:var(--gold);margin-bottom:15px;"><i class="fas fa-user"></i> DADOS</h4>
                        <div style="display:grid;gap:12px;">
                            <div><small style="color:#94a3b8;">NOME</small><input id="editNome_${id}" class="form-input" value="${c.nome}" style="margin-top:4px;" onchange="salvarCampoAuto('${id}')"></div>
                            <div><small style="color:#94a3b8;">MARCA</small><input id="editMarca_${id}" class="form-input" value="${c.marca}" style="margin-top:4px;" onchange="salvarCampoAuto('${id}')"></div>
                        </div>
                    </div>
                    <div style="background:var(--bg-tertiary,#152238);padding:20px;border-radius:14px;">
                        <h4 style="color:var(--gold);margin-bottom:15px;"><i class="fas fa-phone"></i> TELEFONES</h4>
                        <div style="display:grid;gap:12px;">
                            <div><small style="color:#94a3b8;">📱 PRINCIPAL</small><input type="tel" id="editTel1_${id}" class="form-input" value="${c.telefone1}" placeholder="(00) 00000-0000" style="margin-top:4px;" onchange="salvarCampoAuto('${id}')"></div>
                            <div><small style="color:#94a3b8;">📱 SECUNDÁRIO</small><input type="tel" id="editTel2_${id}" class="form-input" value="${c.telefone2}" placeholder="(00) 00000-0000" style="margin-top:4px;" onchange="salvarCampoAuto('${id}')"></div>
                        </div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:25px;">
                    <div style="background:var(--bg-tertiary,#152238);padding:20px;border-radius:14px;">
                        <h4 style="color:var(--gold);"><i class="fas fa-dollar-sign"></i> FINANCEIRO</h4>
                        <div style="display:grid;gap:12px;">
                            <div><small style="color:#94a3b8;">VALOR TOTAL</small><input type="number" id="editValor_${id}" class="form-input" value="${c.valor_total}" step="0.01" style="margin-top:4px;" onchange="recalcParcela('${id}');salvarCampoAuto('${id}')"></div>
                            <div><small style="color:#94a3b8;">PARCELAS</small><input type="number" id="editQtd_${id}" class="form-input" value="${c.qtd_parcelas}" min="1" style="margin-top:4px;" onchange="recalcParcela('${id}');salvarCampoAuto('${id}')"></div>
                            <div style="background:rgba(226,185,75,0.1);padding:12px;border-radius:10px;text-align:center;"><small style="color:#94a3b8;">VALOR PARCELA</small><strong style="color:var(--gold);font-size:1.2rem;" id="prevValor_${id}">${formatMoeda(c.valor_parcela || (c.valor_total / c.qtd_parcelas))}</strong></div>
                        </div>
                    </div>
                    <div style="background:var(--bg-tertiary,#152238);padding:20px;border-radius:14px;">
                        <h4 style="color:var(--gold);"><i class="fas fa-calendar"></i> VENCIMENTO</h4>
                        <div style="display:grid;gap:12px;">
                            <div><small style="color:#94a3b8;">DIA</small><select id="editDia_${id}" class="form-input" style="margin-top:4px;" onchange="salvarCampoAuto('${id}')"><option value="5" ${c.dia_vencimento==5?'selected':''}>DIA 5</option><option value="15" ${c.dia_vencimento==15?'selected':''}>DIA 15</option><option value="20" ${c.dia_vencimento==20?'selected':''}>DIA 20</option><option value="30" ${c.dia_vencimento==30?'selected':''}>DIA 30</option></select></div>
                            <div><small style="color:#94a3b8;">MÊS</small><input type="month" id="editMes_${id}" class="form-input" value="${c.mes_referencia||''}" style="margin-top:4px;" onchange="salvarCampoAuto('${id}')"></div>
                        </div>
                    </div>
                </div>
                <div style="background:var(--bg-tertiary,#152238);padding:20px;border-radius:14px;margin-bottom:20px;">
                    <h4 style="color:var(--gold);"><i class="fas fa-list"></i> PARCELAS (${parcelas.length})</h4>
                    <div style="max-height:300px;overflow-y:auto;">
                        ${parcelas.map(([key, p]) => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg-card);border-radius:10px;margin-bottom:8px;border:1px solid var(--border);">
                                <div style="display:flex;align-items:center;gap:15px;">
                                    <div style="width:40px;height:40px;border-radius:50%;background:rgba(226,185,75,0.1);display:flex;align-items:center;justify-content:center;color:var(--gold);font-weight:700;">${p.numero}</div>
                                    <div><strong style="color:#fff;">Parcela ${p.numero}ª</strong><small style="color:#94a3b8;display:block;">${formatData(p.vencimento)} • ${formatMoeda(p.valor)}</small></div>
                                </div>
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <select id="st_${id}_${key}" class="form-input" style="width:150px;padding:6px;font-size:0.8rem;" onchange="attParcelaAuto('${id}','${key}')">
                                        ${['pendente','pago','quitado','finalizando','inadimplente'].map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s.toUpperCase()}</option>`).join('')}
                                    </select>
                                    <span class="badge-status badge-${p.status}" style="font-size:0.65rem;">${p.status.toUpperCase()}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;">
                    <div style="background:rgba(16,185,129,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#10b981;">PAGO</small><strong style="color:#fff;font-size:1.1rem;">${formatMoeda(calcRecebido(c))}</strong></div>
                    <div style="background:rgba(239,68,68,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#ef4444;">ABERTO</small><strong style="color:#fff;font-size:1.1rem;">${formatMoeda(calcAberto(c))}</strong></div>
                    <div style="background:rgba(59,130,246,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#3b82f6;">PAGAS</small><strong style="color:#fff;font-size:1.1rem;">${contarPagas(c)}/${c.qtd_parcelas}</strong></div>
                    <div style="background:rgba(226,185,75,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#e2b94b;">STATUS</small><strong style="color:#fff;font-size:1.1rem;">${st.toUpperCase()}</strong></div>
                </div>
            </div>
            <div class="modal-footer">
                <small id="msgSalvo_${id}" style="color:#10b981;margin-right:auto;">✅ Dados salvos automaticamente</small>
                <button class="btn-cancel" onclick="document.getElementById('modalPerfilCliente').remove()">FECHAR</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

async function salvarCampoAuto(id) {
    const nome = document.getElementById(`editNome_${id}`)?.value;
    const marca = document.getElementById(`editMarca_${id}`)?.value;
    const tel1 = document.getElementById(`editTel1_${id}`)?.value;
    const tel2 = document.getElementById(`editTel2_${id}`)?.value;
    const dia = document.getElementById(`editDia_${id}`)?.value;
    const mes = document.getElementById(`editMes_${id}`)?.value;
    const valor = document.getElementById(`editValor_${id}`)?.value;
    const qtd = document.getElementById(`editQtd_${id}`)?.value;
    if (!nome && !marca && tel1 === undefined) return;
    const updates = {};
    const c = todosClientes[id];
    if (nome !== undefined && nome !== c?.nome) updates.nome = nome;
    if (marca !== undefined && marca !== c?.marca) updates.marca = marca;
    if (tel1 !== undefined && tel1 !== (c?.telefone1 || '')) updates.telefone1 = tel1;
    if (tel2 !== undefined && tel2 !== (c?.telefone2 || '')) updates.telefone2 = tel2;
    if (dia !== undefined && dia != c?.dia_vencimento) updates.dia_vencimento = parseInt(dia);
    if (mes !== undefined && mes !== c?.mes_referencia) updates.mes_referencia = mes;
    if (valor !== undefined) { const v = parseFloat(valor); const q = parseInt(qtd) || 1; if (v !== c?.valor_total) { updates.valor_total = v; updates.valor_parcela = v / q; } }
    if (qtd !== undefined) { const q = parseInt(qtd); const v = parseFloat(valor) || (c?.valor_total || 0); if (q !== c?.qtd_parcelas) { updates.qtd_parcelas = q; updates.valor_parcela = v / q; } }
    if (Object.keys(updates).length > 0) {
        updates.data_atualizacao = new Date().toISOString();
        try {
            await clientesRef.child(id).update(updates);
            const msg = document.getElementById(`msgSalvo_${id}`);
            if (msg) { msg.textContent = '✅ Salvo ' + new Date().toLocaleTimeString('pt-BR'); setTimeout(() => { msg.textContent = '✅ Dados salvos automaticamente'; }, 2000); }
        } catch (e) { console.error('Erro:', e); }
    }
}

async function attParcelaAuto(cid, key) {
    const s = document.getElementById(`st_${cid}_${key}`);
    if (!s) return;
    const ns = s.value;
    const dp = (ns === 'pago' || ns === 'quitado') ? new Date().toISOString() : null;
    await clientesRef.child(`${cid}/parcelas/${key}`).update({ status: ns, data_pagamento: dp });
    const b = s.parentElement.querySelector('.badge-status');
    if (b) { b.className = `badge-status badge-${ns}`; b.textContent = ns.toUpperCase(); }
}

function recalcParcela(id) {
    const v = parseFloat(document.getElementById(`editValor_${id}`)?.value) || 0;
    const q = parseInt(document.getElementById(`editQtd_${id}`)?.value) || 1;
    const p = document.getElementById(`prevValor_${id}`);
    if (p) p.textContent = formatMoeda(v / q);
}

// ============================================
// MODAL PARCELA
// ============================================
function abrirModalEditarParcela(cid, key) {
    const c = todosClientes[cid];
    if (!c || !c.parcelas || !c.parcelas[key]) return;
    const p = c.parcelas[key];
    document.getElementById('infoParcela').innerHTML = `<strong>${c.nome}</strong><br>Parcela ${p.numero} - ${formatMoeda(p.valor)}<br>Venc: ${formatData(p.vencimento)}`;
    document.getElementById('novoStatus').value = p.status;
    document.getElementById('parcelaClienteId').value = cid;
    document.getElementById('parcelaKey').value = key;
    document.getElementById('modalParcela').style.display = 'flex';
}
function fecharModalParcela() { document.getElementById('modalParcela').style.display = 'none'; }
async function atualizarStatusParcela() {
    const cid = document.getElementById('parcelaClienteId').value;
    const key = document.getElementById('parcelaKey').value;
    const st = document.getElementById('novoStatus').value;
    const dp = (st === 'pago' || st === 'quitado') ? new Date().toISOString() : null;
    await clientesRef.child(`${cid}/parcelas/${key}`).update({ status: st, data_pagamento: dp });
    fecharModalParcela();
}

// ============================================
// CRUD CLIENTES
// ============================================
function abrirModalCliente() {
    document.getElementById('editId').value = '';
    document.getElementById('modalTitulo').textContent = 'NOVO CLIENTE';
    ['nomeCliente','marcaCliente','valorTotal'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('qtdParcelas').value = '1';
    document.getElementById('previewParcela').textContent = 'R$ 0,00';
    document.getElementById('previewParcelas').textContent = '';
    document.getElementById('modalCliente').style.display = 'flex';
}
function fecharModalCliente() { document.getElementById('modalCliente').style.display = 'none'; }
function calcParcela() {
    const t = parseFloat(document.getElementById('valorTotal').value) || 0;
    const q = parseInt(document.getElementById('qtdParcelas').value) || 1;
    document.getElementById('previewParcela').textContent = formatMoeda(t / q);
    document.getElementById('previewParcelas').textContent = `${q} parcela(s)`;
}
async function salvarCliente() {
    const eid = document.getElementById('editId').value;
    const n = document.getElementById('nomeCliente').value.trim();
    const m = document.getElementById('marcaCliente').value.trim();
    const vt = parseFloat(document.getElementById('valorTotal').value);
    const qp = parseInt(document.getElementById('qtdParcelas').value);
    const dv = parseInt(document.getElementById('diaVencimento').value);
    const mr = document.getElementById('mesReferencia').value;
    if (!n || !m || !vt || !qp || !mr) { alert('Preencha todos os campos!'); return; }
    const vp = vt / qp;
    const parcelas = {};
    const [ano, mes] = mr.split('-').map(Number);
    for (let i = 1; i <= qp; i++) {
        let diaVenc = dv;
        if (dv === 30) { const ultimoDia = new Date(ano, mes - 1 + i, 0).getDate(); diaVenc = Math.min(30, ultimoDia); }
        const venc = new Date(ano, mes - 1 + (i - 1), diaVenc);
        parcelas[`p${i}`] = { numero: i, valor: vp, vencimento: venc.toISOString().split('T')[0], status: 'pendente', data_pagamento: null };
    }
    const dados = { nome: n, marca: m, telefone1: '', telefone2: '', valor_total: vt, qtd_parcelas: qp, valor_parcela: vp, dia_vencimento: dv, mes_referencia: mr, parcelas, data_atualizacao: new Date().toISOString(), criado_por: window.usuarioLogado ? window.usuarioLogado.usuario : 'admin' };
    if (eid) { await clientesRef.child(eid).update(dados); }
    else { dados.data_cadastro = new Date().toISOString(); await clientesRef.push(dados); }
    fecharModalCliente();
}
async function excluirCliente(id) { if (confirm('Excluir cliente?')) await clientesRef.child(id).remove(); }

// ============================================
// RELATÓRIOS
// ============================================
function carregarRelatorios() {
    const clientes = Object.values(todosClientes);
    let tr = 0, ta = 0, tp = 0, ina = 0;
    let d5c = 0, d5r = 0, d5a = 0, d15c = 0, d15r = 0, d15a = 0, d20c = 0, d20r = 0, d20a = 0, d30c = 0, d30r = 0, d30a = 0;
    clientes.forEach(c => {
        tr += calcRecebido(c); ta += calcAberto(c);
        if (c.dia_vencimento === 5) { d5c++; d5r += calcRecebido(c); d5a += calcAberto(c); }
        if (c.dia_vencimento === 15) { d15c++; d15r += calcRecebido(c); d15a += calcAberto(c); }
        if (c.dia_vencimento === 20) { d20c++; d20r += calcRecebido(c); d20a += calcAberto(c); }
        if (c.dia_vencimento === 30) { d30c++; d30r += calcRecebido(c); d30a += calcAberto(c); }
        if (c.parcelas) Object.values(c.parcelas).forEach(p => { tp++; if (p.status === 'inadimplente') ina++; });
    });
    document.getElementById('relClientes').textContent = clientes.length;
    document.getElementById('relRecebido').textContent = formatMoeda(tr);
    document.getElementById('relAberto').textContent = formatMoeda(ta);
    document.getElementById('relInadimplencia').textContent = tp > 0 ? ((ina / tp) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('relDia5Cli').textContent = d5c; document.getElementById('relDia5Rec').textContent = formatMoeda(d5r); document.getElementById('relDia5Ab').textContent = formatMoeda(d5a);
    document.getElementById('relDia15Cli').textContent = d15c; document.getElementById('relDia15Rec').textContent = formatMoeda(d15r); document.getElementById('relDia15Ab').textContent = formatMoeda(d15a);
    document.getElementById('relDia20Cli').textContent = d20c; document.getElementById('relDia20Rec').textContent = formatMoeda(d20r); document.getElementById('relDia20Ab').textContent = formatMoeda(d20a);
    document.getElementById('relDia30Cli').textContent = d30c; document.getElementById('relDia30Rec').textContent = formatMoeda(d30r); document.getElementById('relDia30Ab').textContent = formatMoeda(d30a);
    carregarRelatorioMensal();
}

function carregarRelatorioMensal() {
    relatorioAtual = 'mensal';
    const container = document.getElementById('relatorioDetalhado');
    if (!container) return;
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const nomeMes = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    let parcelasMes = [];
    Object.entries(todosClientes).forEach(([id, c]) => {
        if (!c.parcelas) return;
        Object.entries(c.parcelas).forEach(([key, p]) => {
            const dv = new Date(p.vencimento);
            if (dv.getMonth() === mesAtual && dv.getFullYear() === anoAtual) {
                parcelasMes.push({ clienteId: id, parcelaKey: key, clienteNome: c.nome, marca: c.marca, telefone: c.telefone1 || 'N/A', diaVencimento: c.dia_vencimento, ...p });
            }
        });
    });
    parcelasMes.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
    const tp = parcelasMes.length, tv = parcelasMes.reduce((t, p) => t + p.valor, 0);
    const tr = parcelasMes.filter(p => p.status === 'pago' || p.status === 'quitado').reduce((t, p) => t + p.valor, 0);
    const tpe = parcelasMes.filter(p => p.status !== 'pago' && p.status !== 'quitado').reduce((t, p) => t + p.valor, 0);
    container.innerHTML = `<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><div><h3 style="color:var(--gold);">📊 RELATÓRIO MENSAL - ${nomeMes.toUpperCase()}</h3><small style="color:#94a3b8;">Gerado em ${new Date().toLocaleString('pt-BR')}</small></div><div style="display:flex;gap:8px;"><button class="btn-sm" onclick="carregarRelatorioMensal()" style="background:rgba(226,185,75,0.2);color:#e2b94b;">MENSAL</button><button class="btn-sm" onclick="carregarRelatorioSemanal()">SEMANAL</button><button class="btn-sm" onclick="carregarRelatorioCompleto()">COMPLETO</button><button class="btn-primary" onclick="imprimirRelatorio()"><i class="fas fa-print"></i> IMPRIMIR</button></div></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:20px;"><div style="background:rgba(226,185,75,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#94a3b8;">TOTAL PARCELAS</small><strong style="color:#fff;display:block;font-size:1.3rem;">${tp}</strong></div><div style="background:rgba(16,185,129,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#10b981;">RECEBIDO</small><strong style="color:#fff;display:block;font-size:1.3rem;">${formatMoeda(tr)}</strong></div><div style="background:rgba(239,68,68,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#ef4444;">PENDENTE</small><strong style="color:#fff;display:block;font-size:1.3rem;">${formatMoeda(tpe)}</strong></div><div style="background:rgba(59,130,246,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#3b82f6;">TOTAL</small><strong style="color:#fff;display:block;font-size:1.3rem;">${formatMoeda(tv)}</strong></div></div><div class="table-modern"><table><thead><tr><th>Cliente</th><th>Marca</th><th>Telefone</th><th>Parcela</th><th>Valor</th><th>Vencimento</th><th>Dia</th><th>Status</th></tr></thead><tbody>${parcelasMes.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:30px;">Nenhuma parcela neste mês</td></tr>' : parcelasMes.map(p => `<tr><td><strong>${p.clienteNome}</strong></td><td>${p.marca}</td><td>${p.telefone}</td><td>${p.numero}ª</td><td>${formatMoeda(p.valor)}</td><td>${formatData(p.vencimento)}</td><td>Dia ${p.diaVencimento}</td><td><span class="badge-status badge-${p.status}">${p.status.toUpperCase()}</span></td></tr>`).join('')}</tbody></table></div></div>`;
}

function carregarRelatorioSemanal() {
    relatorioAtual = 'semanal';
    const container = document.getElementById('relatorioDetalhado');
    if (!container) return;
    const hoje = new Date();
    const ds = hoje.getDay();
    const seg = new Date(hoje); seg.setDate(hoje.getDate() - ds + (ds === 0 ? -6 : 1)); seg.setHours(0, 0, 0, 0);
    const dom = new Date(seg); dom.setDate(seg.getDate() + 6); dom.setHours(23, 59, 59, 999);
    let parcelasSemana = [];
    Object.entries(todosClientes).forEach(([id, c]) => {
        if (!c.parcelas) return;
        Object.entries(c.parcelas).forEach(([key, p]) => {
            const dv = new Date(p.vencimento);
            if (dv >= seg && dv <= dom) parcelasSemana.push({ clienteId: id, parcelaKey: key, clienteNome: c.nome, marca: c.marca, telefone: c.telefone1 || 'N/A', diaVencimento: c.dia_vencimento, ...p });
        });
    });
    parcelasSemana.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
    const tp = parcelasSemana.length, tv = parcelasSemana.reduce((t, p) => t + p.valor, 0);
    const tr = parcelasSemana.filter(p => p.status === 'pago' || p.status === 'quitado').reduce((t, p) => t + p.valor, 0);
    const tpe = parcelasSemana.filter(p => p.status !== 'pago' && p.status !== 'quitado').reduce((t, p) => t + p.valor, 0);
    container.innerHTML = `<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><div><h3 style="color:var(--gold);">📊 RELATÓRIO SEMANAL</h3><small style="color:#94a3b8;">${formatData(seg.toISOString())} até ${formatData(dom.toISOString())}</small></div><div style="display:flex;gap:8px;"><button class="btn-sm" onclick="carregarRelatorioMensal()">MENSAL</button><button class="btn-sm" onclick="carregarRelatorioSemanal()" style="background:rgba(226,185,75,0.2);color:#e2b94b;">SEMANAL</button><button class="btn-sm" onclick="carregarRelatorioCompleto()">COMPLETO</button><button class="btn-primary" onclick="imprimirRelatorio()"><i class="fas fa-print"></i> IMPRIMIR</button></div></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:20px;">${['TOTAL PARCELAS','RECEBIDO','PENDENTE','TOTAL'].map((l,i) => `<div style="background:rgba(${i===0?'226,185,75':i===1?'16,185,129':i===2?'239,68,68':'59,130,246'},0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#94a3b8;">${l}</small><strong style="color:#fff;display:block;font-size:1.3rem;">${i===0?tp:i===1?formatMoeda(tr):i===2?formatMoeda(tpe):formatMoeda(tv)}</strong></div>`).join('')}</div><div class="table-modern"><table><thead><tr><th>Cliente</th><th>Marca</th><th>Telefone</th><th>Parcela</th><th>Valor</th><th>Vencimento</th><th>Dia</th><th>Status</th></tr></thead><tbody>${parcelasSemana.length===0?'<tr><td colspan="8" style="text-align:center;padding:30px;">Nenhuma parcela nesta semana</td></tr>':parcelasSemana.map(p=>`<tr><td><strong>${p.clienteNome}</strong></td><td>${p.marca}</td><td>${p.telefone}</td><td>${p.numero}ª</td><td>${formatMoeda(p.valor)}</td><td>${formatData(p.vencimento)}</td><td>Dia ${p.diaVencimento}</td><td><span class="badge-status badge-${p.status}">${p.status.toUpperCase()}</span></td></tr>`).join('')}</tbody></table></div></div>`;
}

function carregarRelatorioCompleto() {
    relatorioAtual = 'completo';
    const container = document.getElementById('relatorioDetalhado');
    if (!container) return;
    let todasParcelas = [];
    Object.entries(todosClientes).forEach(([id, c]) => {
        if (!c.parcelas) return;
        Object.entries(c.parcelas).forEach(([key, p]) => todasParcelas.push({ clienteId: id, parcelaKey: key, clienteNome: c.nome, marca: c.marca, telefone: c.telefone1 || 'N/A', diaVencimento: c.dia_vencimento, ...p }));
    });
    todasParcelas.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
    const tp = todasParcelas.length, tv = todasParcelas.reduce((t, p) => t + p.valor, 0);
    const tr = todasParcelas.filter(p => p.status === 'pago' || p.status === 'quitado').reduce((t, p) => t + p.valor, 0);
    const tpe = todasParcelas.filter(p => p.status !== 'pago' && p.status !== 'quitado').reduce((t, p) => t + p.valor, 0);
    container.innerHTML = `<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><div><h3 style="color:var(--gold);">📊 RELATÓRIO COMPLETO</h3><small style="color:#94a3b8;">Todas as parcelas cadastradas</small></div><div style="display:flex;gap:8px;"><button class="btn-sm" onclick="carregarRelatorioMensal()">MENSAL</button><button class="btn-sm" onclick="carregarRelatorioSemanal()">SEMANAL</button><button class="btn-sm" onclick="carregarRelatorioCompleto()" style="background:rgba(226,185,75,0.2);color:#e2b94b;">COMPLETO</button><button class="btn-primary" onclick="imprimirRelatorio()"><i class="fas fa-print"></i> IMPRIMIR</button></div></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:20px;">${['TOTAL PARCELAS','RECEBIDO','PENDENTE','TOTAL'].map((l,i) => `<div style="background:rgba(${i===0?'226,185,75':i===1?'16,185,129':i===2?'239,68,68':'59,130,246'},0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#94a3b8;">${l}</small><strong style="color:#fff;display:block;font-size:1.3rem;">${i===0?tp:i===1?formatMoeda(tr):i===2?formatMoeda(tpe):formatMoeda(tv)}</strong></div>`).join('')}</div><div class="table-modern"><table><thead><tr><th>Cliente</th><th>Marca</th><th>Telefone</th><th>Parcela</th><th>Valor</th><th>Vencimento</th><th>Dia</th><th>Status</th></tr></thead><tbody>${todasParcelas.length===0?'<tr><td colspan="8" style="text-align:center;padding:30px;">Nenhuma parcela</td></tr>':todasParcelas.map(p=>`<tr><td><strong>${p.clienteNome}</strong></td><td>${p.marca}</td><td>${p.telefone}</td><td>${p.numero}ª</td><td>${formatMoeda(p.valor)}</td><td>${formatData(p.vencimento)}</td><td>Dia ${p.diaVencimento}</td><td><span class="badge-status badge-${p.status}">${p.status.toUpperCase()}</span></td></tr>`).join('')}</tbody></table></div></div>`;
}

function imprimirRelatorio() {
    const conteudo = document.getElementById('relatorioDetalhado').innerHTML;
    const dh = new Date().toLocaleString('pt-BR');
    const janela = window.open('', '_blank', 'width=1200,height=800');
    janela.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>KRONOS SYSTEM - Relatório</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Inter',sans-serif;background:#fff;color:#0f172a;padding:30px;-webkit-print-color-adjust:exact;}.print-header{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #c9a84c;}.print-header h1{color:#0f172a;font-size:1.8rem;letter-spacing:3px;}.print-header p{color:#64748b;font-size:0.9rem;}.print-header .logo{font-size:3rem;color:#c9a84c;}table{width:100%;border-collapse:collapse;margin-top:20px;}th{background:#0f172a;color:#c9a84c;padding:12px 15px;text-align:left;font-size:0.7rem;letter-spacing:1px;text-transform:uppercase;}td{padding:10px 15px;border-bottom:1px solid #e2e8f0;font-size:0.85rem;}tr:nth-child(even){background:#f8fafc;}.badge{display:inline-block;padding:4px 12px;border-radius:15px;font-size:0.65rem;font-weight:700;}.badge-pago{background:#d1fae5;color:#065f46;}.badge-quitado{background:#fef3c7;color:#92400e;}.badge-finalizando{background:#fef3c7;color:#92400e;}.badge-inadimplente{background:#fee2e2;color:#991b1b;}.badge-pendente{background:#dbeafe;color:#1e40af;}.print-footer{margin-top:30px;padding-top:15px;border-top:1px solid #e2e8f0;text-align:center;font-size:0.8rem;color:#64748b;}@media print{body{padding:0;}@page{margin:1cm;}}</style></head><body><div class="print-header"><div class="logo">👑</div><h1>KRONOS SYSTEM</h1><p>Relatório Gerencial • ${dh}</p></div>${conteudo}<div class="print-footer"><p>KRONOS SYSTEM - Gestão Financeira Executiva</p><p>Relatório gerado em ${dh}</p></div><div style="text-align:center;margin-top:30px;"><button onclick="window.print()" style="padding:12px 30px;background:#c9a84c;color:#0f172a;border:none;border-radius:8px;font-weight:700;font-size:1rem;cursor:pointer;">🖨️ IMPRIMIR RELATÓRIO</button></div></body></html>`);
    janela.document.close();
}

// ============================================
// USUÁRIOS
// ============================================
async function carregarUsuarios() {
    const snap = await usuariosRef.once('value');
    const usuarios = snap.val() || {};
    if (window.usuarioLogado) {
        document.getElementById('meuPerfil').innerHTML = `<h4>${window.usuarioLogado.nome}</h4><p>${window.usuarioLogado.cargo} • ${window.usuarioLogado.nivel.replace('_',' ').toUpperCase()}</p><small style="color:#94a3b8;">@${window.usuarioLogado.usuario}</small>`;
    }
    const container = document.getElementById('listaUsuarios');
    const lista = Object.entries(usuarios);
    if (lista.length === 0) { container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">Nenhum</p>'; return; }
    container.innerHTML = lista.map(([id, u]) => {
        const isMe = window.usuarioLogado && window.usuarioLogado.id === id;
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #1e293b;"><div style="display:flex;align-items:center;gap:12px;"><div style="width:40px;height:40px;border-radius:50%;background:rgba(226,185,75,0.15);display:flex;align-items:center;justify-content:center;color:#e2b94b;font-weight:700;">${u.nome.charAt(0)}</div><div><strong style="color:#fff;">${u.nome} ${isMe ? '(Você)' : ''}</strong><small style="color:#94a3b8;display:block;">@${u.usuario} • ${u.cargo}</small></div></div><div style="display:flex;gap:6px;"><button class="btn-sm edit" onclick="editarUsuario('${id}')"><i class="fas fa-edit"></i></button>${!isMe ? `<button class="btn-sm" onclick="toggleUsuario('${id}',${!u.ativo})"><i class="fas fa-power-off"></i></button><button class="btn-sm danger" onclick="excluirUsuario('${id}')"><i class="fas fa-trash"></i></button>` : ''}</div></div>`;
    }).join('');
}

function abrirModalUsuario() {
    document.getElementById('editUserId').value = '';
    document.getElementById('modalUsuarioTitulo').textContent = 'NOVO USUÁRIO';
    ['usuarioNome','usuarioCargo','usuarioLogin','usuarioSenha'].forEach(id => document.getElementById(id).value = '');
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

function editarMeuPerfil() { if (window.usuarioLogado) editarUsuario(window.usuarioLogado.id); }
function fecharModalUsuario() { document.getElementById('modalUsuario').style.display = 'none'; }

async function salvarUsuario() {
    const eid = document.getElementById('editUserId').value;
    const n = document.getElementById('usuarioNome').value.trim();
    const c = document.getElementById('usuarioCargo').value.trim();
    const l = document.getElementById('usuarioLogin').value.trim();
    const s = document.getElementById('usuarioSenha').value.trim();
    const niv = document.getElementById('usuarioNivel').value;
    const at = document.getElementById('usuarioAtivo').value === 'true';
    if (!n || !l || !s) { alert('Preencha os campos!'); return; }
    const d = { nome: n, cargo: c, usuario: l, senha: s, nivel: niv, ativo: at, data_atualizacao: new Date().toISOString() };
    if (eid) {
        await usuariosRef.child(eid).update(d);
        if (window.usuarioLogado && window.usuarioLogado.id === eid) {
            window.usuarioLogado.nome = n; window.usuarioLogado.cargo = c; window.usuarioLogado.usuario = l;
            localStorage.setItem('kronos_user', JSON.stringify(window.usuarioLogado));
            document.getElementById('sidebarUserName').textContent = n.split(' ')[0];
            document.getElementById('sidebarUserCargo').textContent = c;
        }
    } else {
        d.data_criacao = new Date().toISOString();
        await usuariosRef.push(d);
    }
    fecharModalUsuario(); carregarUsuarios(); alert('✅ Usuário salvo!');
}

async function toggleUsuario(id, at) { await usuariosRef.child(id).update({ ativo: at }); carregarUsuarios(); }

async function excluirUsuario(id) {
    if (!confirm('Excluir este usuário?')) return;
    const snap = await usuariosRef.child(id).once('value');
    if (snap.val()?.nivel === 'super_admin') { alert('❌ Não é possível excluir o Super Admin!'); return; }
    await usuariosRef.child(id).remove();
    carregarUsuarios();
}

document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.getElementById('loginScreen').style.display !== 'none') fazerLogin();
});

console.log('🚀 KRONOS SYSTEM v12.0 - PRONTO!');
console.log('👑 Super Admin: MattheCarvalho / Kronos@2024');
console.log('✅ Login para todos os perfis CORRIGIDO');
console.log('📅 Dias: 5, 15, 20, 30');
console.log('📊 Relatórios: Mensal, Semanal, Completo + Impressão');
