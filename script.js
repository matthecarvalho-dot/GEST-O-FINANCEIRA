// ============================================
// KRONOS SYSTEM - VERSÃO FINAL CORRIGIDA
// Login e Criar Conta funcionando 100%
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
const STATUS_LIST = ['pendente', 'pagante', 'pago', 'quitado', 'cancelado', 'inadimplente'];

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔥 KRONOS SYSTEM iniciando...');
    atualizarDataHora();
    setInterval(atualizarDataHora, 60000);
    await inicializarBanco();
    carregarMeses();
    inicializarMenu();
    adicionarOlhoSenha();
    carregarClientesTempoReal();
});

async function inicializarBanco() {
    try {
        const snapUsuarios = await usuariosRef.once('value');
        const usuarios = snapUsuarios.val() || {};
        
        let adminExiste = false;
        for (const key of Object.keys(usuarios)) {
            if (usuarios[key].usuario === 'admin') {
                adminExiste = true;
                break;
            }
        }
        
        if (!adminExiste) {
            await usuariosRef.push({
                nome: "Administrador",
                usuario: "admin",
                senha: "admin",
                cargo: "Administrador",
                nivel: "admin",
                ativo: true,
                data_criacao: new Date().toISOString()
            });
            console.log('✅ Admin criado: admin / admin');
        }

        const snapClientes = await clientesRef.once('value');
        const clientes = snapClientes.val() || {};
        
        if (Object.keys(clientes).length === 0) {
            await clientesRef.set({
                _ex1: {
                    nome: "EMPRESA EXEMPLO LTDA", marca: "MARCA GOLD",
                    telefone1: "(11) 99999-0001", telefone2: "",
                    valor_total: 12000, dia_vencimento: 5, mes_referencia: "2024-06",
                    qtd_parcelas: 12, valor_parcela: 1000,
                    data_cadastro: new Date().toISOString(),
                    parcelas: {
                        p1: { numero:1, valor:1000, vencimento:"2024-06-05", status:"pago", data_pagamento:"2024-06-03" },
                        p2: { numero:2, valor:1000, vencimento:"2024-07-05", status:"quitado", data_pagamento:"2024-07-01" },
                        p3: { numero:3, valor:1000, vencimento:"2024-08-05", status:"pagante", data_pagamento:null },
                        p4: { numero:4, valor:1000, vencimento:"2024-09-05", status:"inadimplente", data_pagamento:null }
                    }
                }
            });
            console.log('✅ Clientes exemplo criados');
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar banco:', error);
    }
}

// ============================================
// BOTÃO OLHO NA SENHA
// ============================================
function adicionarOlhoSenha() {
    const campos = ['loginPass', 'novaSenha', 'novaSenhaConf'];
    campos.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            const parent = input.parentElement;
            parent.style.position = 'relative';
            
            const oldIcon = parent.querySelector('.toggle-pass');
            if (oldIcon) oldIcon.remove();
            
            const icon = document.createElement('i');
            icon.className = 'fas fa-eye toggle-pass';
            icon.style.cssText = 'position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#6c757d;cursor:pointer;z-index:5;font-size:0.85rem;';
            icon.onclick = function() {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash toggle-pass';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye toggle-pass';
                }
            };
            parent.appendChild(icon);
        }
    });
}

// ============================================
// LOGIN
// ============================================
function mostrarCriarConta() {
    document.getElementById('formLogin').style.display = 'none';
    document.getElementById('formCriarConta').style.display = 'block';
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
        alert('Preencha todos os campos obrigatórios!');
        return;
    }
    if (senha !== senhaConf) {
        alert('As senhas não conferem!');
        return;
    }
    if (senha.length < 4) {
        alert('A senha deve ter pelo menos 4 caracteres!');
        return;
    }

    try {
        const snap = await usuariosRef.once('value');
        const usuarios = snap.val() || {};
        
        for (const key of Object.keys(usuarios)) {
            if (usuarios[key].usuario.toLowerCase() === usuario.toLowerCase()) {
                alert('Este nome de usuário já existe! Escolha outro.');
                return;
            }
        }

        await usuariosRef.push({
            nome: nome,
            cargo: cargo || 'Funcionário',
            usuario: usuario,
            senha: senha,
            nivel: 'funcionario',
            ativo: true,
            data_criacao: new Date().toISOString()
        });

        alert('Conta criada com sucesso!\n\nFaça login com:\nUsuário: ' + usuario);
        mostrarLogin();
        document.getElementById('loginUser').value = usuario;
        document.getElementById('loginPass').value = '';

    } catch (error) {
        console.error('Erro ao criar conta:', error);
        alert('Erro ao criar conta! Tente novamente.');
    }
}

async function fazerLogin() {
    const login = document.getElementById('loginUser').value.trim();
    const senha = document.getElementById('loginPass').value;

    if (!login || !senha) {
        alert('Digite usuário e senha!');
        return;
    }

    try {
        const snap = await usuariosRef.once('value');
        const usuarios = snap.val() || {};
        
        let userData = null;
        let userId = null;

        for (const key of Object.keys(usuarios)) {
            if (usuarios[key].usuario.toLowerCase() === login.toLowerCase()) {
                userData = usuarios[key];
                userId = key;
                break;
            }
        }

        if (!userData) {
            alert('Usuário não encontrado!\n\nTente: admin / admin');
            return;
        }

        if (userData.senha !== senha) {
            alert('Senha incorreta!');
            return;
        }

        if (userData.ativo === false) {
            alert('Usuário desativado!');
            return;
        }

        window.usuarioLogado = {
            id: userId,
            nome: userData.nome,
            usuario: userData.usuario,
            cargo: userData.cargo || 'Funcionário',
            nivel: userData.nivel || 'funcionario'
        };

        localStorage.setItem('kronos_user', JSON.stringify(window.usuarioLogado));
        
        try {
            await usuariosRef.child(userId).update({ ultimo_login: new Date().toISOString() });
        } catch(e) {}

        entrarSistema();

    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro ao fazer login! Verifique sua conexão.');
    }
}

function entrarSistema() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainSystem').style.display = 'flex';
    document.getElementById('sidebarUserName').textContent = window.usuarioLogado.nome.split(' ')[0];
    document.getElementById('sidebarUserCargo').textContent = window.usuarioLogado.cargo || 'Funcionário';
    
    const menuAdmin = document.querySelector('.menu-item[data-page="admin"]');
    if (menuAdmin) {
        menuAdmin.style.display = (window.usuarioLogado.nivel === 'admin' || window.usuarioLogado.nivel === 'super_admin') ? 'flex' : 'none';
    }
    
    showPage('dashboard');
}

