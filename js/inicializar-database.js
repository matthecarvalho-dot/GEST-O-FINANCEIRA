// Inicializar estrutura do banco de dados
async function inicializarBancoDados() {
  console.log('🔄 Inicializando KRONOS SYSTEM...');
  
  const estruturaInicial = {
    clientes: {
      _exemplo: {
        dados_pessoais: {
          nome: "CLIENTE EXEMPLO LTDA",
          cpf_cnpj: "00.000.000/0001-00",
          telefone: "(11) 99999-9999",
          email: "contato@exemplo.com"
        },
        dados_financeiros: {
          marca: "MARCA DEMONSTRATIVA",
          valor_total: 5000.00,
          dia_vencimento: 5,
          quantidade_parcelas: 5,
          valor_parcela: 1000.00
        },
        parcelas: {
          parcela_001: {
            numero: 1,
            valor: 1000.00,
            vencimento: "2024-01-05",
            status: "pago",
            data_pagamento: "2024-01-04",
            valor_pago: 1000.00,
            forma_pagamento: "pix",
            observacao: "Pagamento pontual"
          },
          parcela_002: {
            numero: 2,
            valor: 1000.00,
            vencimento: "2024-02-05",
            status: "quitado",
            data_pagamento: "2024-02-01",
            valor_pago: 1000.00,
            forma_pagamento: "boleto",
            observacao: ""
          },
          parcela_003: {
            numero: 3,
            valor: 1000.00,
            vencimento: "2024-03-05",
            status: "finalizando",
            data_pagamento: null,
            valor_pago: 0,
            forma_pagamento: "",
            observacao: "Cliente negociando"
          },
          parcela_004: {
            numero: 4,
            valor: 1000.00,
            vencimento: "2024-04-05",
            status: "inadimplente",
            data_pagamento: null,
            valor_pago: 0,
            forma_pagamento: "",
            observacao: "Vencida há 30 dias"
          },
          parcela_005: {
            numero: 5,
            valor: 1000.00,
            vencimento: "2024-05-05",
            status: "pendente",
            data_pagamento: null,
            valor_pago: 0,
            forma_pagamento: "",
            observacao: ""
          }
        },
        status_geral: {
          status_atual: "finalizando",
          parcelas_pagas: 2,
          parcelas_em_aberto: 3,
          total_pago: 2000.00,
          total_em_aberto: 3000.00
        },
        datas_controle: {
          data_cadastro: new Date().toISOString(),
          mes_referencia: "2024-01",
          ano_referencia: 2024
        }
      }
    },
    configuracoes: {
      empresa: {
        nome: "KRONOS SYSTEM",
        sistema: "Gestão Financeira",
        versao: "1.0.0",
        created_at: new Date().toISOString()
      },
      status_parcela: {
        pago: { 
          cor: "#27ae60", 
          icone: "check-circle",
          descricao: "Pagamento realizado com sucesso" 
        },
        quitado: { 
          cor: "#c9a84c", 
          icone: "star",
          descricao: "Todas as parcelas foram quitadas" 
        },
        finalizando: { 
          cor: "#f39c12", 
          icone: "spinner",
          descricao: "Processo de pagamento em andamento" 
        },
        inadimplente: { 
          cor: "#e74c3c", 
          icone: "exclamation-triangle",
          descricao: "Pagamento em atraso" 
        },
        pendente: {
          cor: "#3498db",
          icone: "clock",
          descricao: "Aguardando pagamento"
        }
      },
      dias_vencimento: {
        dia_5: { 
          nome: "Dia 5",
          ativo: true, 
          descricao: "Vencimentos no dia 5 de cada mês" 
        },
        dia_20: { 
          nome: "Dia 20",
          ativo: true, 
          descricao: "Vencimentos no dia 20 de cada mês" 
        }
      },
      formas_pagamento: {
        pix: "PIX",
        boleto: "Boleto Bancário",
        cartao_credito: "Cartão de Crédito",
        cartao_debito: "Cartão de Débito",
        transferencia: "Transferência Bancária",
        dinheiro: "Dinheiro"
      }
    },
    contadores: {
      total_clientes: 1,
      total_parcelas: 5,
      total_parcelas_pagas: 2,
      total_recebido: 2000.00,
      total_em_aberto: 3000.00,
      por_status: {
        pago: 1,
        quitado: 1,
        finalizando: 1,
        inadimplente: 1,
        pendente: 1
      },
      ultima_atualizacao: new Date().toISOString()
    }
  };

  try {
    // Salvar toda a estrutura
    await database.ref('kronos_system').set(estruturaInicial);
    
    console.log('✅ Banco de dados inicializado com sucesso!');
    console.log('📊 Projeto:', firebaseConfig.projectId);
    console.log('🏢 Empresa: KRONOS SYSTEM');
    
    alert('✅ KRONOS SYSTEM inicializado com sucesso!\n\nProjeto: ' + firebaseConfig.projectId);
    
    // Recarregar a página
    setTimeout(() => {
      location.reload();
    }, 1500);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar:', error);
    alert('❌ Erro ao inicializar o banco de dados:\n\n' + error.message);
    return false;
  }
}

// Verificar se banco já existe
async function verificarBanco() {
  try {
    const snapshot = await database.ref('kronos_system').once('value');
    
    if (!snapshot.exists()) {
      console.log('🆕 Banco de dados vazio. Inicializando...');
      return await inicializarBancoDados();
    } else {
      console.log('✅ KRONOS SYSTEM já configurado!');
      console.log('📦 Dados encontrados:', snapshot.val());
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error);
    return false;
  }
}

// Executar verificação ao carregar
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔍 Verificando configuração do KRONOS SYSTEM...');
  verificarBanco();
});
