// ============================================
// KRONOS SYSTEM - Gestão Financeira
// Firebase Realtime Database + Segurança
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
const usuariosRef = db.ref('kronos_system/usuarios');
const logsRef = db.ref('kronos_system/logs');

// Variáveis globais
let todosClientes = {};
let graficos = {};
let usuarioAtual = null;
let sessaoTimeout = null;
const TEMPO_SESSAO = 30 * 60 * 1000; // 30 minutos

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    verificarSessao();
    verificarBanco();
});

// ============================================
// VERIFICAR BANCO DE DADOS
// ============================================
async function verificarBanco() {
    const snap = await db.ref('kronos_system').once('value');
    const dados = snap.val() || {};
    
    // Criar estrutura se não existir
    if (!dados.usuarios) {
        await usuariosRef.set({
            admin: {
                usuario: "admin",
                senha: "admin",
                nome: "Administrador",
                cargo: "Gerente Financeiro",
                nivel: "admin",
                ativo: true,
                data_criacao: new Date().toISOString()
            },
            financeiro: {
                usuario: "financeiro",
                senha: "financeiro",
                nome: "Financeiro",
                cargo: "Analista Financeiro",
                nivel: "usuario",
                ativo: true,
                data_criacao: new Date().toISOString()
            }
        });
    }
    
    if (!dados.configuracoes) {
        await db.ref('kronos_system/configuracoes').set({
            empresa: "KRONOS SYSTEM",
            versao: "3.0",
            tempo_sessao_minutos: 30
        });
    }
    
    if (!dados.clientes || Object.keys(dados.clientes).length === 0) {
        await db.ref('kronos_system/clientes').set({
            _exemplo: {
                nome: "CLIENTE EXEMPLO LTDA",
                marca: "MARCA PREMIUM",
                valor_total: 15000,
                dia_vencimento: 5,
                mes_referencia: "2024-01",
                qtd_parcelas: 12,
                valor_parcela: 1250,
                data_cadastro: new Date().toISOString(),
                criado_por: "admin",
                parcelas: {
                    p1: { numero:1, valor:1250, vencimento:"2024-01-05", status:"pago", data_pagamento:"2024-01-04" },
                    p2: { numero:2, valor:1250, vencimento:"2024-02-05", status:"pago", data_pagamento:"2024-02-03" },
                    p3: { numero:3, valor:1250, vencimento:"2024-03-05", status:"quitado", data_pagamento:"2024-03-01" },
                    p4: { numero:4, valor:1250, vencimento:"2024-04-05", status:"finalizando", data_pagamento:null },
                    p5: { numero:5, valor:1250, vencimento:"2024-05-05", status:"inadimplente", data_pagamento:null }
                }
            }
        });
    }
}

// ============================================
// GERENCIAMENTO DE SESSÃO
// ============================================
function verificarSessao() {
    const sessao = localStorage.getItem('kronos_session');
    
    if (sessao) {
        const dados = JSON.parse(sessao);
        const agora = new Date().getTime();
        
        // Verificar se sessão expirou
        if (dados.expira && agora < dados.expira) {
            usuarioAtual = dados.usuario;
            mostrarSistema();
            renovarSessao();
        } else {
            localStorage.removeItem('kronos_session');
            mostrarLogin();
        }
    } else {
        mostrarLogin();
    }
}

function mostrarLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainSystem').style.display = 'none';
}

function mostrarSistema() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainSystem').style.display = 'block';
    atualizarData();
    carregarMeses();
    carregarClientes();
    mostrarPagina('dashboard');
    atualizarInfoUsuario();
}

function renovarSessao() {
    // Limpar timeout anterior
    if (sessaoTimeout) clearTimeout(sessaoTimeout);
    
    // Renovar tempo
    const sessao = JSON.parse(localStorage.getItem('kronos_session'));
    sessao.expira = new Date().getTime() + TEMPO_SESSAO;
    sessao.ultima_atividade = new Date().toISOString();
    localStorage.setItem('kronos_session', JSON.stringify(sessao));
    
    // Configurar expiração automática
    sessaoTimeout = setTimeout(() => {
        alert('⚠️ Sessão expirada por inatividade! Faça login novamente.');
        logout();
    }, TEMPO_SESSAO);
}