function sair() {
    localStorage.removeItem('kronos_user');
    window.usuarioLogado = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainSystem').style.display = 'none';
}

// ============================================
// TEMPO REAL
// ============================================
function carregarClientesTempoReal() {
    clientesRef.on('value', (snap) => {
        todosClientes = snap.val() || {};
        const totalEl = document.getElementById('totalClientesTop');
        if (totalEl) totalEl.textContent = Object.keys(todosClientes).length + ' clientes';
        atualizarBadgesDias();
        atualizarPaginaAtiva();
    });
}

function atualizarBadgesDias() {
    const clientes = Object.values(todosClientes);
    [5, 15, 20, 30].forEach(dia => {
        const el = document.getElementById('badgeDia' + dia);
        if (el) el.textContent = clientes.filter(c => c.dia_vencimento == dia).length;
    });
}

function atualizarPaginaAtiva() {
    const paginas = {
        'page-dashboard': atualizarDashboard,
        'page-clientes': carregarTabelaClientes,
        'page-dia5': function() { carregarClientesDia(5); },
        'page-dia15': function() { carregarClientesDia(15); },
        'page-dia20': function() { carregarClientesDia(20); },
        'page-dia30': function() { carregarClientesDia(30); },
        'page-parcelas': carregarTodasParcelas,
        'page-relatorios': carregarRelatorios
    };
    for (const id in paginas) {
        const el = document.getElementById(id);
        if (el && el.classList.contains('active')) {
            paginas[id]();
            break;
        }
    }
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
    
    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');
    
    const menuEl = document.querySelector('.menu-item[data-page="' + page + '"]');
    if (menuEl) menuEl.classList.add('active');
    
    const titles = {
        dashboard: 'Dashboard', clientes: 'Clientes',
        dia5: 'Dia 5', dia15: 'Dia 15', dia20: 'Dia 20', dia30: 'Dia 30',
        parcelas: 'Parcelas', relatorios: 'Relatórios', admin: 'Usuários', backup: 'Backup'
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
    const s = document.getElementById('filtroMesCliente');
    if (!s) return;
    s.innerHTML = '<option value="">Todos os Meses</option>';
    const hoje = new Date();
    for (let i = -12; i <= 6; i++) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
        const val = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        s.innerHTML += '<option value="' + val + '">' + d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase() + '</option>';
    }
}

