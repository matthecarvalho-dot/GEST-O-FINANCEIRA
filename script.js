// ============================================
// KRONOS SYSTEM v7.0 - COMPLETO
// Perfil completo do cliente + Super Admin
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
    console.log('🔥 KRONOS SYSTEM v7.0 iniciando...');
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
        }
        
        if (!dados.clientes || Object.keys(dados.clientes).length === 0) {
            await clientesRef.set({
                _ex1: {
                    nome: "EMPRESA ALPHA LTDA", marca: "MARCA GOLD", valor_total: 12000,
                    dia_vencimento: 5, mes_referencia: "2024-06", qtd_parcelas: 12, valor_parcela: 1000,
                    data_cadastro: new Date().toISOString(), criado_por: "sistema",
                    parcelas: {
                        p1: { numero:1, valor:1000, vencimento:"2024-06-05", status:"pago", data_pagamento:"2024-06-03" },
                        p2: { numero:2, valor:1000, vencimento:"2024-07-05", status:"quitado", data_pagamento:"2024-07-01" },
                        p3: { numero:3, valor:1000, vencimento:"2024-08-05", status:"finalizando", data_pagamento:null },
                        p4: { numero:4, valor:1000, vencimento:"2024-09-05", status:"inadimplente", data_pagamento:null }
                    }
                },
                _ex2: {
                    nome: "COMÉRCIO BETA", marca: "MARCA PRATA", valor_total: 8000,
                    dia_vencimento: 20, mes_referencia: "2024-06", qtd_parcelas: 8, valor_parcela: 1000,
                    data_cadastro: new Date().toISOString(), criado_por: "sistema",
                    parcelas: {
                        p1: { numero:1, valor:1000, vencimento:"2024-06-20", status:"pago", data_pagamento:"2024-06-18" },
                        p2: { numero:2, valor:1000, vencimento:"2024-07-20", status:"quitado", data_pagamento:"2024-07-15" },
                        p3: { numero:3, valor:1000, vencimento:"2024-08-20", status:"pendente", data_pagamento:null }
                    }
                }
            });
        }
        
        carregarClientes();
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

// ============================================
// LOGIN / CRIAR CONTA
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
    
    if (!nome || !usuario || !senha) { alert('Preencha todos os campos obrigatórios!'); return; }
    if (senha !== senhaConf) { alert('As senhas não conferem!'); return; }
    if (senha.length < 6) { alert('A senha deve ter pelo menos 6 caracteres!'); return; }
    
    try {
        const snap = await usuariosRef.orderByChild('usuario').equalTo(usuario).once('value');
        if (snap.exists()) { alert('Este nome de usuário já está em uso!'); return; }
        
        await usuariosRef.push({
            nome, cargo: cargo || 'Funcionário', usuario, senha,
            nivel: 'funcionario', ativo: true,
            data_criacao: new Date().toISOString(), criado_por: 'auto_cadastro'
        });
        
        alert('✅ Perfil criado com sucesso! Faça login.');
        mostrarLogin();
        document.getElementById('loginUser').value = usuario;
        document.getElementById('loginPass').value = '';
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao criar conta!');
    }
}

async function fazerLogin() {
    const login = document.getElementById('loginUser').value.trim();
    const senha = document.getElementById('loginPass').value.trim();
    if (!login || !senha) { alert('Preencha usuário e senha!'); return; }
    
    try {
        const snap = await usuariosRef.orderByChild('usuario').equalTo(login).once('value');
        const usuarios = snap.val();
        if (!usuarios) { alert('Usuário não encontrado!'); return; }
        
        const userId = Object.keys(usuarios)[0];
        const userData = usuarios[userId];
        if (userData.senha !== senha) { alert('Senha incorreta!'); return; }
        if (!userData.ativo) { alert('Usuário desativado!'); return; }
        
        window.usuarioLogado = {
            id: userId, nome: userData.nome, usuario: userData.usuario,
            cargo: userData.cargo || 'Funcionário', nivel: userData.nivel
        };
        
        localStorage.setItem('kronos_user', JSON.stringify(window.usuarioLogado));
        await usuariosRef.child(userId).update({ ultimo_login: new Date().toISOString() });
        entrarSistema();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao fazer login!');
    }
}

function verificarSessaoSalva() {
    const userData = localStorage.getItem('kronos_user');
    if (userData) {
        try {
            window.usuarioLogado = JSON.parse(userData);
            entrarSistema();
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
    
    carregarClientes();
    showPage('dashboard');
}

function sair() {
    localStorage.removeItem('kronos_user');
    window.usuarioLogado = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainSystem').style.display = 'none';
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
        dashboard:'Dashboard Executivo', clientes:'Todos os Clientes',
        dia5:'Vencimento Dia 5', dia20:'Vencimento Dia 20',
        parcelas:'Todas as Parcelas', relatorios:'Relatórios', admin:'Gerenciar Usuários'
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
        if (document.getElementById('page-dashboard').classList.contains('active')) atualizarDashboard();
    });
}