// Atividade do usuário renova a sessão
document.addEventListener('click', renovarSessao);
document.addEventListener('keypress', renovarSessao);

// ============================================
// LOGIN
// ============================================
async function fazerLogin() {
    const usuario = document.getElementById('loginUser').value.trim();
    const senha = document.getElementById('loginPass').value.trim();
    
    if (!usuario || !senha) {
        alert('Preencha usuário e senha!');
        return;
    }
    
    try {
        // Buscar usuário no banco
        const snap = await usuariosRef.orderByChild('usuario').equalTo(usuario).once('value');
        const usuarios = snap.val();
        
        if (!usuarios) {
            alert('❌ Usuário não encontrado!');
            registrarLog(usuario, 'login_falha', 'Usuário não encontrado');
            return;
        }
        
        // Pegar dados do usuário
        const userId = Object.keys(usuarios)[0];
        const userData = usuarios[userId];
        
        // Verificar senha
        if (userData.senha !== senha) {
            alert('❌ Senha incorreta!');
            registrarLog(usuario, 'login_falha', 'Senha incorreta');
            return;
        }
        
        // Verificar se está ativo
        if (userData.ativo === false) {
            alert('❌ Usuário desativado! Contate o administrador.');
            registrarLog(usuario, 'login_bloqueado', 'Usuário desativado');
            return;
        }
        
        // LOGIN SUCESSO
        usuarioAtual = {
            id: userId,
            usuario: userData.usuario,
            nome: userData.nome,
            cargo: userData.cargo,
            nivel: userData.nivel
        };
        
        // Salvar sessão
        const sessao = {
            usuario: usuarioAtual,
            inicio: new Date().toISOString(),
            expira: new Date().getTime() + TEMPO_SESSAO,
            ultima_atividade: new Date().toISOString()
        };
        
        localStorage.setItem('kronos_session', JSON.stringify(sessao));
        
        // Registrar log
        await registrarLog(usuario, 'login_sucesso', 'Login realizado com sucesso');
        
        // Atualizar último login
        await db.ref(`kronos_system/usuarios/${userId}`).update({
            ultimo_login: new Date().toISOString()
        });
        
        // Mostrar sistema
        mostrarSistema();
        renovarSessao();
        
        console.log('✅ Login realizado:', usuarioAtual);
        
    } catch (error) {
        console.error('Erro no login:', error);
        alert('❌ Erro ao fazer login! Tente novamente.');
    }
}

// Login com Enter
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.getElementById('loginScreen').style.display !== 'none') {
        fazerLogin();
    }
});

// ============================================
// LOGOUT
// ============================================
async function sair() {
    if (usuarioAtual) {
        await registrarLog(usuarioAtual.usuario, 'logout', 'Logout realizado');
    }
    logout();
}

function logout() {
    localStorage.removeItem('kronos_session');
    usuarioAtual = null;
    if (sessaoTimeout) clearTimeout(sessaoTimeout);
    mostrarLogin();
    document.getElementById('loginUser').value = 'admin';
    document.getElementById('loginPass').value = 'admin';
}

// ============================================
// REGISTRO DE LOGS
// ============================================
async function registrarLog(usuario, acao, detalhes) {
    try {
        await logsRef.push({
            usuario: usuario,
            acao: acao,
            detalhes: detalhes,
            data: new Date().toISOString(),
            ip: 'Navegador'
        });
    } catch (error) {
        console.error('Erro ao registrar log:', error);
    }
}

