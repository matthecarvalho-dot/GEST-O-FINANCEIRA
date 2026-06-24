// Sistema KRONOS - Gestão Financeira
let currentFilter = {
    mes: '',
    dia: ''
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    atualizarData();
    carregarMeses();
    carregarClientes();
    atualizarContadores();
});

// Atualizar data atual
function atualizarData() {
    const agora = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('currentDate').textContent = agora.toLocaleDateString('pt-BR', options);
}

// Carregar meses disponíveis
function carregarMeses() {
    const mesSelect = document.getElementById('mesFiltro');
    const meses = [];
    const dataAtual = new Date();
    
    for (let i = -3; i <= 3; i++) {
        const data = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + i, 1);
        const valor = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        const nomeMes = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        meses.push({ valor, nomeMes });
    }
    
    meses.forEach(mes => {
        const option = document.createElement('option');
        option.value = mes.valor;
        option.textContent = mes.nomeMes.charAt(0).toUpperCase() + mes.nomeMes.slice(1);
        mesSelect.appendChild(option);
    });
}

// Salvar novo cliente
function salvarCliente() {
    const nome = document.getElementById('nomeCliente').value;
    const marca = document.getElementById('marca').value;
    const valorTotal = parseFloat(document.getElementById('valorTotal').value);
    const diaVencimento = parseInt(document.getElementById('diaVencimento').value);
    const mesReferencia = document.getElementById('mesReferencia').value;
    const qtdParcelas = parseInt(document.getElementById('qtdParcelas').value);
    const statusInicial = document.getElementById('statusInicial').value;
    
    if (!nome || !marca || !valorTotal || !mesReferencia || !qtdParcelas) {
        alert('Por favor, preencha todos os campos!');
        return;
    }
    
    const valorParcela = valorTotal / qtdParcelas;
    const parcelas = {};
    
    for (let i = 1; i <= qtdParcelas; i++) {
        const [ano, mes] = mesReferencia.split('-');
        const dataVencimento = new Date(ano, parseInt(mes) - 1 + (i - 1), diaVencimento);
        
        parcelas[`parcela${i}`] = {
            numero: i,
            valor: valorParcela,
            vencimento: dataVencimento.toISOString().split('T')[0],
            status: i === 1 ? statusInicial : 'pendente',
            dataPagamento: null
        };
    }
    
    const novoCliente = {
        nome: nome,
        marca: marca,
        valorTotal: valorTotal,
        parcelas: parcelas,
        dataCadastro: new Date().toISOString(),
        mesReferencia: mesReferencia,
        diaVencimento: diaVencimento,
        statusGeral: statusInicial === 'pago' ? 'pago' : 'pendente'
    };
    
    // Salvar no Firebase
    const clientesRef = database.ref('clientes');
    clientesRef.push(novoCliente)
        .then(() => {
            alert('Cliente cadastrado com sucesso!');
            fecharModal();
            carregarClientes();
            atualizarContadores();
        })
        .catch(error => {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar cliente!');
        });
}

