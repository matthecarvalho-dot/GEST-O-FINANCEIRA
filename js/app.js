// ============================================
// KRONOS SYSTEM - Gestão Financeira
// Firebase Realtime Database
// ============================================

// Configuração Firebase (SUAS CREDENCIAIS)
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
const configuracoesRef = database.ref('kronos_system/configuracoes');

// Variável global para clientes
let todosClientes = {};
let modalCliente, modalParcelas;

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar modais
    modalCliente = new bootstrap.Modal(document.getElementById('modalCliente'));
    modalParcelas = new bootstrap.Modal(document.getElementById('modalParcelas'));
    
    // Atualizar data/hora
    atualizarDataHora();
    setInterval(atualizarDataHora, 30000);
    
    // Carregar meses
    carregarMeses();
    
    // Carregar dados
    carregarClientes();
    
    // Calcular valor da parcela em tempo real
    document.getElementById('valorTotal').addEventListener('input', calcularParcela);
    document.getElementById('qtdParcelas').addEventListener('input', calcularParcela);
    
    // Verificar se banco existe, senão criar
    verificarBancoDados();
});

// ============================================
// FUNÇÕES DE DADOS
// ============================================

// Verificar e criar banco se necessário
async function verificarBancoDados() {
    const snapshot = await database.ref('kronos_system').once('value');
    
    if (!snapshot.exists()) {
        console.log('Criando estrutura inicial...');
        
        await database.ref('kronos_system').set({
            configuracoes: {
                empresa: {
                    nome: "KRONOS SYSTEM",
                    sistema: "Gestão Financeira",
                    versao: "1.0.0",
                    criado_em: new Date().toISOString()
                },
                status: ["pago", "quitado", "finalizando", "inadimplente", "pendente"],
                dias_vencimento: [5, 20]
            },
            clientes: {
                _exemplo: {
                    nome: "EMPRESA EXEMPLO LTDA",
                    marca: "MARCA XYZ",
                    valor_total: 5000.00,
                    dia_vencimento: 5,
                    mes_referencia: "2024-01",
                    qtd_parcelas: 5,
                    valor_parcela: 1000.00,
                    data_cadastro: new Date().toISOString(),
                    parcelas: {
                        parcela_1: { numero: 1, valor: 1000.00, vencimento: "2024-01-05", status: "pago", data_pagamento: "2024-01-04" },
                        parcela_2: { numero: 2, valor: 1000.00, vencimento: "2024-02-05", status: "quitado", data_pagamento: "2024-02-01" },
                        parcela_3: { numero: 3, valor: 1000.00, vencimento: "2024-03-05", status: "finalizando", data_pagamento: null },
                        parcela_4: { numero: 4, valor: 1000.00, vencimento: "2024-04-05", status: "inadimplente", data_pagamento: null },
                        parcela_5: { numero: 5, valor: 1000.00, vencimento: "2024-05-05", status: "pendente", data_pagamento: null }
                    }
                }
            }
        });
        
        console.log('✅ Banco de dados inicializado!');
        carregarClientes();
    }
}

// Carregar clientes
function carregarClientes() {
    clientesRef.on('value', (snapshot) => {
        todosClientes = snapshot.val() || {};
        aplicarFiltros();
        atualizarContadores();
    });
}

// Aplicar filtros
function aplicarFiltros() {
    const mes = document.getElementById('mesFiltro').value;
    const dia = document.getElementById('diaFiltro').value;
    const status = document.getElementById('statusFiltro').value;
    
    let clientesFiltrados = Object.entries(todosClientes).filter(([id, cliente]) => {
        if (id === '_exemplo') return true; // Sempre mostrar exemplo
        
        let mostrar = true;
        
        if (mes && cliente.mes_referencia !== mes) mostrar = false;
        if (dia && cliente.dia_vencimento != dia) mostrar = false;
        if (status && calcularStatusGeral(cliente) !== status) mostrar = false;
        
        return mostrar;
    });
    
    renderizarTabela(clientesFiltrados);
}