// ============================================
// ATUALIZAR INFO DO USUÁRIO
// ============================================
function atualizarInfoUsuario() {
    if (!usuarioAtual) return;
    
    const navTabs = document.querySelector('.nav-tabs');
    
    // Remover aba de admin se já existir
    const existingAdmin = document.getElementById('tab-admin');
    if (existingAdmin) existingAdmin.remove();
    
    // Adicionar aba de admin apenas para administradores
    if (usuarioAtual.nivel === 'admin') {
        const adminTab = document.createElement('button');
        adminTab.className = 'tab-btn';
        adminTab.id = 'tab-admin';
        adminTab.setAttribute('onclick', "mostrarPagina('admin')");
        adminTab.innerHTML = '<i class="fas fa-shield-alt"></i> Administração';
        navTabs.appendChild(adminTab);
    }
    
    // Atualizar nome no header
    const headerActions = document.querySelector('.header-actions');
    const userInfo = document.createElement('span');
    userInfo.id = 'userInfo';
    userInfo.style.cssText = 'color: var(--gold); font-size: 0.85rem;';
    userInfo.innerHTML = `<i class="fas fa-user-circle"></i> ${usuarioAtual.nome} (${usuarioAtual.nivel.toUpperCase()})`;
    
    const existingUserInfo = document.getElementById('userInfo');
    if (existingUserInfo) existingUserInfo.remove();
    
    const dateSpan = document.getElementById('dataAtual');
    headerActions.insertBefore(userInfo, dateSpan);
}

// ============================================
// PÁGINA DE ADMINISTRAÇÃO
// ============================================
async function mostrarPaginaAdmin() {
    const container = document.getElementById('pagina-admin');
    
    if (!container) {
        // Criar página admin dinamicamente
        const pageContent = document.querySelector('.main-system');
        const adminPage = document.createElement('div');
        adminPage.className = 'page-content';
        adminPage.id = 'pagina-admin';
        adminPage.innerHTML = `
            <div class="cards-grid" style="padding:25px;">
                <div class="relatorio-card">
                    <h3><i class="fas fa-users"></i> USUÁRIOS CADASTRADOS</h3>
                    <div id="listaUsuarios" style="margin-top:15px;"></div>
                    <button class="btn-add" onclick="abrirModalUsuario()" style="margin-top:15px;">
                        <i class="fas fa-plus"></i> NOVO USUÁRIO
                    </button>
                </div>
                <div class="relatorio-card" style="grid-column: span 2;">
                    <h3><i class="fas fa-history"></i> LOGS DE ACESSO</h3>
                    <div id="listaLogs" style="max-height:400px;overflow-y:auto;margin-top:15px;"></div>
                </div>
            </div>
        `;
        pageContent.appendChild(adminPage);
    }
    
    await carregarUsuarios();
    await carregarLogs();
}