function atualizarDataHora() {
    const e = document.getElementById('currentDateTime');
    if (e) e.textContent = new Date().toLocaleDateString('pt-BR', {
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
    const canceladas = ps.filter(function(p) { return p.status === 'cancelado'; }).length;
    const pagas = ps.filter(function(p) { return p.status === 'pago' || p.status === 'quitado'; }).length;
    if (canceladas === ps.length) return 'cancelado';
    if (pagas === ps.length) return 'quitado';
    if (ps.some(function(p) { return p.status === 'inadimplente'; })) return 'inadimplente';
    if (ps.some(function(p) { return p.status === 'pago'; }) || ps.some(function(p) { return p.status === 'pagante'; })) return 'pagante';
    return 'pendente';
}

function calcAberto(c) {
    if (!c.parcelas) return c.valor_total || 0;
    return Object.values(c.parcelas)
        .filter(function(p) { return p.status !== 'pago' && p.status !== 'quitado' && p.status !== 'cancelado'; })
        .reduce(function(t, p) { return t + p.valor; }, 0);
}

function calcRecebido(c) {
    if (!c.parcelas) return 0;
    return Object.values(c.parcelas)
        .filter(function(p) { return p.status === 'pago' || p.status === 'quitado'; })
        .reduce(function(t, p) { return t + p.valor; }, 0);
}

function contarPagas(c) {
    if (!c.parcelas) return 0;
    return Object.values(c.parcelas).filter(function(p) { return p.status === 'pago' || p.status === 'quitado'; }).length;
}

function formatMoeda(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function formatData(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR');
}

// ============================================
// BACKUP
// ============================================
async function fazerBackup() {
    const snap = await sistemaRef.once('value');
    const json = JSON.stringify(snap.val(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kronos_backup_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    alert('Backup baixado!');
}

async function restaurarBackup() {
    const f = document.getElementById('arquivoBackup').files[0];
    if (!f) { alert('Selecione um arquivo!'); return; }
    if (!confirm('Substituir TODOS os dados?')) return;
    const r = new FileReader();
    r.onload = async function(e) {
        await sistemaRef.set(JSON.parse(e.target.result));
        alert('Restaurado!');
        location.reload();
    };
    r.readAsText(f);
}

// ============================================
// DASHBOARD
// ============================================
function atualizarDashboard() {
    const clientes = Object.values(todosClientes);
    let p = 0, q = 0, pg = 0, i = 0, tr = 0, ta = 0, tp = 0, inad = 0;
    
    clientes.forEach(function(c) {
        const st = getStatus(c);
        if (st === 'pago') p++;
        else if (st === 'quitado') q++;
        else if (st === 'pagante') pg++;
        else if (st === 'inadimplente') i++;
        tr += calcRecebido(c);
        ta += calcAberto(c);
        if (c.parcelas) {
            Object.values(c.parcelas).forEach(function(pr) {
                tp++;
                if (pr.status === 'inadimplente') inad++;
            });
        }
    });
    
    document.getElementById('kpiPago').textContent = p;
    document.getElementById('kpiQuitado').textContent = q;
    document.getElementById('kpiFinalizando').textContent = pg;
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
    const rec = new Array(12).fill(0);
    const ab = new Array(12).fill(0);
    
    clientes.forEach(function(c) {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach(function(p) {
            const m = new Date(p.vencimento).getMonth();
            if (p.status === 'pago' || p.status === 'quitado') rec[m] += p.valor;
            else if (p.status !== 'cancelado') ab[m] += p.valor;
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
            responsive: true,
            maintainAspectRatio: false,
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
    
    let pa = 0, qu = 0, pg = 0, ina = 0, pe = 0, can = 0;
    clientes.forEach(function(c) {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach(function(p) {
            if (p.status === 'pago') pa++;
            else if (p.status === 'quitado') qu++;
            else if (p.status === 'pagante') pg++;
            else if (p.status === 'inadimplente') ina++;
            else if (p.status === 'cancelado') can++;
            else pe++;
        });
    });
    
    charts.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pago','Quitado','Pagante','Inadimplente','Pendente','Cancelado'],
            datasets: [{
                data: [pa, qu, pg, ina, pe, can],
                backgroundColor: ['#10b981','#e2b94b','#3b82f6','#ef4444','#94a3b8','#6b7280']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
    clientes.forEach(function(c) {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach(function(p) {
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
                { label: 'Total', data: [d5t, d15t, d20t, d30t], backgroundColor: '#3b82f6', borderRadius: 5 },
                { label: 'Recebido', data: [d5r, d15r, d20r, d30r], backgroundColor: '#10b981', borderRadius: 5 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
    if (busca) {
        clientes = clientes.filter(function(entry) {
            const c = entry[1];
            return c.nome.toLowerCase().includes(busca) || c.marca.toLowerCase().includes(busca);
        });
    }
    if (mes) {
        clientes = clientes.filter(function(entry) {
            return entry[1].mes_referencia === mes;
        });
    }
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;">Nenhum cliente encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map(function(entry) {
        return renderLinha(entry[0], entry[1]);
    }).join('');
}

function carregarClientesDia(dia) {
    const tbody = document.getElementById('tabelaDia' + dia);
    const total = document.getElementById('totalDia' + dia);
    if (!tbody) return;
    
    const clientes = Object.entries(todosClientes).filter(function(entry) {
        return entry[1].dia_vencimento == dia;
    });
    
    if (total) total.textContent = clientes.length + ' clientes';
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;">Nenhum cliente dia ' + dia + '</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map(function(entry) {
        return renderLinha(entry[0], entry[1]);
    }).join('');
}

function renderLinha(id, c) {
    const st = getStatus(c);
    const tel1 = c.telefone1 ? '<br><small style="color:#94a3b8;">📱 ' + c.telefone1 + '</small>' : '';
    
    return '<tr>' +
        '<td><strong>' + c.nome + '</strong>' + tel1 + '</td>' +
        '<td>' + c.marca + '</td>' +
        '<td>Dia ' + c.dia_vencimento + ' - ' + (c.mes_referencia || '-') + '</td>' +
        '<td>' + formatMoeda(c.valor_total || 0) + '</td>' +
        '<td>' + contarPagas(c) + '/' + (c.qtd_parcelas || 0) + '</td>' +
        '<td>' + formatMoeda(calcAberto(c)) + '</td>' +
        '<td><span class="badge-status badge-' + st + '">' + st.toUpperCase() + '</span></td>' +
        '<td>' +
            '<button class="btn-sm edit" onclick="abrirPerfilCliente(\'' + id + '\')"><i class="fas fa-id-card"></i></button>' +
            '<button class="btn-sm danger" onclick="excluirCliente(\'' + id + '\')"><i class="fas fa-trash"></i></button>' +
        '</td>' +
    '</tr>';
}

function carregarTodasParcelas() {
    const tbody = document.getElementById('tabelaParcelas');
    if (!tbody) return;
    
    const fs = document.getElementById('filtroStatusParcela')?.value || '';
    const fd = document.getElementById('filtroDiaParcela')?.value || '';
    
    let parcelas = [];
    Object.entries(todosClientes).forEach(function(entry) {
        const id = entry[0];
        const c = entry[1];
        if (!c.parcelas) return;
        
        Object.entries(c.parcelas).forEach(function(parcelaEntry) {
            const key = parcelaEntry[0];
            const p = parcelaEntry[1];
            
            if (fs && p.status !== fs) return;
            if (fd && new Date(p.vencimento).getDate() != fd) return;
            
            parcelas.push({
                clienteId: id,
                parcelaKey: key,
                clienteNome: c.nome,
                numero: p.numero,
                valor: p.valor,
                vencimento: p.vencimento,
                status: p.status,
                data_pagamento: p.data_pagamento
            });
        });
    });
    
    parcelas.sort(function(a, b) {
        return new Date(a.vencimento) - new Date(b.vencimento);
    });
    
    if (parcelas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;">Nenhuma parcela encontrada</td></tr>';
        return;
    }
    
    tbody.innerHTML = parcelas.map(function(p) {
        return '<tr>' +
            '<td><strong>' + p.clienteNome + '</strong></td>' +
            '<td>' + p.numero + 'ª</td>' +
            '<td>' + formatMoeda(p.valor) + '</td>' +
            '<td>' + formatData(p.vencimento) + '</td>' +
            '<td><span class="badge-status badge-' + p.status + '">' + p.status.toUpperCase() + '</span></td>' +
            '<td>' + (p.data_pagamento ? formatData(p.data_pagamento) : 'Não pago') + '</td>' +
            '<td><button class="btn-sm edit" onclick="abrirModalEditarParcela(\'' + p.clienteId + '\',\'' + p.parcelaKey + '\')"><i class="fas fa-pen"></i></button></td>' +
        '</tr>';
    }).join('');
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
    const parcelas = Object.entries(c.parcelas || {}).sort(function(a, b) {
        return a[1].numero - b[1].numero;
    });
    
    let parcelasHTML = '';
    parcelas.forEach(function(entry) {
        const key = entry[0];
        const p = entry[1];
        
        let optionsHTML = '';
        STATUS_LIST.forEach(function(s) {
            optionsHTML += '<option value="' + s + '"' + (p.status === s ? ' selected' : '') + '>' + s.toUpperCase() + '</option>';
        });
        
        parcelasHTML += '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg-card);border-radius:10px;margin-bottom:8px;border:1px solid var(--border);">' +
            '<div style="display:flex;align-items:center;gap:15px;">' +
                '<div style="width:40px;height:40px;border-radius:50%;background:rgba(226,185,75,0.1);display:flex;align-items:center;justify-content:center;color:var(--gold);font-weight:700;">' + p.numero + '</div>' +
                '<div><strong style="color:#fff;">Parcela ' + p.numero + 'ª</strong><small style="color:#94a3b8;display:block;">' + formatData(p.vencimento) + ' • ' + formatMoeda(p.valor) + '</small></div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
                '<select id="st_' + id + '_' + key + '" class="form-input" style="width:150px;padding:6px;font-size:0.8rem;" onchange="atualizarStatusParcelaPerfil(\'' + id + '\',\'' + key + '\')">' + optionsHTML + '</select>' +
                '<span class="badge-status badge-' + p.status + '" style="font-size:0.65rem;" id="badge_' + id + '_' + key + '">' + p.status.toUpperCase() + '</span>' +
            '</div>' +
        '</div>';
    });
    
    modal.innerHTML = '<div class="modal-modern" style="width:950px;max-width:98%;max-height:90vh;">' +
        '<div class="modal-header" style="background:linear-gradient(135deg,rgba(226,185,75,0.1),transparent);">' +
            '<div><h2>' + c.nome + '</h2><small style="color:#94a3b8;">' + c.marca + ' • Dia ' + c.dia_vencimento + ' • ' + (c.mes_referencia || 'N/A') + '</small></div>' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
                '<span class="badge-status badge-' + st + '">' + st.toUpperCase() + '</span>' +
                '<button onclick="document.getElementById(\'modalPerfilCliente\').remove()" style="background:none;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;">&times;</button>' +
            '</div>' +
        '</div>' +
        '<div class="modal-body" style="padding:25px;">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:25px;">' +
                '<div style="background:var(--bg-tertiary);padding:20px;border-radius:14px;">' +
                    '<h4 style="color:var(--gold);margin-bottom:15px;">DADOS</h4>' +
                    '<div style="margin-bottom:12px;"><small style="color:#94a3b8;">NOME</small><input id="editNome_' + id + '" class="form-input" value="' + c.nome + '" style="margin-top:4px;" onchange="salvarCampoAuto(\'' + id + '\')"></div>' +
                    '<div><small style="color:#94a3b8;">MARCA</small><input id="editMarca_' + id + '" class="form-input" value="' + c.marca + '" style="margin-top:4px;" onchange="salvarCampoAuto(\'' + id + '\')"></div>' +
                '</div>' +
                '<div style="background:var(--bg-tertiary);padding:20px;border-radius:14px;">' +
                    '<h4 style="color:var(--gold);margin-bottom:15px;">TELEFONES</h4>' +
                    '<div style="margin-bottom:12px;"><small style="color:#94a3b8;">📱 PRINCIPAL</small><input type="tel" id="editTel1_' + id + '" class="form-input" value="' + c.telefone1 + '" placeholder="(00) 00000-0000" style="margin-top:4px;" onchange="salvarCampoAuto(\'' + id + '\')"></div>' +
                    '<div><small style="color:#94a3b8;">📱 SECUNDÁRIO</small><input type="tel" id="editTel2_' + id + '" class="form-input" value="' + c.telefone2 + '" placeholder="(00) 00000-0000" style="margin-top:4px;" onchange="salvarCampoAuto(\'' + id + '\')"></div>' +
                '</div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:25px;">' +
                '<div style="background:var(--bg-tertiary);padding:20px;border-radius:14px;">' +
                    '<h4 style="color:var(--gold);margin-bottom:15px;">FINANCEIRO</h4>' +
                    '<div style="margin-bottom:12px;"><small style="color:#94a3b8;">VALOR TOTAL</small><input type="number" id="editValor_' + id + '" class="form-input" value="' + c.valor_total + '" step="0.01" style="margin-top:4px;" onchange="recalcParcela(\'' + id + '\');salvarCampoAuto(\'' + id + '\')"></div>' +
                    '<div style="margin-bottom:12px;"><small style="color:#94a3b8;">PARCELAS</small><input type="number" id="editQtd_' + id + '" class="form-input" value="' + c.qtd_parcelas + '" min="1" style="margin-top:4px;" onchange="recalcParcela(\'' + id + '\');salvarCampoAuto(\'' + id + '\')"></div>' +
                    '<div style="background:rgba(226,185,75,0.1);padding:12px;border-radius:10px;text-align:center;"><small style="color:#94a3b8;">VALOR PARCELA</small><strong style="color:var(--gold);font-size:1.2rem;" id="prevValor_' + id + '">' + formatMoeda(c.valor_parcela || (c.valor_total / c.qtd_parcelas)) + '</strong></div>' +
                '</div>' +
                '<div style="background:var(--bg-tertiary);padding:20px;border-radius:14px;">' +
                    '<h4 style="color:var(--gold);margin-bottom:15px;">VENCIMENTO</h4>' +
                    '<div style="margin-bottom:12px;"><small style="color:#94a3b8;">DIA</small><select id="editDia_' + id + '" class="form-input" style="margin-top:4px;" onchange="salvarCampoAuto(\'' + id + '\')"><option value="5"' + (c.dia_vencimento == 5 ? ' selected' : '') + '>DIA 5</option><option value="15"' + (c.dia_vencimento == 15 ? ' selected' : '') + '>DIA 15</option><option value="20"' + (c.dia_vencimento == 20 ? ' selected' : '') + '>DIA 20</option><option value="30"' + (c.dia_vencimento == 30 ? ' selected' : '') + '>DIA 30</option></select></div>' +
                    '<div><small style="color:#94a3b8;">MÊS</small><input type="month" id="editMes_' + id + '" class="form-input" value="' + (c.mes_referencia || '') + '" style="margin-top:4px;" onchange="salvarCampoAuto(\'' + id + '\')"></div>' +
                '</div>' +
            '</div>' +
            '<div style="background:var(--bg-tertiary);padding:20px;border-radius:14px;margin-bottom:20px;">' +
                '<h4 style="color:var(--gold);margin-bottom:15px;">PARCELAS (' + parcelas.length + ')</h4>' +
                '<div style="max-height:300px;overflow-y:auto;">' + parcelasHTML + '</div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;">' +
                '<div style="background:rgba(16,185,129,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#10b981;">PAGO</small><strong style="color:#fff;font-size:1.1rem;">' + formatMoeda(calcRecebido(c)) + '</strong></div>' +
                '<div style="background:rgba(239,68,68,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#ef4444;">ABERTO</small><strong style="color:#fff;font-size:1.1rem;">' + formatMoeda(calcAberto(c)) + '</strong></div>' +
                '<div style="background:rgba(59,130,246,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#3b82f6;">PAGAS</small><strong style="color:#fff;font-size:1.1rem;">' + contarPagas(c) + '/' + c.qtd_parcelas + '</strong></div>' +
                '<div style="background:rgba(226,185,75,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#e2b94b;">STATUS</small><strong style="color:#fff;font-size:1.1rem;">' + st.toUpperCase() + '</strong></div>' +
            '</div>' +
        '</div>' +
        '<div class="modal-footer">' +
            '<small id="msgSalvo_' + id + '" style="color:#10b981;margin-right:auto;">✅ Dados salvos automaticamente</small>' +
            '<button class="btn-cancel" onclick="document.getElementById(\'modalPerfilCliente\').remove()">FECHAR</button>' +
        '</div>' +
    '</div>';
    
    document.body.appendChild(modal);
}

async function atualizarStatusParcelaPerfil(clienteId, parcelaKey) {
    const select = document.getElementById('st_' + clienteId + '_' + parcelaKey);
    if (!select) return;
    
    const novoStatus = select.value;
    const dataPagamento = (novoStatus === 'pago' || novoStatus === 'quitado') ? new Date().toISOString() : null;
    
    try {
        await clientesRef.child(clienteId + '/parcelas/' + parcelaKey).update({
            status: novoStatus,
            data_pagamento: dataPagamento
        });
        
        const badge = document.getElementById('badge_' + clienteId + '_' + parcelaKey);
        if (badge) {
            badge.className = 'badge-status badge-' + novoStatus;
            badge.textContent = novoStatus.toUpperCase();
        }
    } catch (error) {
        console.error('Erro ao atualizar:', error);
    }
}

async function salvarCampoAuto(id) {
    const nome = document.getElementById('editNome_' + id)?.value;
    const marca = document.getElementById('editMarca_' + id)?.value;
    const tel1 = document.getElementById('editTel1_' + id)?.value;
    const tel2 = document.getElementById('editTel2_' + id)?.value;
    const dia = document.getElementById('editDia_' + id)?.value;
    const mes = document.getElementById('editMes_' + id)?.value;
    const valor = document.getElementById('editValor_' + id)?.value;
    const qtd = document.getElementById('editQtd_' + id)?.value;
    
    if (nome === undefined && marca === undefined && tel1 === undefined) return;
    
    const updates = {};
    const c = todosClientes[id];
    
    if (nome !== undefined && nome !== c?.nome) updates.nome = nome;
    if (marca !== undefined && marca !== c?.marca) updates.marca = marca;
    if (tel1 !== undefined && tel1 !== (c?.telefone1 || '')) updates.telefone1 = tel1;
    if (tel2 !== undefined && tel2 !== (c?.telefone2 || '')) updates.telefone2 = tel2;
    if (dia !== undefined && dia != c?.dia_vencimento) updates.dia_vencimento = parseInt(dia);
    if (mes !== undefined && mes !== c?.mes_referencia) updates.mes_referencia = mes;
    
    if (valor !== undefined) {
        const v = parseFloat(valor);
        const q = parseInt(qtd) || 1;
        if (v !== c?.valor_total) {
            updates.valor_total = v;
            updates.valor_parcela = v / q;
        }
    }
    
    if (qtd !== undefined) {
        const q = parseInt(qtd);
        const v = parseFloat(valor) || (c?.valor_total || 0);
        if (q !== c?.qtd_parcelas) {
            updates.qtd_parcelas = q;
            updates.valor_parcela = v / q;
        }
    }
    
    if (Object.keys(updates).length > 0) {
        updates.data_atualizacao = new Date().toISOString();
        try {
            await clientesRef.child(id).update(updates);
            const msg = document.getElementById('msgSalvo_' + id);
            if (msg) {
                msg.textContent = '✅ Salvo ' + new Date().toLocaleTimeString('pt-BR');
                setTimeout(function() { msg.textContent = '✅ Dados salvos automaticamente'; }, 2000);
            }
        } catch (e) {}
    }
}

function recalcParcela(id) {
    const v = parseFloat(document.getElementById('editValor_' + id)?.value) || 0;
    const q = parseInt(document.getElementById('editQtd_' + id)?.value) || 1;
    const p = document.getElementById('prevValor_' + id);
    if (p) p.textContent = formatMoeda(v / q);
}

// ============================================
// MODAL PARCELA
// ============================================
function abrirModalEditarParcela(clienteId, parcelaKey) {
    const c = todosClientes[clienteId];
    if (!c || !c.parcelas || !c.parcelas[parcelaKey]) return;
    const p = c.parcelas[parcelaKey];
    document.getElementById('infoParcela').innerHTML = '<strong>' + c.nome + '</strong><br>Parcela ' + p.numero + ' - ' + formatMoeda(p.valor) + '<br>Venc: ' + formatData(p.vencimento);
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
    await clientesRef.child(cid + '/parcelas/' + key).update({ status: st, data_pagamento: dp });
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
    document.getElementById('previewParcela').textContent = 'R$ 0,00';
    document.getElementById('previewParcelas').textContent = '';
    document.getElementById('modalCliente').style.display = 'flex';
}

function fecharModalCliente() {
    document.getElementById('modalCliente').style.display = 'none';
}

function calcParcela() {
    const t = parseFloat(document.getElementById('valorTotal').value) || 0;
    const q = parseInt(document.getElementById('qtdParcelas').value) || 1;
    document.getElementById('previewParcela').textContent = formatMoeda(t / q);
    document.getElementById('previewParcelas').textContent = q + ' parcela(s)';
}

async function salvarCliente() {
    const eid = document.getElementById('editId').value;
    const n = document.getElementById('nomeCliente').value.trim();
    const m = document.getElementById('marcaCliente').value.trim();
    const vt = parseFloat(document.getElementById('valorTotal').value);
    const qp = parseInt(document.getElementById('qtdParcelas').value);
    const dv = parseInt(document.getElementById('diaVencimento').value);
    const mr = document.getElementById('mesReferencia').value;
    
    if (!n || !m || !vt || !qp || !mr) {
        alert('Preencha todos os campos!');
        return;
    }
    
    const vp = vt / qp;
    const parcelas = {};
    const partes = mr.split('-');
    const ano = parseInt(partes[0]);
    const mes = parseInt(partes[1]);
    
    for (let i = 1; i <= qp; i++) {
        let diaVenc = dv;
        if (dv === 30) {
            const ultimoDia = new Date(ano, mes - 1 + i, 0).getDate();
            diaVenc = Math.min(30, ultimoDia);
        }
        const venc = new Date(ano, mes - 1 + (i - 1), diaVenc);
        parcelas['p' + i] = {
            numero: i,
            valor: vp,
            vencimento: venc.toISOString().split('T')[0],
            status: 'pendente',
            data_pagamento: null
        };
    }
    
    const dados = {
        nome: n,
        marca: m,
        telefone1: '',
        telefone2: '',
        valor_total: vt,
        qtd_parcelas: qp,
        valor_parcela: vp,
        dia_vencimento: dv,
        mes_referencia: mr,
        parcelas: parcelas,
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
    let d5c = 0, d5r = 0, d5a = 0, d15c = 0, d15r = 0, d15a = 0;
    let d20c = 0, d20r = 0, d20a = 0, d30c = 0, d30r = 0, d30a = 0;
    
    clientes.forEach(function(c) {
        tr += calcRecebido(c);
        ta += calcAberto(c);
        
        if (c.dia_vencimento === 5) { d5c++; d5r += calcRecebido(c); d5a += calcAberto(c); }
        if (c.dia_vencimento === 15) { d15c++; d15r += calcRecebido(c); d15a += calcAberto(c); }
        if (c.dia_vencimento === 20) { d20c++; d20r += calcRecebido(c); d20a += calcAberto(c); }
        if (c.dia_vencimento === 30) { d30c++; d30r += calcRecebido(c); d30a += calcAberto(c); }
        
        if (c.parcelas) {
            Object.values(c.parcelas).forEach(function(p) {
                tp++;
                if (p.status === 'inadimplente') ina++;
            });
        }
    });
    
    document.getElementById('relClientes').textContent = clientes.length;
    document.getElementById('relRecebido').textContent = formatMoeda(tr);
    document.getElementById('relAberto').textContent = formatMoeda(ta);
    document.getElementById('relInadimplencia').textContent = tp > 0 ? ((ina / tp) * 100).toFixed(1) + '%' : '0%';
    
    document.getElementById('relDia5Cli').textContent = d5c;
    document.getElementById('relDia5Rec').textContent = formatMoeda(d5r);
    document.getElementById('relDia5Ab').textContent = formatMoeda(d5a);
    document.getElementById('relDia15Cli').textContent = d15c;
    document.getElementById('relDia15Rec').textContent = formatMoeda(d15r);
    document.getElementById('relDia15Ab').textContent = formatMoeda(d15a);
    document.getElementById('relDia20Cli').textContent = d20c;
    document.getElementById('relDia20Rec').textContent = formatMoeda(d20r);
    document.getElementById('relDia20Ab').textContent = formatMoeda(d20a);
    document.getElementById('relDia30Cli').textContent = d30c;
    document.getElementById('relDia30Rec').textContent = formatMoeda(d30r);
    document.getElementById('relDia30Ab').textContent = formatMoeda(d30a);
    
    carregarRelatorioMensal();
}

function carregarRelatorioMensal() {
    const container = document.getElementById('relatorioDetalhado');
    if (!container) return;
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const nomeMes = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    let parcelasMes = [];
    Object.entries(todosClientes).forEach(function(entry) {
        const c = entry[1];
        if (!c.parcelas) return;
        
        Object.entries(c.parcelas).forEach(function(pEntry) {
            const p = pEntry[1];
            const dv = new Date(p.vencimento);
            if (dv.getMonth() === mesAtual && dv.getFullYear() === anoAtual) {
                parcelasMes.push({
                    clienteNome: c.nome,
                    marca: c.marca,
                    telefone: c.telefone1 || 'N/A',
                    diaVencimento: c.dia_vencimento,
                    numero: p.numero,
                    valor: p.valor,
                    vencimento: p.vencimento,
                    status: p.status
                });
            }
        });
    });
    
    parcelasMes.sort(function(a, b) { return new Date(a.vencimento) - new Date(b.vencimento); });
    
    const tp = parcelasMes.length;
    const tv = parcelasMes.reduce(function(t, p) { return t + p.valor; }, 0);
    const tr = parcelasMes.filter(function(p) { return p.status === 'pago' || p.status === 'quitado'; }).reduce(function(t, p) { return t + p.valor; }, 0);
    const tpe = parcelasMes.filter(function(p) { return p.status !== 'pago' && p.status !== 'quitado' && p.status !== 'cancelado'; }).reduce(function(t, p) { return t + p.valor; }, 0);
    
    let html = '<div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">';
    html += '<div><h3 style="color:var(--gold);">📊 RELATÓRIO MENSAL - ' + nomeMes.toUpperCase() + '</h3><small style="color:#94a3b8;">Gerado em ' + new Date().toLocaleString('pt-BR') + '</small></div>';
    html += '<div style="display:flex;gap:8px;">';
    html += '<button class="btn-sm" onclick="carregarRelatorioMensal()" style="background:rgba(226,185,75,0.2);color:#e2b94b;">MENSAL</button>';
    html += '<button class="btn-sm" onclick="carregarRelatorioSemanal()">SEMANAL</button>';
    html += '<button class="btn-sm" onclick="carregarRelatorioCompleto()">COMPLETO</button>';
    html += '<button class="btn-primary" onclick="imprimirRelatorio()"><i class="fas fa-print"></i> IMPRIMIR</button>';
    html += '</div></div>';
    
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:20px;">';
    html += '<div style="background:rgba(226,185,75,0.1);padding:15px;border-radius:10px;text-align:center;"><small>TOTAL</small><strong style="color:#fff;display:block;font-size:1.3rem;">' + tp + '</strong></div>';
    html += '<div style="background:rgba(16,185,129,0.1);padding:15px;border-radius:10px;text-align:center;"><small>RECEBIDO</small><strong style="color:#fff;display:block;font-size:1.3rem;">' + formatMoeda(tr) + '</strong></div>';
    html += '<div style="background:rgba(239,68,68,0.1);padding:15px;border-radius:10px;text-align:center;"><small>PENDENTE</small><strong style="color:#fff;display:block;font-size:1.3rem;">' + formatMoeda(tpe) + '</strong></div>';
    html += '<div style="background:rgba(59,130,246,0.1);padding:15px;border-radius:10px;text-align:center;"><small>TOTAL VALOR</small><strong style="color:#fff;display:block;font-size:1.3rem;">' + formatMoeda(tv) + '</strong></div>';
    html += '</div>';
    
    html += '<div class="table-modern"><table><thead><tr><th>Cliente</th><th>Marca</th><th>Tel</th><th>Parc</th><th>Valor</th><th>Vencimento</th><th>Dia</th><th>Status</th></tr></thead><tbody>';
    
    if (parcelasMes.length === 0) {
        html += '<tr><td colspan="8" style="text-align:center;padding:30px;">Nenhuma parcela neste mês</td></tr>';
    } else {
        parcelasMes.forEach(function(p) {
            html += '<tr>';
            html += '<td><strong>' + p.clienteNome + '</strong></td>';
            html += '<td>' + p.marca + '</td>';
            html += '<td>' + p.telefone + '</td>';
            html += '<td>' + p.numero + 'ª</td>';
            html += '<td>' + formatMoeda(p.valor) + '</td>';
            html += '<td>' + formatData(p.vencimento) + '</td>';
            html += '<td>Dia ' + p.diaVencimento + '</td>';
            html += '<td><span class="badge-status badge-' + p.status + '">' + p.status.toUpperCase() + '</span></td>';
            html += '</tr>';
        });
    }
    
    html += '</tbody></table></div></div>';
    
    container.innerHTML = html;
}

function carregarRelatorioSemanal() {
    const container = document.getElementById('relatorioDetalhado');
    if (!container) return;
    
    const hoje = new Date();
    const ds = hoje.getDay();
    const seg = new Date(hoje);
    seg.setDate(hoje.getDate() - ds + (ds === 0 ? -6 : 1));
    seg.setHours(0, 0, 0, 0);
    const dom = new Date(seg);
    dom.setDate(seg.getDate() + 6);
    dom.setHours(23, 59, 59, 999);
    
    let parcelasSemana = [];
    Object.entries(todosClientes).forEach(function(entry) {
        const c = entry[1];
        if (!c.parcelas) return;
        Object.entries(c.parcelas).forEach(function(pEntry) {
            const p = pEntry[1];
            const dv = new Date(p.vencimento);
            if (dv >= seg && dv <= dom) {
                parcelasSemana.push({
                    clienteNome: c.nome, marca: c.marca,
                    telefone: c.telefone1 || 'N/A', diaVencimento: c.dia_vencimento,
                    numero: p.numero, valor: p.valor, vencimento: p.vencimento, status: p.status
                });
            }
        });
    });
    
    parcelasSemana.sort(function(a, b) { return new Date(a.vencimento) - new Date(b.vencimento); });
    
    const tp = parcelasSemana.length;
    const tv = parcelasSemana.reduce(function(t, p) { return t + p.valor; }, 0);
    const tr = parcelasSemana.filter(function(p) { return p.status === 'pago' || p.status === 'quitado'; }).reduce(function(t, p) { return t + p.valor; }, 0);
    const tpe = parcelasSemana.filter(function(p) { return p.status !== 'pago' && p.status !== 'quitado' && p.status !== 'cancelado'; }).reduce(function(t, p) { return t + p.valor; }, 0);
    
    let html = '<div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">';
    html += '<div><h3 style="color:var(--gold);">📊 RELATÓRIO SEMANAL</h3><small style="color:#94a3b8;">' + formatData(seg.toISOString()) + ' até ' + formatData(dom.toISOString()) + '</small></div>';
    html += '<div style="display:flex;gap:8px;">';
    html += '<button class="btn-sm" onclick="carregarRelatorioMensal()">MENSAL</button>';
    html += '<button class="btn-sm" onclick="carregarRelatorioSemanal()" style="background:rgba(226,185,75,0.2);color:#e2b94b;">SEMANAL</button>';
    html += '<button class="btn-sm" onclick="carregarRelatorioCompleto()">COMPLETO</button>';
    html += '<button class="btn-primary" onclick="imprimirRelatorio()"><i class="fas fa-print"></i> IMPRIMIR</button>';
    html += '</div></div>';
    
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:20px;">';
    html += '<div style="background:rgba(226,185,75,0.1);padding:15px;border-radius:10px;text-align:center;"><small>TOTAL</small><strong style="color:#fff;display:block;font-size:1.3rem;">' + tp + '</strong></div>';
    html += '<div style="background:rgba(16,185,129,0.1);padding:15px;border-radius:10px;text-align:center;"><small>RECEBIDO</small><strong style="color:#fff;display:block;font-size:1.3rem;">' + formatMoeda(tr) + '</strong></div>';
    html += '<div style="background:rgba(239,68,68,0.1);padding:15px;border-radius:10px;text-align:center;"><small>PENDENTE</small><strong style="color:#fff;display:block;font-size:1.3rem;">' + formatMoeda(tpe) + '</strong></div>';
    html += '<div style="background:rgba(59,130,246,0.1);padding:15px;border-radius:10px;text-align:center;"><small>TOTAL VALOR</small><strong style="color:#fff;display:block;font-size:1.3rem;">' + formatMoeda(tv) + '</strong></div>';
    html += '</div>';
    
    html += '<div class="table-modern"><table><thead><tr><th>Cliente</th><th>Marca</th><th>Tel</th><th>Parc</th><th>Valor</th><th>Vencimento</th><th>Dia</th><th>Status</th></tr></thead><tbody>';
    
    if (parcelasSemana.length === 0) {
        html += '<tr><td colspan="8" style="text-align:center;padding:30px;">Nenhuma parcela nesta semana</td></tr>';
    } else {
        parcelasSemana.forEach(function(p) {
            html += '<tr><td><strong>' + p.clienteNome + '</strong></td><td>' + p.marca + '</td><td>' + p.telefone + '</td><td>' + p.numero + 'ª</td><td>' + formatMoeda(p.valor) + '</td><td>' + formatData(p.vencimento) + '</td><td>Dia ' + p.diaVencimento + '</td><td><span class="badge-status badge-' + p.status + '">' + p.status.toUpperCase() + '</span></td></tr>';
        });
    }
    
    html += '</tbody></table></div></div>';
    container.innerHTML = html;
}

function carregarRelatorioCompleto() {
    const container = document.getElementById('relatorioDetalhado');
    if (!container) return;
    
    let todasParcelas = [];
    Object.entries(todosClientes).forEach(function(entry) {
        const c = entry[1];
        if (!c.parcelas) return;
        Object.entries(c.parcelas).forEach(function(pEntry) {
            const p = pEntry[1];
            todasParcelas.push({
                clienteNome: c.nome, marca: c.marca,
                telefone: c.telefone1 || 'N/A', diaVencimento: c.dia_vencimento,
                numero: p.numero, valor: p.valor, vencimento: p.vencimento, status: p.status
            });
        });
    });
    
    todasParcelas.sort(function(a, b) { return new Date(a.vencimento) - new Date(b.vencimento); });
    
    const tp = todasParcelas.length;
    const tv = todasParcelas.reduce(function(t, p) { return t + p.valor; }, 0);
    const tr = todasParcelas.filter(function(p) { return p.status === 'pago' || p.status === 'quitado'; }).reduce(function(t, p) { return t + p.valor; }, 0);
    const tpe = todasParcelas.filter(function(p) { return p.status !== 'pago' && p.status !== 'quitado' && p.status !== 'cancelado'; }).reduce(function(t, p) { return t + p.valor; }, 0);
    
    let html = '<div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">';
    html += '<div><h3 style="color:var(--gold);">📊 RELATÓRIO COMPLETO</h3><small style="color:#94a3b8;">Todas as parcelas</small></div>';
    html += '<div style="display:flex;gap:8px;">';
    html += '<button class="btn-sm" onclick="carregarRelatorioMensal()">MENSAL</button>';
    html += '<button class="btn-sm" onclick="carregarRelatorioSemanal()">SEMANAL</button>';
    html += '<button class="btn-sm" onclick="carregarRelatorioCompleto()" style="background:rgba(226,185,75,0.2);color:#e2b94b;">COMPLETO</button>';
    html += '<button class="btn-primary" onclick="imprimirRelatorio()"><i class="fas fa-print"></i> IMPRIMIR</button>';
    html += '</div></div>';
    
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:20px;">';
    html += '<div style="background:rgba(226,185,75,0.1);padding:15px;border-radius:10px;text-align:center;"><small>TOTAL</small><strong style="color:#fff;display:block;font-size:1.3rem;">' + tp + '</strong></div>';
    html += '<div style="background:rgba(16,185,129,0.1);padding:15px;border-radius:10px;text-align:center;"><small>RECEBIDO</small><strong style="color:#fff;display:block;font-size:1.3rem;">' + formatMoeda(tr) + '</strong></div>';
    html += '<div style="background:rgba(239,68,68,0.1);padding:15px;border-radius:10px;text-align:center;"><small>PENDENTE</small><strong style="color:#fff;display:block;font-size:1.3rem;">' + formatMoeda(tpe) + '</strong></div>';
    html += '<div style="background:rgba(59,130,246,0.1);padding:15px;border-radius:10px;text-align:center;"><small>TOTAL VALOR</small><strong style="color:#fff;display:block;font-size:1.3rem;">' + formatMoeda(tv) + '</strong></div>';
    html += '</div>';
    
    html += '<div class="table-modern"><table><thead><tr><th>Cliente</th><th>Marca</th><th>Tel</th><th>Parc</th><th>Valor</th><th>Vencimento</th><th>Dia</th><th>Status</th></tr></thead><tbody>';
    
    if (todasParcelas.length === 0) {
        html += '<tr><td colspan="8" style="text-align:center;padding:30px;">Nenhuma parcela</td></tr>';
    } else {
        todasParcelas.forEach(function(p) {
            html += '<tr><td><strong>' + p.clienteNome + '</strong></td><td>' + p.marca + '</td><td>' + p.telefone + '</td><td>' + p.numero + 'ª</td><td>' + formatMoeda(p.valor) + '</td><td>' + formatData(p.vencimento) + '</td><td>Dia ' + p.diaVencimento + '</td><td><span class="badge-status badge-' + p.status + '">' + p.status.toUpperCase() + '</span></td></tr>';
        });
    }
    
    html += '</tbody></table></div></div>';
    container.innerHTML = html;
}

function imprimirRelatorio() {
    const conteudo = document.getElementById('relatorioDetalhado').innerHTML;
    const dh = new Date().toLocaleString('pt-BR');
    const janela = window.open('', '_blank', 'width=1200,height=800');
    janela.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>KRONOS SYSTEM</title><style>body{font-family:sans-serif;background:#fff;color:#0f172a;padding:30px;}.header{text-align:center;border-bottom:3px solid #c9a84c;padding-bottom:20px;margin-bottom:30px;}.header h1{font-size:1.8rem;}table{width:100%;border-collapse:collapse;}th{background:#0f172a;color:#c9a84c;padding:12px;text-align:left;font-size:0.7rem;text-transform:uppercase;}td{padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:0.85rem;}@media print{body{padding:0;}@page{margin:1cm;}}</style></head><body><div class="header"><h1>KRONOS SYSTEM</h1><p>Relatório Gerencial • ' + dh + '</p></div>' + conteudo + '<div style="text-align:center;margin-top:30px;"><button onclick="window.print()" style="padding:12px 30px;background:#c9a84c;color:#0f172a;border:none;border-radius:8px;font-weight:700;font-size:1rem;cursor:pointer;">🖨️ IMPRIMIR</button></div></body></html>');
    janela.document.close();
}

// ============================================
// USUÁRIOS
// ============================================
async function carregarUsuarios() {
    const snap = await usuariosRef.once('value');
    const usuarios = snap.val() || {};
    
    if (window.usuarioLogado) {
        document.getElementById('meuPerfil').innerHTML = '<h4>' + window.usuarioLogado.nome + '</h4><p>' + window.usuarioLogado.cargo + ' • ' + window.usuarioLogado.nivel.toUpperCase() + '</p><small style="color:#94a3b8;">@' + window.usuarioLogado.usuario + '</small>';
    }
    
    const container = document.getElementById('listaUsuarios');
    const lista = Object.entries(usuarios);
    
    if (lista.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:20px;">Nenhum funcionário</p>';
        return;
    }
    
    container.innerHTML = lista.map(function(entry) {
        const id = entry[0];
        const u = entry[1];
        const isMe = window.usuarioLogado && window.usuarioLogado.id === id;
        
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #1e293b;">' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
                '<div style="width:40px;height:40px;border-radius:50%;background:rgba(226,185,75,0.15);display:flex;align-items:center;justify-content:center;color:#e2b94b;font-weight:700;">' + u.nome.charAt(0) + '</div>' +
                '<div><strong style="color:#fff;">' + u.nome + (isMe ? ' (Você)' : '') + '</strong><small style="color:#94a3b8;display:block;">@' + u.usuario + ' • ' + u.cargo + '</small></div>' +
            '</div>' +
            '<div style="display:flex;gap:6px;">' +
                '<button class="btn-sm edit" onclick="editarUsuario(\'' + id + '\')"><i class="fas fa-edit"></i></button>' +
                (isMe ? '' : '<button class="btn-sm" onclick="toggleUsuario(\'' + id + '\',' + !u.ativo + ')"><i class="fas fa-power-off"></i></button><button class="btn-sm danger" onclick="excluirUsuario(\'' + id + '\')"><i class="fas fa-trash"></i></button>') +
            '</div>' +
        '</div>';
    }).join('');
}

function abrirModalUsuario() {
    document.getElementById('editUserId').value = '';
    document.getElementById('usuarioNome').value = '';
    document.getElementById('usuarioCargo').value = '';
    document.getElementById('usuarioLogin').value = '';
    document.getElementById('usuarioSenha').value = '';
    document.getElementById('usuarioNivel').value = 'funcionario';
    document.getElementById('usuarioAtivo').value = 'true';
    document.getElementById('modalUsuario').style.display = 'flex';
}

function editarUsuario(id) {
    usuariosRef.child(id).once('value').then(function(snap) {
        const u = snap.val();
        if (!u) return;
        document.getElementById('editUserId').value = id;
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
    if (window.usuarioLogado) editarUsuario(window.usuarioLogado.id);
}

function fecharModalUsuario() {
    document.getElementById('modalUsuario').style.display = 'none';
}

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
            window.usuarioLogado.nome = n;
            window.usuarioLogado.cargo = c;
            window.usuarioLogado.usuario = l;
            localStorage.setItem('kronos_user', JSON.stringify(window.usuarioLogado));
            document.getElementById('sidebarUserName').textContent = n.split(' ')[0];
            document.getElementById('sidebarUserCargo').textContent = c;
        }
    } else {
        d.data_criacao = new Date().toISOString();
        await usuariosRef.push(d);
    }
    
    fecharModalUsuario();
    carregarUsuarios();
    alert('Usuário salvo!');
}

async function toggleUsuario(id, at) {
    await usuariosRef.child(id).update({ ativo: at });
    carregarUsuarios();
}

async function excluirUsuario(id) {
    if (!confirm('Excluir este usuário?')) return;
    await usuariosRef.child(id).remove();
    carregarUsuarios();
}

console.log('✅ KRONOS SYSTEM PRONTO!');
console.log('👤 Login: admin / admin');