// Carregar clientes
function carregarClientes() {
    const clientesRef = database.ref('clientes');
    
    clientesRef.on('value', (snapshot) => {
        const clientes = snapshot.val();
        const tbody = document.getElementById('clientesTableBody');
        tbody.innerHTML = '';
        
        if (!clientes) return;
        
        Object.entries(clientes).forEach(([id, cliente]) => {
            // Aplicar filtros
            if (currentFilter.mes && cliente.mesReferencia !== currentFilter.mes) return;
            if (currentFilter.dia && cliente.diaVencimento !== parseInt(currentFilter.dia)) return;
            
            const valorEmAberto = calcularValorEmAberto(cliente);
            const parcelasPagas = contarParcelasPagas(cliente);
            const statusGeral = determinarStatusGeral(cliente);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${cliente.nome}</strong></td>
                <td>${cliente.marca}</td>
                <td>R$ ${cliente.valorTotal.toFixed(2)}</td>
                <td>R$ ${valorEmAberto.toFixed(2)}</td>
                <td>${parcelasPagas}/${Object.keys(cliente.parcelas).length}</td>
                <td>${formatarVencimentos(cliente)}</td>
                <td><span class="badge-executive badge-${statusGeral.toLowerCase()}">${statusGeral}</span></td>
                <td>
                    <button class="btn btn-sm btn-light me-1" onclick="gerenciarParcelas('${id}')">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="removerCliente('${id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
}

// Funções auxiliares
function calcularValorEmAberto(cliente) {
    return Object.values(cliente.parcelas)
        .filter(p => p.status !== 'pago' && p.status !== 'quitado')
        .reduce((total, p) => total + p.valor, 0);
}

function contarParcelasPagas(cliente) {
    return Object.values(cliente.parcelas)
        .filter(p => p.status === 'pago' || p.status === 'quitado')
        .length;
}

function determinarStatusGeral(cliente) {
    const parcelas = Object.values(cliente.parcelas);
    const totalParcelas = parcelas.length;
    const parcelasPagas = parcelas.filter(p => p.status === 'pago' || p.status === 'quitado').length;
    const temInadimplente = parcelas.some(p => {
        const dataVencimento = new Date(p.vencimento);
        const hoje = new Date();
        return p.status === 'pendente' && dataVencimento < hoje;
    });
    
    if (parcelasPagas === totalParcelas) return 'QUITADO';
    if (temInadimplente) return 'INADIMPLENTE';
    if (parcelasPagas > 0) return 'FINALIZANDO';
    return 'PENDENTE';
}

function formatarVencimentos(cliente) {
    const vencimentos = Object.values(cliente.parcelas)
        .map(p => new Date(p.vencimento))
        .sort((a, b) => a - b);
    
    if (vencimentos.length === 0) return '-';
    return `${vencimentos[0].toLocaleDateString('pt-BR')} até ${vencimentos[vencimentos.length - 1].toLocaleDateString('pt-BR')}`;
}

// Atualizar contadores
function atualizarContadores() {
    const clientesRef = database.ref('clientes');
    
    clientesRef.once('value', (snapshot) => {
        const clientes = snapshot.val();
        if (!clientes) return;
        
        const contadores = {
            pago: 0,
            quitado: 0,
            finalizando: 0,
            inadimplente: 0
        };
        
        Object.values(clientes).forEach(cliente => {
            const status = determinarStatusGeral(cliente).toLowerCase();
            if (contadores[status] !== undefined) {
                contadores[status]++;
            }
        });
        
        document.getElementById('countPago').textContent = contadores.pago;
        document.getElementById('countQuitado').textContent = contadores.quitado;
        document.getElementById('countFinalizando').textContent = contadores.finalizando;
        document.getElementById('countInadimplente').textContent = contadores.inadimplente;
    });
}

// Filtrar clientes
function filtrarClientes() {
    currentFilter.mes = document.getElementById('mesFiltro').value;
    currentFilter.dia = document.getElementById('diaFiltro').value;
    carregarClientes();
}

// Gerenciar parcelas (simplificado)
function gerenciarParcelas(clienteId) {
    const clienteRef = database.ref(`clientes/${clienteId}`);
    
    clienteRef.once('value', (snapshot) => {
        const cliente = snapshot.val();
        const parcelas = Object.entries(cliente.parcelas);
        
        let mensagem = `Parcelas de ${cliente.nome}:\n\n`;
        parcelas.forEach(([key, parcela]) => {
            const status = parcela.status.toUpperCase();
            mensagem += `Parcela ${parcela.numero}: R$ ${parcela.valor.toFixed(2)} - ${status}\n`;
        });
        
        const numeroParcela = prompt(mensagem + '\nDigite o número da parcela para alterar status:');
        if (!numeroParcela) return;
        
        const novoStatus = prompt('Novo status (pago/quitado/finalizando/inadimplente):');
        if (!novoStatus) return;
        
        clienteRef.child(`parcelas/parcela${numeroParcela}/status`).set(novoStatus.toLowerCase())
            .then(() => {
                if (novoStatus.toLowerCase() === 'pago') {
                    clienteRef.child(`parcelas/parcela${numeroParcela}/dataPagamento`)
                        .set(new Date().toISOString());
                }
                alert('Status atualizado!');
                carregarClientes();
                atualizarContadores();
            });
    });
}

// Remover cliente
function removerCliente(clienteId) {
    if (confirm('Tem certeza que deseja remover este cliente?')) {
        database.ref(`clientes/${clienteId}`).remove()
            .then(() => {
                carregarClientes();
                atualizarContadores();
            });
    }
}

// Controles do modal
function abrirModalCliente() {
    const modal = new bootstrap.Modal(document.getElementById('clienteModal'));
    modal.show();
}

function fecharModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('clienteModal'));
    modal.hide();
    document.getElementById('clienteForm').reset();
}