async function carregarUsuarios() {
    const snap = await usuariosRef.once('value');
    const usuarios = snap.val() || {};
    
    const container = document.getElementById('listaUsuarios');
    container.innerHTML = Object.entries(usuarios).map(([id, u]) => `
        <div style="background:var(--bg3);padding:15px;border-radius:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <strong style="color:var(--white);">${u.nome}</strong><br>
                <small style="color:var(--gray);">Usuário: ${u.usuario} | Nível: ${u.nivel.toUpperCase()}</small><br>
                <small style="color:var(--gray);">Último login: ${u.ultimo_login ? new Date(u.ultimo_login).toLocaleString('pt-BR') : 'Nunca'}</small>
            </div>
            <div>
                <span class="badge ${u.ativo ? 'badge-pago' : 'badge-inadimplente'}" style="margin-right:10px;">
                    ${u.ativo ? 'ATIVO' : 'INATIVO'}
                </span>
                <button class="btn-sm" onclick="toggleUsuario('${id}', ${!u.ativo})">
                    <i class="fas fa-power-off"></i>
                </button>
                <button class="btn-sm danger" onclick="excluirUsuario('${id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function carregarLogs() {
    const snap = await logsRef.orderByChild('data').limitToLast(50).once('value');
    const logs = snap.val() || {};
    
    const container = document.getElementById('listaLogs');
    container.innerHTML = Object.entries(logs)
        .reverse()
        .map(([id, log]) => `
            <div style="padding:10px;border-bottom:1px solid var(--border);">
                <strong style="color:${log.acao.includes('sucesso') ? 'var(--green)' : 'var(--red)'};">
                    ${log.acao.toUpperCase()}
                </strong>
                <span style="color:var(--gray);margin-left:10px;">${log.detalhes}</span>
                <br>
                <small style="color:var(--gray);">
                    <i class="fas fa-user"></i> ${log.usuario} | 
                    <i class="fas fa-clock"></i> ${new Date(log.data).toLocaleString('pt-BR')}
                </small>
            </div>
        `).join('');
}

async function toggleUsuario(id, ativo) {
    await db.ref(`kronos_system/usuarios/${id}`).update({ ativo });
    await registrarLog(usuarioAtual.usuario, 'usuario_toggle', `Usuário ${ativo ? 'ativado' : 'desativado'}`);
    carregarUsuarios();
}

async function excluirUsuario(id) {
    if (!confirm('Excluir este usuário?')) return;
    await db.ref(`kronos_system/usuarios/${id}`).remove();
    await registrarLog(usuarioAtual.usuario, 'usuario_excluido', 'Usuário excluído');
    carregarUsuarios();
}

function abrirModalUsuario() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <h2>NOVO USUÁRIO</h2>
                <button onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <label>NOME COMPLETO</label>
                <input type="text" id="novoNome" class="input-full" placeholder="Nome do usuário">
                <label>USUÁRIO (LOGIN)</label>
                <input type="text" id="novoUsuario" class="input-full" placeholder="Nome de login">
                <label>SENHA</label>
                <input type="password" id="novaSenha" class="input-full" placeholder="Senha">
                <div class="input-row">
                    <div>
                        <label>CARGO</label>
                        <input type="text" id="novoCargo" class="input-full" placeholder="Cargo">
                    </div>
                    <div>
                        <label>NÍVEL</label>
                        <select id="novoNivel" class="input-full">
                            <option value="usuario">USUÁRIO</option>
                            <option value="admin">ADMINISTRADOR</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancelar" onclick="this.closest('.modal-overlay').remove()">CANCELAR</button>
                <button class="btn-salvar" onclick="salvarNovoUsuario()">SALVAR</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function salvarNovoUsuario() {
    const nome = document.getElementById('novoNome').value.trim();
    const usuario = document.getElementById('novoUsuario').value.trim();
    const senha = document.getElementById('novaSenha').value.trim();
    const cargo = document.getElementById('novoCargo').value.trim();
    const nivel = document.getElementById('novoNivel').value;
    
    if (!nome || !usuario || !senha) {
        alert('Preencha os campos obrigatórios!');
        return;
    }
    
    await usuariosRef.push({
        usuario, senha, nome, cargo, nivel,
        ativo: true,
        data_criacao: new Date().toISOString()
    });
    
    await registrarLog(usuarioAtual.usuario, 'usuario_criado', `Usuário ${usuario} criado`);
    
    document.querySelector('.modal-overlay').remove();
    carregarUsuarios();
    alert('✅ Usuário cadastrado com sucesso!');
}

// ============================================
// INICIALIZAÇÃO DO SISTEMA
// ============================================
function atualizarData() {
    document.getElementById('dataAtual').textContent = 
        new Date().toLocaleDateString('pt-BR', { 
            weekday:'long', day:'numeric', month:'long', year:'numeric' 
        });
}

function carregarClientes() {
    clientesRef.on('value', (snap) => {
        todosClientes = snap.val() || {};
        atualizarDashboard();
    });
}

function carregarMeses() {
    const sel = document.getElementById('filtroMes');
    if (!sel) return;
    sel.innerHTML = '<option value="">Todos os Meses</option>';
    const agora = new Date();
    for (let i = -6; i <= 6; i++) {
        const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        sel.innerHTML += `<option value="${val}">${d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).toUpperCase()}</option>`;
    }
}

// ============================================
// NAVEGAÇÃO
// ============================================
function mostrarPagina(pagina) {
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    
    let targetPage = document.getElementById(`pagina-${pagina}`);
    
    if (!targetPage && pagina === 'admin') {
        mostrarPaginaAdmin();
        targetPage = document.getElementById('pagina-admin');
    }
    
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const activeTab = document.querySelector(`.tab-btn[onclick*="${pagina}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    if (pagina === 'clientes') carregarTabela();
    if (pagina === 'relatorios') carregarRelatorios();
}

// ============================================
// FUNÇÕES DO DASHBOARD
// ============================================
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
    return Object.values(c.parcelas)
        .filter(p => p.status !== 'pago' && p.status !== 'quitado')
        .reduce((t, p) => t + p.valor, 0);
}