function carregarMeses() {
    const sel = document.getElementById('filtroMesCliente');
    if (!sel) return;
    const agora = new Date();
    for (let i = -6; i <= 6; i++) {
        const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
        sel.innerHTML += `<option value="${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}">${d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).toUpperCase()}</option>`;
    }
}

function atualizarDataHora() {
    const el = document.getElementById('currentDateTime');
    if (el) el.textContent = new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
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
function calcAberto(c) { if(!c.parcelas) return c.valor_total||0; return Object.values(c.parcelas).filter(p=>p.status!=='pago'&&p.status!=='quitado').reduce((t,p)=>t+p.valor,0); }
function calcRecebido(c) { if(!c.parcelas) return 0; return Object.values(c.parcelas).filter(p=>p.status==='pago'||p.status==='quitado').reduce((t,p)=>t+p.valor,0); }
function contarPagas(c) { if(!c.parcelas) return 0; return Object.values(c.parcelas).filter(p=>p.status==='pago'||p.status==='quitado').length; }
function formatMoeda(v) { return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v); }
function formatData(d) { if(!d) return '-'; return new Date(d).toLocaleDateString('pt-BR'); }

// ============================================
// DASHBOARD
// ============================================
function atualizarDashboard() {
    const clientes = Object.values(todosClientes);
    let p=0, q=0, f=0, i=0, tr=0, ta=0, tp=0, inad=0;
    clientes.forEach(c => {
        const st = getStatus(c);
        if(st==='pago') p++; else if(st==='quitado') q++; else if(st==='finalizando') f++; else if(st==='inadimplente') i++;
        tr += calcRecebido(c); ta += calcAberto(c);
        if(c.parcelas) Object.values(c.parcelas).forEach(pr => { tp++; if(pr.status==='inadimplente') inad++; });
    });
    document.getElementById('kpiPago').textContent=p;
    document.getElementById('kpiQuitado').textContent=q;
    document.getElementById('kpiFinalizando').textContent=f;
    document.getElementById('kpiInadimplente').textContent=i;
    document.getElementById('resumoRecebido').textContent=formatMoeda(tr);
    document.getElementById('resumoAberto').textContent=formatMoeda(ta);
    document.getElementById('resumoInadimplencia').textContent=tp>0?((inad/tp)*100).toFixed(1)+'%':'0%';
    criarGraficoMensal(clientes);
    criarGraficoStatus(clientes);
    criarGraficoComparativo(clientes);
    carregarUltimosClientes();
}

function carregarUltimosClientes() {
    const tbody = document.getElementById('ultimosClientes');
    if(!tbody) return;
    const clientes = Object.entries(todosClientes).slice(-5).reverse();
    if(clientes.length===0){ tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:#8899aa;">Nenhum cliente</td></tr>'; return; }
    tbody.innerHTML=clientes.map(([id,c])=>`<tr><td><strong>${c.nome}</strong></td><td>${c.marca}</td><td>Dia ${c.dia_vencimento}</td><td>${formatMoeda(c.valor_total||0)}</td><td>${contarPagas(c)}/${c.qtd_parcelas||0}</td><td><span class="badge-status badge-${getStatus(c)}">${getStatus(c).toUpperCase()}</span></td></tr>`).join('');
}

function criarGraficoMensal(clientes) {
    const canvas = document.getElementById('chartMensal');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(charts.mensal) charts.mensal.destroy();
    const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const rec=new Array(12).fill(0), ab=new Array(12).fill(0);
    clientes.forEach(c=>{ if(!c.parcelas) return; Object.values(c.parcelas).forEach(p=>{ const m=new Date(p.vencimento).getMonth(); if(p.status==='pago'||p.status==='quitado') rec[m]+=p.valor; else ab[m]+=p.valor; }); });
    charts.mensal=new Chart(ctx,{type:'bar',data:{labels:meses,datasets:[{label:'Recebido',data:rec,backgroundColor:'#27ae60',borderRadius:5},{label:'Em Aberto',data:ab,backgroundColor:'#e74c3c',borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8899aa'}}},scales:{y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8899aa'}},x:{grid:{display:false},ticks:{color:'#8899aa'}}}}});
}