// Renderizar tabela
function renderizarTabela(clientes) {
    const tbody = document.getElementById('tabelaClientes');
    document.getElementById('totalRegistros').textContent = `${clientes.length} registros`;
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Nenhum cliente encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map(([id, cliente]) => {
        const status = calcularStatusGeral(cliente);
        const valorEmAberto = calcularValorEmAberto(cliente);
        const parcelasPagas = contarParcelasPagas(cliente);
        
        return `
            <tr>
                <td><strong>${cliente.nome}</strong></td>
                <td>${cliente.marca}</td>
                <td>Dia ${cliente.dia_vencimento} - ${formatarMes(cliente.mes_referencia)}</td>
                <td>R$ ${cliente.valor_total.toFixed(2)}</td>
                <td>R$ ${valorEmAberto.toFixed(2)}</td>
                <td>${parcelasPagas}/${cliente.qtd_parcelas}</td>
                <td><span class="badge-status badge-${status}">${status.toUpperCase()}</span></td>
                <td>
                    <button class="btn-acao" onclick="gerenciarParcelas('${id}')" title="Gerenciar Parcelas">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="btn-acao" onclick="editarCliente('${id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-acao excluir" onclick="excluirCliente('${id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// CRUD CLIENTES
// ============================================

function abrirModalCliente() {
    document.getElementById('formCliente').reset();
    document.getElementById('clienteId').value = '';
    document.getElementById('modalTitulo').textContent = 'NOVO CLIENTE';
    document.getElementById('valorParcelaPreview').textContent = '0,00';
    modalCliente.show();
}

function editarCliente(id) {
    const cliente = todosClientes[id];
    if (!cliente) return;
    
    document.getElementById('clienteId').value = id;
    document.getElementById('nomeCliente').value = cliente.nome;
    document.getElementById('marca').value = cliente.marca;
    document.getElementById('valorTotal').value = cliente.valor_total;
    document.getElementById('diaVencimento').value = cliente.dia_vencimento;
    document.getElementById('mesReferencia').value = cliente.mes_referencia;
    document.getElementById('qtdParcelas').value = cliente.qtd_parcelas;
    
    document.getElementById('modalTitulo').textContent = 'EDITAR CLIENTE';
    calcularParcela();
    modalCliente.show();
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
        alert('Preencha todos os campos obrigatórios!');
        return;
    }
    
    const valorParcela = valorTotal / qtdParcelas;
    
    // Criar parcelas
    const parcelas = {};
    const [ano, mes] = mesReferencia.split('-').map(Number);
    
    for (let i = 1; i <= qtdParcelas; i++) {
        const dataVencimento = new Date(ano, mes - 1 + (i - 1), diaVencimento);
        const dataFormatada = dataVencimento.toISOString().split('T')[0];
        
        parcelas[`parcela_${i}`] = {
            numero: i,
            valor: valorParcela,
            vencimento: dataFormatada,
            status: i === 1 ? statusInicial : 'pendente',
            data_pagamento: i === 1 && statusInicial === 'pago' ? new Date().toISOString() : null
        };
    }
    
    const dadosCliente = {
        nome,
        marca,
        valor_total: valorTotal,
        dia_vencimento: diaVencimento,
        mes_referencia: mesReferencia,
        qtd_parcelas: qtdParcelas,
        valor_parcela: valorParcela,
        data_atualizacao: new Date().toISOString(),
        parcelas
    };
    
    try {
        if (id) {
            // Atualizar existente
            await clientesRef.child(id).update(dadosCliente);
        } else {
            // Novo cliente
            dadosCliente.data_cadastro = new Date().toISOString();
            await clientesRef.push(dadosCliente);
        }
        
        modalCliente.hide();
        console.log('✅ Cliente salvo com sucesso!');
        
    } catch (error) {
        console.error('Erro ao salvar:', error);
        alert('Erro ao salvar cliente!');
    }
}

async function excluirCliente(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    try {
        await clientesRef.child(id).remove();
        console.log('✅ Cliente excluído!');
    } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir cliente!');
    }
}

// ============================================
// GERENCIAR PARCELAS
// ============================================

function gerenciarParcelas(clienteId) {
    const cliente = todosClientes[clienteId];
    if (!cliente) return;
    
    document.getElementById('clienteNomeParcelas').textContent = cliente.nome;
    
    const container = document.getElementById('parcelasContainer');
    const parcelas = Object.entries(cliente.parcelas).sort((a, b) => a[1].numero - b[1].numero);
    
    container.innerHTML = parcelas.map(([key, parcela]) => {
        const statusOptions = ['pendente', 'pago', 'quitado', 'finalizando', 'inadimplente']
            .map(s => `<option value="${s}" ${parcela.status === s ? 'selected' : ''}>${s.toUpperCase()}</option>`)
            .join('');
        
        return `
            <div class="parcela-card">
                <div>
                    <strong>Parcela ${parcela.numero}</strong><br>
                    <small>Vencimento: ${formatarData(parcela.vencimento)}</small><br>
                    <small>Valor: R