function calcRec(c) {
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
    const canvas = document.getElementById('graficoMensal');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (graficos.mensal) graficos.mensal.destroy();
    
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
    
    graficos.mensal = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                { label:'Recebido', data:rec, backgroundColor:'#27ae60', borderRadius:5 },
                { label:'Em Aberto', data:ab, backgroundColor:'#e74c3c', borderRadius:5 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color:'#8899aa' } } },
            scales: {
                y: { grid: { color:'rgba(255,255,255,0.05)' }, ticks: { color:'#8899aa' } },
                x: { grid: { display:false }, ticks: { color:'#8899aa' } }
            }
        }
    });
}

function criarGraficoStatus(clientes) {
    const canvas = document.getElementById('graficoStatus');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (graficos.status) graficos.status.destroy();
    
    let pa=0, q=0, f=0, i=0, pe=0;
    clientes.forEach(c => {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach(p => {
            if (p.status==='pago') pa++;
            else if(p.status==='quitado') q++;
            else if(p.status==='finalizando') f++;
            else if(p.status==='inadimplente') i++;
            else pe++;
        });
    });
    
    graficos.status = new Chart(ctx, {
        type:'doughnut',
        data:{
            labels:['PAGO','QUITADO','FINALIZANDO','INADIMPLENTE','PENDENTE'],
            datasets:[{ 
                data:[pa,q,f,i,pe], 
                backgroundColor:['#27ae60','#c9a84c','#f39c12','#e74c3c','#3498db'] 
            }]
        },
        options:{
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ position:'bottom', labels:{ color:'#8899aa', padding:15 } } }
        }
    });
}