function criarGraficoStatus(clientes) {
    const canvas = document.getElementById('chartStatus');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(charts.status) charts.status.destroy();
    let pa=0,qu=0,fi=0,ina=0,pe=0;
    clientes.forEach(c=>{ if(!c.parcelas) return; Object.values(c.parcelas).forEach(p=>{ if(p.status==='pago') pa++; else if(p.status==='quitado') qu++; else if(p.status==='finalizando') fi++; else if(p.status==='inadimplente') ina++; else pe++; }); });
    charts.status=new Chart(ctx,{type:'doughnut',data:{labels:['Pago','Quitado','Finalizando','Inadimplente','Pendente'],datasets:[{data:[pa,qu,fi,ina,pe],backgroundColor:['#27ae60','#c9a84c','#f39c12','#e74c3c','#3498db']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#8899aa',padding:15}}}}});
}

function criarGraficoComparativo(clientes) {
    const canvas = document.getElementById('chartComparativo');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(charts.comp) charts.comp.destroy();
    let d5t=0,d5r=0,d20t=0,d20r=0;
    clientes.forEach(c=>{ if(!c.parcelas) return; Object.values(c.parcelas).forEach(p=>{ const dia=new Date(p.vencimento).getDate(); if(dia===5){ d5t+=p.valor; if(p.status==='pago'||p.status==='quitado') d5r+=p.valor; } else if(dia===20){ d20t+=p.valor; if(p.status==='pago'||p.status==='quitado') d20r+=p.valor; } }); });
    charts.comp=new Chart(ctx,{type:'bar',data:{labels:['DIA 5','DIA 20'],datasets:[{label:'Total',data:[d5t,d20t],backgroundColor:'#3498db',borderRadius:5},{label:'Recebido',data:[d5r,d20r],backgroundColor:'#27ae60',borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8899aa'}}},scales:{y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8899aa'}},x:{grid:{display:false},ticks:{color:'#8899aa'}}}}});
}

// ============================================
// TABELAS
// ============================================
function carregarTabelaClientes() {
    const tbody=document.getElementById('tabelaTodosClientes'); if(!tbody) return;
    const busca=(document.getElementById('buscaCliente')?.value||'').toLowerCase();
    const mes=document.getElementById('filtroMesCliente')?.value||'';
    let clientes=Object.entries(todosClientes);
    if(busca) clientes=clientes.filter(([_,c])=>c.nome.toLowerCase().includes(busca)||c.marca.toLowerCase().includes(busca));
    if(mes) clientes=clientes.filter(([_,c])=>c.mes_referencia===mes);
    if(clientes.length===0){ tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:30px;">Nenhum cliente</td></tr>'; return; }
    tbody.innerHTML=clientes.map(([id,c])=>renderLinha(id,c)).join('');
}

function carregarClientesDia(dia) {
    const tbody=document.getElementById(`tabelaDia${dia}`); const total=document.getElementById(`totalDia${dia}`);
    if(!tbody) return;
    const clientes=Object.entries(todosClientes).filter(([_,c])=>c.dia_vencimento==dia);
    if(total) total.textContent=`${clientes.length} clientes`;
    if(clientes.length===0){ tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:30px;">Nenhum cliente dia ${dia}</td></tr>`; return; }
    tbody.innerHTML=clientes.map(([id,c])=>renderLinha(id,c)).join('');
}

function renderLinha(id, c) {
    const st = getStatus(c);
    return `<tr>
        <td><strong>${c.nome}</strong></td>
        <td>${c.marca}</td>
        <td>Dia ${c.dia_vencimento} - ${c.mes_referencia||'-'}</td>
        <td>${formatMoeda(c.valor_total||0)}</td>
        <td>${contarPagas(c)}/${c.qtd_parcelas||0}</td>
        <td>${formatMoeda(calcAberto(c))}</td>
        <td><span class="badge-status badge-${st}">${st.toUpperCase()}</span></td>
        <td>
            <button class="btn-sm edit" onclick="abrirPerfilCliente('${id}')" title="Perfil Completo"><i class="fas fa-id-card"></i></button>
            <button class="btn-sm" onclick="verParcelas('${id}')" title="Parcelas"><i class="fas fa-list"></i></button>
            <button class="btn-sm danger" onclick="excluirCliente('${id}')" title="Excluir"><i class="fas fa-trash"></i></button>
        </td>
    </tr>`;
}

function carregarTodasParcelas() {
    const tbody=document.getElementById('tabelaParcelas'); if(!tbody) return;
    const fs=document.getElementById('filtroStatusParcela')?.value||'';
    const fd=document.getElementById('filtroDiaParcela')?.value||'';
    let parcelas=[];
    Object.entries(todosClientes).forEach(([id,c])=>{ if(!c.parcelas) return; Object.entries(c.parcelas).forEach(([key,p])=>{ if(fs&&p.status!==fs) return; if(fd&&new Date(p.vencimento).getDate()!=fd) return; parcelas.push({clienteId:id,parcelaKey:key,clienteNome:c.nome,...p}); }); });
    parcelas.sort((a,b)=>new Date(a.vencimento)-new Date(b.vencimento));
    if(parcelas.length===0){ tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:30px;">Nenhuma parcela</td></tr>'; return; }
    tbody.innerHTML=parcelas.map(p=>`<tr><td><strong>${p.clienteNome}</strong></td><td>${p.numero}ª</td><td>${formatMoeda(p.valor)}</td><td>${formatData(p.vencimento)}</td><td><span class="badge-status badge-${p.status}">${p.status.toUpperCase()}</span></td><td>${p.data_pagamento?formatData(p.data_pagamento):'Não pago'}</td><td><button class="btn-sm edit" onclick="abrirModalEditarParcela('${p.clienteId}','${p.parcelaKey}')"><i class="fas fa-pen"></i></button></td></tr>`).join('');
}

function verParcelas(id) { showPage('parcelas'); setTimeout(carregarTodasParcelas,100); }

// ============================================
// PERFIL COMPLETO DO CLIENTE
// ============================================
function abrirPerfilCliente(id) {
    const c = todosClientes[id];
    if (!c) return;
    
    const existing = document.getElementById('modalPerfilCliente');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalPerfilCliente';
    modal.style.display = 'flex';
    
    const st = getStatus(c);
    const parcelas = Object.entries(c.parcelas || {}).sort((a, b) => a[1].numero - b[1].numero);
    
    modal.innerHTML = `
        <div class="modal-modern" style="width:950px;max-width:98%;max-height:90vh;">
            <div class="modal-header" style="background:linear-gradient(135deg,rgba(201,168,76,0.1),transparent);">
                <div>
                    <h2 style="font-size:1.2rem;">${c.nome}</h2>
                    <small style="color:#8899aa;">${c.marca} • Dia ${c.dia_vencimento} • ${c.mes_referencia||'N/A'}</small>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span class="badge-status badge-${st}" style="font-size:0.8rem;">${st.toUpperCase()}</span>
                    <button onclick="document.getElementById('modalPerfilCliente').remove()" style="background:none;border:none;color:#8899aa;font-size:1.5rem;cursor:pointer;">&times;</button>
                </div>
            </div>
            <div class="modal-body" style="padding:25px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:25px;">
                    <div style="background:var(--bg-tertiary,#152238);padding:20px;border-radius:12px;">
                        <h4 style="color:var(--gold);margin-bottom:15px;font-size:0.9rem;letter-spacing:1px;"><i class="fas fa-info-circle"></i> DADOS DO CLIENTE</h4>
                        <div style="display:grid;gap:12px;">
                            <div><small style="color:#8899aa;">NOME COMPLETO</small><input type="text" id="editNome_${id}" class="form-input" value="${c.nome}" style="margin-top:4px;"></div>
                            <div><small style="color:#8899aa;">MARCA</small><input type="text" id="editMarca_${id}" class="form-input" value="${c.marca}" style="margin-top:4px;"></div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                <div><small style="color:#8899aa;">DIA VENCIMENTO</small><select id="editDia_${id}" class="form-input" style="margin-top:4px;"><option value="5" ${c.dia_vencimento==5?'selected':''}>DIA 5</option><option value="20" ${c.dia_vencimento==20?'selected':''}>DIA 20</option></select></div>
                                <div><small style="color:#8899aa;">MÊS REFERÊNCIA</small><input type="month" id="editMes_${id}" class="form-input" value="${c.mes_referencia||''}" style="margin-top:4px;"></div>
                            </div>
                        </div>
                    </div>
                    <div style="background:var(--bg-tertiary,#152238);padding:20px;border-radius:12px;">
                        <h4 style="color:var(--gold);margin-bottom:15px;font-size:0.9rem;letter-spacing:1px;"><i class="fas fa-dollar-sign"></i> DADOS FINANCEIROS</h4>
                        <div style="display:grid;gap:12px;">
                            <div><small style="color:#8899aa;">VALOR TOTAL</small><input type="number" id="editValor_${id}" class="form-input" value="${c.valor_total}" step="0.01" style="margin-top:4px;" onkeyup="recalcularParcelas('${id}')"></div>
                            <div><small style="color:#8899aa;">QUANTIDADE DE PARCELAS</small><input type="number" id="editQtd_${id}" class="form-input" value="${c.qtd_parcelas}" min="1" style="margin-top:4px;" onkeyup="recalcularParcelas('${id}')"></div>
                            <div style="background:rgba(201,168,76,0.1);padding:12px;border-radius:8px;text-align:center;">
                                <small style="color:#8899aa;">VALOR POR PARCELA</small>
                                <strong style="color:var(--gold);display:block;font-size:1.2rem;" id="previewValor_${id}">${formatMoeda(c.valor_parcela||(c.valor_total/c.qtd_parcelas))}</strong>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="background:var(--bg-tertiary,#152238);padding:20px;border-radius:12px;margin-bottom:20px;">
                    <h4 style="color:var(--gold);margin-bottom:15px;font-size:0.9rem;letter-spacing:1px;"><i class="fas fa-list"></i> PARCELAS (${parcelas.length})</h4>
                    <div style="max-height:300px;overflow-y:auto;" id="parcelasContainer_${id}">
                        ${parcelas.map(([key,p]) => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg-card,#0d1421);border-radius:8px;margin-bottom:8px;border:1px solid var(--border,#1e293b);">
                                <div style="display:flex;align-items:center;gap:15px;">
                                    <div style="width:40px;height:40px;border-radius:50%;background:rgba(201,168,76,0.1);display:flex;align-items:center;justify-content:center;color:var(--gold);font-weight:700;">${p.numero}</div>
                                    <div><strong style="color:#fff;display:block;">Parcela ${p.numero}ª</strong><small style="color:#8899aa;">Venc: ${formatData(p.vencimento)} • ${formatMoeda(p.valor)}</small></div>
                                </div>
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <select id="st_${id}_${key}" class="form-input" style="width:150px;padding:6px 10px;font-size:0.8rem;" onchange="atualizarParcelaRapido('${id}','${key}')">
                                        ${['pendente','pago','quitado','finalizando','inadimplente'].map(s=>`<option value="${s}" ${p.status===s?'selected':''}>${s.toUpperCase()}</option>`).join('')}
                                    </select>
                                    <span class="badge-status badge-${p.status}" style="font-size:0.65rem;">${p.status.toUpperCase()}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:20px;">
                    <div style="background:rgba(39,174,96,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#27ae60;">TOTAL PAGO</small><strong style="color:#fff;font-size:1.1rem;display:block;">${formatMoeda(calcRecebido(c))}</strong></div>
                    <div style="background:rgba(231,76,60,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#e74c3c;">EM ABERTO</small><strong style="color:#fff;font-size:1.1rem;display:block;">${formatMoeda(calcAberto(c))}</strong></div>
                    <div style="background:rgba(52,152,219,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#3498db;">PARCELAS PAGAS</small><strong style="color:#fff;font-size:1.1rem;display:block;">${contarPagas(c)}/${c.qtd_parcelas}</strong></div>
                    <div style="background:rgba(201,168,76,0.1);padding:15px;border-radius:10px;text-align:center;"><small style="color:#c9a84c;">STATUS</small><strong style="color:#fff;font-size:1.1rem;display:block;">${st.toUpperCase()}</strong></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" onclick="document.getElementById('modalPerfilCliente').remove()">FECHAR</button>
                <button class="btn-primary" onclick="salvarAlteracoesCliente('${id}')"><i class="fas fa-save"></i> SALVAR TODAS AS ALTERAÇÕES</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function recalcularParcelas(id) {
    const valor = parseFloat(document.getElementById(`editValor_${id}`)?.value) || 0;
    const qtd = parseInt(document.getElementById(`editQtd_${id}`)?.value) || 1;
    const preview = document.getElementById(`previewValor_${id}`);
    if (preview) preview.textContent = formatMoeda(valor / qtd);
}

async function atualizarParcelaRapido(clienteId, parcelaKey) {
    const select = document.getElementById(`st_${clienteId}_${parcelaKey}`);
    if (!select) return;
    const novoStatus = select.value;
    const dataPag = (novoStatus === 'pago' || novoStatus === 'quitado') ? new Date().toISOString() : null;
    await clientesRef.child(`${clienteId}/parcelas/${parcelaKey}`).update({ status: novoStatus, data_pagamento: dataPag });
    const badge = select.parentElement.querySelector('.badge-status');
    if (badge) { badge.className = `badge-status badge-${novoStatus}`; badge.textContent = novoStatus.toUpperCase(); }
}

async function salvarAlteracoesCliente(id) {
    const nome = document.getElementById(`editNome_${id}`)?.value.trim();
    const marca = document.getElementById(`editMarca_${id}`)?.value.trim();
    const dia = parseInt(document.getElementById(`editDia_${id}`)?.value);
    const mes = document.getElementById(`editMes_${id}`)?.value;
    const valor = parseFloat(document.getElementById(`editValor_${id}`)?.value);
    const qtd = parseInt(document.getElementById(`editQtd_${id}`)?.value);
    
    if (!nome || !marca || !valor || !qtd || !mes) { alert('Preencha todos os campos!'); return; }
    
    const valorParcela = valor / qtd;
    const updates = { nome, marca, dia_vencimento: dia, mes_referencia: mes, valor_total: valor, qtd_parcelas: qtd, valor_parcela: valorParcela, data_atualizacao: new Date().toISOString() };
    
    const c = todosClientes[id];
    if (c.parcelas) {
        const chaves = Object.keys(c.parcelas).sort();
        const [ano, mesNum] = mes.split('-').map(Number);
        
        chaves.forEach((key, index) => {
            const venc = new Date(ano, mesNum - 1 + index, dia);
            updates[`parcelas/${key}/valor`] = valorParcela;
            updates[`parcelas/${key}/vencimento`] = venc.toISOString().split('T')[0];
        });
        
        if (chaves.length > qtd) {
            for (let i = qtd; i < chaves.length; i++) { updates[`parcelas/${chaves[i]}`] = null; }
        }
        
        if (qtd > chaves.length) {
            for (let i = chaves.length + 1; i <= qtd; i++) {
                const venc = new Date(ano, mesNum - 1 + (i - 1), dia);
                updates[`parcelas/p${i}`] = { numero: i, valor: valorParcela, vencimento: venc.toISOString().split('T')[0], status: 'pendente', data_pagamento: null };
            }
        }
    }
    
    await clientesRef.child(id).update(updates);
    alert('✅ Cliente atualizado com sucesso!');
    document.getElementById('modalPerfilCliente')?.remove();
}

function verPerfilCliente(id) { abrirPerfilCliente(id); }

// ============================================
// MODAL PARCELA
// ============================================
function abrirModalEditarParcela(clienteId, parcelaKey) {
    const c=todosClientes[clienteId]; if(!c||!c.parcelas||!c.parcelas[parcelaKey]) return;
    const p=c.parcelas[parcelaKey];
    document.getElementById('infoParcela').innerHTML=`<strong>${c.nome}</strong><br>Parcela ${p.numero} - ${formatMoeda(p.valor)}<br>Venc: ${formatData(p.vencimento)}`;
    document.getElementById('novoStatus').value=p.status;
    document.getElementById('parcelaClienteId').value=clienteId;
    document.getElementById('parcelaKey').value=parcelaKey;
    document.getElementById('modalParcela').style.display='flex';
}
function fecharModalParcela(){ document.getElementById('modalParcela').style.display='none'; }
async function atualizarStatusParcela(){
    const cid=document.getElementById('parcelaClienteId').value;
    const key=document.getElementById('parcelaKey').value;
    const st=document.getElementById('novoStatus').value;
    const dp=(st==='pago'||st==='quitado')?new Date().toISOString():null;
    await clientesRef.child(`${cid}/parcelas/${key}`).update({status:st,data_pagamento:dp});
    fecharModalParcela(); carregarTodasParcelas();
}

// ============================================
// CRUD CLIENTES
// ============================================
function abrirModalCliente(){
    document.getElementById('editId').value='';
    document.getElementById('modalTitulo').textContent='NOVO CLIENTE';
    ['nomeCliente','marcaCliente','valorTotal'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('qtdParcelas').value='1';
    document.getElementById('previewParcela').textContent='R$ 0,00';
    document.getElementById('previewParcelas').textContent='';
    document.getElementById('modalCliente').style.display='flex';
}
function fecharModalCliente(){ document.getElementById('modalCliente').style.display='none'; }
function editarCliente(id){
    const c=todosClientes[id]; if(!c) return;
    document.getElementById('editId').value=id;
    document.getElementById('modalTitulo').textContent='EDITAR CLIENTE';
    document.getElementById('nomeCliente').value=c.nome;
    document.getElementById('marcaCliente').value=c.marca;
    document.getElementById('valorTotal').value=c.valor_total;
    document.getElementById('qtdParcelas').value=c.qtd_parcelas;
    document.getElementById('diaVencimento').value=c.dia_vencimento;
    document.getElementById('mesReferencia').value=c.mes_referencia||'';
    calcParcela(); document.getElementById('modalCliente').style.display='flex';
}
function calcParcela(){
    const t=parseFloat(document.getElementById('valorTotal').value)||0;
    const q=parseInt(document.getElementById('qtdParcelas').value)||1;
    document.getElementById('previewParcela').textContent=formatMoeda(t/q);
    document.getElementById('previewParcelas').textContent=`${q} parcela(s)`;
}
async function salvarCliente(){
    const eid=document.getElementById('editId').value;
    const nome=document.getElementById('nomeCliente').value.trim();
    const marca=document.getElementById('marcaCliente').value.trim();
    const vt=parseFloat(document.getElementById('valorTotal').value);
    const qp=parseInt(document.getElementById('qtdParcelas').value);
    const dv=parseInt(document.getElementById('diaVencimento').value);
    const mr=document.getElementById('mesReferencia').value;
    if(!nome||!marca||!vt||!qp||!mr){ alert('Preencha todos os campos!'); return; }
    const vp=vt/qp; const parcelas={}; const [ano,mes]=mr.split('-').map(Number);
    for(let i=1;i<=qp;i++){ const venc=new Date(ano,mes-1+(i-1),dv); parcelas[`p${i}`]={numero:i,valor:vp,vencimento:venc.toISOString().split('T')[0],status:'pendente',data_pagamento:null}; }
    const dados={nome,marca,valor_total:vt,qtd_parcelas:qp,valor_parcela:vp,dia_vencimento:dv,mes_referencia:mr,parcelas,data_atualizacao:new Date().toISOString(),criado_por:window.usuarioLogado?window.usuarioLogado.usuario:'admin'};
    if(eid){ await clientesRef.child(eid).update(dados); } else { dados.data_cadastro=new Date().toISOString(); await clientesRef.push(dados); }
    fecharModalCliente();
}
async function excluirCliente(id){ if(confirm('Excluir cliente?')) await clientesRef.child(id).remove(); }

// ============================================
// RELATÓRIOS
// ============================================
function carregarRelatorios(){
    const clientes=Object.values(todosClientes);
    let tr=0,ta=0,tp=0,ina=0,d5c=0,d5r=0,d5a=0,d20c=0,d20r=0,d20a=0;
    clientes.forEach(c=>{ tr+=calcRecebido(c); ta+=calcAberto(c); if(c.dia_vencimento===5){ d5c++; d5r+=calcRecebido(c); d5a+=calcAberto(c); } if(c.dia_vencimento===20){ d20c++; d20r+=calcRecebido(c); d20a+=calcAberto(c); } if(c.parcelas) Object.values(c.parcelas).forEach(p=>{ tp++; if(p.status==='inadimplente') ina++; }); });
    document.getElementById('relClientes').textContent=clientes.length;
    document.getElementById('relRecebido').textContent=formatMoeda(tr);
    document.getElementById('relAberto').textContent=formatMoeda(ta);
    document.getElementById('relInadimplencia').textContent=tp>0?((ina/tp)*100).toFixed(1)+'%':'0%';
    document.getElementById('relDia5Cli').textContent=d5c; document.getElementById('relDia5Rec').textContent=formatMoeda(d5r); document.getElementById('relDia5Ab').textContent=formatMoeda(d5a);
    document.getElementById('relDia20Cli').textContent=d20c; document.getElementById('relDia20Rec').textContent=formatMoeda(d20r); document.getElementById('relDia20Ab').textContent=formatMoeda(d20a);
}

// ============================================
// GERENCIAR USUÁRIOS
// ============================================
async function carregarUsuarios(){
    const snap=await usuariosRef.once('value'); const usuarios=snap.val()||{};
    if(window.usuarioLogado){ document.getElementById('meuPerfil').innerHTML=`<h4>${window.usuarioLogado.nome}</h4><p>${window.usuarioLogado.cargo} • ${window.usuarioLogado.nivel.replace('_',' ').toUpperCase()}</p><small style="color:#8899aa;">@${window.usuarioLogado.usuario}</small>`; }
    const container=document.getElementById('listaUsuarios'); const lista=Object.entries(usuarios);
    if(lista.length===0){ container.innerHTML='<p style="color:#8899aa;text-align:center;padding:20px;">Nenhum funcionário</p>'; return; }
    container.innerHTML=lista.map(([id,u])=>{
        const isMe=window.usuarioLogado&&window.usuarioLogado.id===id;
        const nivelBadge=u.nivel==='super_admin'?'badge-pago':u.nivel==='admin'?'badge-quitado':u.nivel==='gerente'?'badge-finalizando':'badge-pendente';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #1e293b;"><div style="display:flex;align-items:center;gap:12px;"><div style="width:40px;height:40px;border-radius:50%;background:rgba(212,168,83,0.15);display:flex;align-items:center;justify-content:center;color:#c9a84c;font-weight:700;">${u.nome.charAt(0).toUpperCase()}</div><div><strong style="color:#fff;">${u.nome} ${isMe?'(Você)':''}</strong><small style="color:#8899aa;display:block;">@${u.usuario} • ${u.cargo}</small><span class="badge-status ${nivelBadge}" style="font-size:0.6rem;">${u.nivel.replace('_',' ').toUpperCase()}</span><span class="badge-status ${u.ativo?'badge-pago':'badge-inadimplente'}" style="font-size:0.6rem;margin-left:4px;">${u.ativo?'ATIVO':'INATIVO'}</span></div></div><div style="display:flex;gap:6px;"><button class="btn-sm edit" onclick="editarUsuario('${id}')"><i class="fas fa-edit"></i></button>${!isMe?`<button class="btn-sm" onclick="toggleUsuario('${id}',${!u.ativo})"><i class="fas fa-power-off"></i></button><button class="btn-sm danger" onclick="excluirUsuario('${id}')"><i class="fas fa-trash"></i></button>`:''}</div></div>`;
    }).join('');
}
function abrirModalUsuario(){ document.getElementById('editUserId').value=''; document.getElementById('modalUsuarioTitulo').textContent='NOVO USUÁRIO'; ['usuarioNome','usuarioCargo','usuarioLogin','usuarioSenha'].forEach(id=>document.getElementById(id).value=''); document.getElementById('usuarioNivel').value='funcionario'; document.getElementById('usuarioAtivo').value='true'; document.getElementById('modalUsuario').style.display='flex'; }
function editarUsuario(id){ usuariosRef.child(id).once('value').then(snap=>{ const u=snap.val(); if(!u) return; document.getElementById('editUserId').value=id; document.getElementById('modalUsuarioTitulo').textContent='EDITAR USUÁRIO'; document.getElementById('usuarioNome').value=u.nome; document.getElementById('usuarioCargo').value=u.cargo||''; document.getElementById('usuarioLogin').value=u.usuario; document.getElementById('usuarioSenha').value=u.senha; document.getElementById('usuarioNivel').value=u.nivel; document.getElementById('usuarioAtivo').value=u.ativo?'true':'false'; document.getElementById('modalUsuario').style.display='flex'; }); }
function editarMeuPerfil(){ if(!window.usuarioLogado) return; editarUsuario(window.usuarioLogado.id); }
function fecharModalUsuario(){ document.getElementById('modalUsuario').style.display='none'; }
async function salvarUsuario(){
    const editId=document.getElementById('editUserId').value; const nome=document.getElementById('usuarioNome').value.trim(); const cargo=document.getElementById('usuarioCargo').value.trim(); const login=document.getElementById('usuarioLogin').value.trim(); const senha=document.getElementById('usuarioSenha').value.trim(); const nivel=document.getElementById('usuarioNivel').value; const ativo=document.getElementById('usuarioAtivo').value==='true';
    if(!nome||!login||!senha){ alert('Preencha os campos obrigatórios!'); return; }
    const dados={nome,cargo,usuario:login,senha,nivel,ativo,data_atualizacao:new Date().toISOString()};
    if(editId){ await usuariosRef.child(editId).update(dados); if(window.usuarioLogado&&window.usuarioLogado.id===editId){ window.usuarioLogado.nome=nome; window.usuarioLogado.cargo=cargo; window.usuarioLogado.usuario=login; window.usuarioLogado.nivel=nivel; localStorage.setItem('kronos_user',JSON.stringify(window.usuarioLogado)); document.getElementById('sidebarUserName').textContent=nome.split(' ')[0]; document.getElementById('sidebarUserCargo').textContent=cargo; } }
    else { dados.data_criacao=new Date().toISOString(); dados.criado_por=window.usuarioLogado?window.usuarioLogado.usuario:'sistema'; await usuariosRef.push(dados); }
    fecharModalUsuario(); carregarUsuarios(); alert('✅ Usuário salvo!');
}
async function toggleUsuario(id,ativo){ await usuariosRef.child(id).update({ativo}); carregarUsuarios(); }
async function excluirUsuario(id){ if(!confirm('Excluir?')) return; const snap=await usuariosRef.child(id).once('value'); const u=snap.val(); if(u&&u.nivel==='super_admin'){ alert('❌ Não é possível excluir o Super Admin!'); return; } await usuariosRef.child(id).remove(); carregarUsuarios(); }

document.addEventListener('keypress',function(e){ if(e.key==='Enter'){ const ls=document.getElementById('loginScreen'); if(ls&&ls.style.display!=='none') fazerLogin(); } });

console.log('🚀 KRONOS SYSTEM v7.0 - PRONTO!');
console.log('👤 Super Admin: MattheCarvalho / Kronos@2024');
console.log('📂 Perfil completo do cliente disponível!');
