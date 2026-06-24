// ============================================
// KRONOS SYSTEM v8.0 - COMPLETO
// Logo: kronos_system.jpg
// Backup/Restauração + Perfil Cliente + Super Admin
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

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
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
    const usuariosSnap = await usuariosRef.once('value');
    const usuarios = usuariosSnap.val() || {};
    
    if (Object.keys(usuarios).length === 0) {
        await usuariosRef.push({
            nome: "Mattheus Carvalho", usuario: "MattheCarvalho", senha: "Kronos@2024",
            cargo: "CEO & Fundador", nivel: "super_admin", ativo: true,
            data_criacao: new Date().toISOString(), criado_por: "sistema"
        });
    }
    
    if (!dados.clientes || Object.keys(dados.clientes).length === 0) {
        await clientesRef.set({
            _ex1: { nome:"EMPRESA ALPHA", marca:"MARCA GOLD", valor_total:12000, dia_vencimento:5, mes_referencia:"2024-06", qtd_parcelas:12, valor_parcela:1000, data_cadastro:new Date().toISOString(), parcelas:{ p1:{numero:1,valor:1000,vencimento:"2024-06-05",status:"pago",data_pagamento:"2024-06-03"}, p2:{numero:2,valor:1000,vencimento:"2024-07-05",status:"quitado",data_pagamento:"2024-07-01"}, p3:{numero:3,valor:1000,vencimento:"2024-08-05",status:"finalizando",data_pagamento:null}, p4:{numero:4,valor:1000,vencimento:"2024-09-05",status:"inadimplente",data_pagamento:null} } },
            _ex2: { nome:"COMÉRCIO BETA", marca:"MARCA PRATA", valor_total:8000, dia_vencimento:20, mes_referencia:"2024-06", qtd_parcelas:8, valor_parcela:1000, data_cadastro:new Date().toISOString(), parcelas:{ p1:{numero:1,valor:1000,vencimento:"2024-06-20",status:"pago",data_pagamento:"2024-06-18"}, p2:{numero:2,valor:1000,vencimento:"2024-07-20",status:"quitado",data_pagamento:"2024-07-15"}, p3:{numero:3,valor:1000,vencimento:"2024-08-20",status:"pendente",data_pagamento:null} } }
        });
    }
    carregarClientes();
}

// ============================================
// LOGIN / CRIAR CONTA
// ============================================
function mostrarCriarConta() { document.getElementById('formLogin').style.display='none'; document.getElementById('formCriarConta').style.display='block'; }
function mostrarLogin() { document.getElementById('formCriarConta').style.display='none'; document.getElementById('formLogin').style.display='block'; }

async function criarConta() {
    const n=document.getElementById('novoNome').value.trim(), c=document.getElementById('novoCargo').value.trim();
    const u=document.getElementById('novoUsuario').value.trim(), s=document.getElementById('novaSenha').value;
    const sc=document.getElementById('novaSenhaConf').value;
    if(!n||!u||!s){ alert('Preencha todos os campos!'); return; }
    if(s!==sc){ alert('Senhas não conferem!'); return; }
    if(s.length<6){ alert('Senha deve ter 6+ caracteres!'); return; }
    const snap=await usuariosRef.orderByChild('usuario').equalTo(u).once('value');
    if(snap.exists()){ alert('Usuário já existe!'); return; }
    await usuariosRef.push({ nome:n, cargo:c||'Funcionário', usuario:u, senha:s, nivel:'funcionario', ativo:true, data_criacao:new Date().toISOString(), criado_por:'auto_cadastro' });
    alert('✅ Perfil criado! Faça login.'); mostrarLogin();
    document.getElementById('loginUser').value=u; document.getElementById('loginPass').value='';
}

async function fazerLogin() {
    const l=document.getElementById('loginUser').value.trim(), s=document.getElementById('loginPass').value.trim();
    if(!l||!s){ alert('Preencha usuário e senha!'); return; }
    const snap=await usuariosRef.orderByChild('usuario').equalTo(l).once('value');
    const usuarios=snap.val();
    if(!usuarios){ alert('Usuário não encontrado!'); return; }
    const uid=Object.keys(usuarios)[0], u=usuarios[uid];
    if(u.senha!==s){ alert('Senha incorreta!'); return; }
    if(!u.ativo){ alert('Usuário desativado!'); return; }
    window.usuarioLogado={ id:uid, nome:u.nome, usuario:u.usuario, cargo:u.cargo||'Funcionário', nivel:u.nivel };
    localStorage.setItem('kronos_user',JSON.stringify(window.usuarioLogado));
    await usuariosRef.child(uid).update({ ultimo_login:new Date().toISOString() });
    entrarSistema();
}

function verificarSessaoSalva() { const d=localStorage.getItem('kronos_user'); if(d){ try{ window.usuarioLogado=JSON.parse(d); entrarSistema(); }catch(e){ localStorage.removeItem('kronos_user'); } } }
function entrarSistema() {
    document.getElementById('loginScreen').style.display='none'; document.getElementById('mainSystem').style.display='flex';
    document.getElementById('sidebarUserName').textContent=window.usuarioLogado.nome.split(' ')[0];
    document.getElementById('sidebarUserCargo').textContent=window.usuarioLogado.cargo||'Funcionário';
    carregarClientes(); showPage('dashboard');
}
function sair() { localStorage.removeItem('kronos_user'); window.usuarioLogado=null; document.getElementById('loginScreen').style.display='flex'; document.getElementById('mainSystem').style.display='none'; }

// ============================================
// NAVEGAÇÃO
// ============================================
function inicializarMenu() { document.querySelectorAll('.menu-item').forEach(i=>{ i.addEventListener('click',function(e){ e.preventDefault(); showPage(this.dataset.page); }); }); }
function showPage(page) {
    document.querySelectorAll('.page-content').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m=>m.classList.remove('active'));
    const pe=document.getElementById(`page-${page}`); if(pe) pe.classList.add('active');
    const me=document.querySelector(`.menu-item[data-page="${page}"]`); if(me) me.classList.add('active');
    const t={ dashboard:'Dashboard', clientes:'Clientes', dia5:'Dia 5', dia20:'Dia 20', parcelas:'