function criarGraficoDias(clientes) {
    const canvas = document.getElementById('graficoDias');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (graficos.dias) graficos.dias.destroy();
    
    let d5t=0, d5p=0, d20t=0, d20p=0;
    clientes.forEach(c => {
        if (!c.parcelas) return;
        Object.values(c.parcelas).forEach(p => {
            const dia = new Date(p.vencimento).getDate();
            if(dia===5){ d5t+=p.valor; if(p.status==='pago'||p.status==='quitado') d5p+=p.valor; }
            else if(dia===20){ d20t+=p.valor; if(p.status==='pago'||p.status==='quitado') d20p+=p.valor; }
        });
    });
    
    graficos.dias = new Chart(ctx, {
        type:'bar',
        data:{
            labels:['DIA 5','DIA 20'],
            datasets:[
                { label:'Total', data:[d5t,d20t], backgroundColor:'#3498db', borderRadius:5 },
                { label:'Recebido', data:[d5p,d20p], backgroundColor:'#27ae60', borderRadius:5 }
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
// CLIENTES
// ============================================
function carregarTabela() {
    const tbody = document.getElementById('corpoTabela');
    if (!tbody) return;
    
    const mes = document.getElementById('filtroMes')?.value || '';
    const dia = document.getElementById('filtroDia')?.value || '';
    const status = document.getElementById('filtroStatus')?.value || '';
    
    let clientes = Object.entries(todosClientes);
    if(mes) clientes = clientes.filter(([_,c]) => c.mes_referencia === mes);
    if(dia) clientes = clientes.filter(([_,c]) => c.dia_vencimento == dia);
    if(status) clientes = clientes.filter(([_,c]) => getStatus(c) === status);
    
    if(clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;">Nenhum cliente encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map(([id, c]) => {
        const st = getStatus(c);
        return `<tr>
            <td><strong>${c.nome}</strong></td>
            <td>${c.marca}</td>
            <td>Dia ${c.dia_vencimento} - ${c.mes_referencia}</td>
            <td>R$ ${(c.valor_total||0).toFixed(2)}</td>
            <td>R$ ${calcAberto(c).toFixed(2)}</td>
            <td>${contarPagas(c)}/${c.qtd_parcelas||0}</td>
            <td><span class="badge badge-${st}">${st.toUpperCase()}</span></td>
            <td>
                <button class="btn-sm" onclick="abrirParcelas('${id}')" title="Gerenciar Parcelas">
                    <i class="fas fa-cog"></i>
                </button>
                <button class="btn-sm danger" onclick="excluirCliente('${id}')" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function abrirModalCliente() {
    document.getElementById('editId').value = '';
    document.getElementById('modalTitulo').textContent = 'NOVO CLIENTE';
    ['nome','marca','valorTotal'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('qtdParcelas').value = '1';
    document.getElementById('previewParcela').textContent = '0,00';
    document.getElementById('modalCliente').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modalCliente').style.display = 'none';
}

function calcParcela() {
    const t = parseFloat(document.getElementById('valorTotal').value) || 0;
    const q = parseInt(document.getElementById('qtdParcelas').value) || 1;
    document.getElementById('previewParcela').textContent = (t/q).toFixed(2);
}

async function salvarCliente() {
    const nome = document.getElementById('nome').value.trim();
    const marca = document.getElementById('marca').value.trim();
    const valorTotal = parseFloat(document.getElementById('valorTotal').value);
    const diaVencimento = parseInt(document.getElementById('diaVencimento').value);
    const mesReferencia = document.getElementById('mesReferencia').value;
    const qtdParcelas = parseInt(document.getElementById('qtdParcelas').value);
    const editId = document.getElementById('editId').value;
    
    if(!nome||!marca||!valorTotal||!mesReferencia){
        alert('Preencha todos os campos!');
        return;
    }
    
    const valorParcela = valorTotal/qtdParcelas;
    const parcelas = {};
    const [ano, mes] = mesReferencia.split('-').map(Number);
    
    for(let i=1; i<=qtdParcelas; i++) {
        const venc = new Date(ano, mes-1+(i-1), diaVencimento);
        parcelas[`p${i}`] = {
            numero:i,
            valor:valorParcela,
            vencimento:venc.toISOString().split('T')[0],
            status:'pendente',
            data_pagamento:null
        };
    }
    
    const dados = {
        nome, marca,
        valor_total:valorTotal,
        dia_vencimento:diaVencimento,
        mes_referencia:mesReferencia,
        qtd_parcelas:qtdParcelas,
        valor_parcela:valorParcela,
        parcelas,
        criado_por: usuarioAtual ? usuarioAtual.usuario : 'admin',
        data_atualizacao: new Date().toISOString()
    };
    
    if(editId) {
        await clientesRef.child(editId).update(dados);
        await registrarLog(usuarioAtual.usuario, 'cliente_editado', `Cliente ${nome} editado`);
    } else {
        dados.data_cadastro = new Date().toISOString();
        await clientesRef.push(dados);
        await registrarLog(usuarioAtual.usuario, 'cliente_criado', `Cliente ${nome} criado`);
    }
    
    fecharModal();
}

async function excluirCliente(id) {
    if(!confirm('Excluir este cliente?')) return;
    const c = todosClientes[id];
    await clientesRef.child(id).remove();
    if (c) await registrarLog(usuarioAtual.usuario, 'cliente_excluido', `Cliente ${c.nome} excluído`);
}

function abrirParcelas(id) {
    const c = todosClientes[id];
    if(!c) return;
    
    document.getElementById('parcelasContainer').innerHTML = 
        Object.entries(c.parcelas||{})
            .sort((a,b)=>a[1].numero-b[1].numero)
            .map(([key,p]) => `
                <div style="background:var(--bg3);padding:15px;border-radius:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <strong style="color:var(--white);">Parcela ${p.numero}</strong><br>
                        <small style="color:var(--gray);">Vencimento: ${new Date(p.vencimento).toLocaleDateString('pt-BR')}</small><br>
                        <small style="color:var(--gray);">Valor: R$ ${p.valor.toFixed(2)}</small>
                    </div>
                    <div>
                        <select id="st_${id}_${key}" class="input-full" style="width:160px;margin-bottom:5px;">
                            ${['pendente','pago','quitado','finalizando','inadimplente'].map(s => 
                                `<option value="${s}" ${p.status===s?'selected':''}>${s.toUpperCase()}</option>`
                            ).join('')}
                        </select>
                        <button class="btn-sm" onclick="atualizarParcela('${id}','${key}')" style="width:100%;">
                            <i class="fas fa-check"></i> ATUALIZAR
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
    const dp = (status==='pago'||status==='quitado') ? new Date().toISOString() : null;
    
    await clientesRef.child(`${id}/parcelas/${key}`).update({ 
        status, 
        data_pagamento: dp 
    });
    
    await registrarLog(usuarioAtual.usuario, 'parcela_atualizada', `Parcela ${key} do cliente atualizada para ${status}`);
    
    abrirParcelas(id);
}

// ============================================
// RELATÓRIOS
// ============================================
function carregarRelatorios() {
    const clientes = Object.values(todosClientes);
    let tr=0, ta=0, tp=0, inad=0, d5c=0, d5r=0, d20c=0, d20r=0;
    
    clientes.forEach(c => {
        tr += calcRec(c);
        ta += calcAberto(c);
        if(c.dia_vencimento===5){ d5c++; d5r+=calcRec(c); }
        if(c.dia_vencimento===20){ d20c++; d20r+=calcRec(c); }
        if(c.parcelas) Object.values(c.parcelas).forEach(p => { 
            tp++; 
            if(p.status==='inadimplente') inad++; 
        });
    });
    
    const relClientes = document.getElementById('relClientes');
    const relRecebido = document.getElementById('relRecebido');
    const relAberto = document.getElementById('relAberto');
    const relInadimplencia = document.getElementById('relInadimplencia');
    const relDia5Clientes = document.getElementById('relDia5Clientes');
    const relDia5Recebido = document.getElementById('relDia5Recebido');
    const relDia20Clientes = document.getElementById('relDia20Clientes');
    const relDia20Recebido = document.getElementById('relDia20Recebido');
    
    if (relClientes) relClientes.textContent = clientes.length;
    if (relRecebido) relRecebido.textContent = `R$ ${tr.toFixed(2)}`;
    if (relAberto) relAberto.textContent = `R$ ${ta.toFixed(2)}`;
    if (relInadimplencia) relInadimplencia.textContent = tp>0 ? ((inad/tp)*100).toFixed(1)+'%' : '0%';
    if (relDia5Clientes) relDia5Clientes.textContent = d5c;
    if (relDia5Recebido) relDia5Recebido.textContent = `R$ ${d5r.toFixed(2)}`;
    if (relDia20Clientes) relDia20Clientes.textContent = d20c;
    if (relDia20Recebido) relDia20Recebido.textContent = `R$ ${d20r.toFixed(2)}`;
}

// ============================================
// VERIFICAÇÃO PERIÓDICA DE SESSÃO
// ============================================
setInterval(() => {
    const sessao = localStorage.getItem('kronos_session');
    if (sessao) {
        const dados = JSON.parse(sessao);
        if (dados.expira && new Date().getTime() > dados.expira) {
            logout();
        }
    }
}, 60000); // Verificar a cada minuto

console.log('🔐 KRONOS SYSTEM v3.0 - Sistema Seguro Inicializado');
