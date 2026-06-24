// KRONOS SYSTEM - Configuração Firebase
// Projeto: kronos-gestao-fincanceira

// Configuração do Firebase (SUAS CREDENCIAIS)
const firebaseConfig = {
  apiKey: "AIzaSyD6Mv3DiNGWCoC4Rd0iOt6L22qxnS-XAhY",
  authDomain: "kronos-gestao-fincanceira.firebaseapp.com",
  databaseURL: "https://kronos-gestao-fincanceira-default-rtdb.firebaseio.com",
  projectId: "kronos-gestao-fincanceira",
  storageBucket: "kronos-gestao-fincanceira.firebasestorage.app",
  messagingSenderId: "26146570774",
  appId: "1:26146570774:web:0ca1bdf457eae2623eeb37",
  measurementId: "G-B7SWGH8945"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referências do banco de dados
const database = firebase.database();
const clientesRef = database.ref('kronos_system/clientes');
const configuracoesRef = database.ref('kronos_system/configuracoes');

// Verificar conexão em tempo real
database.ref('.info/connected').on('value', (snap) => {
  if (snap.val() === true) {
    console.log('🔥 KRONOS SYSTEM - Conectado ao Firebase!');
    console.log('📊 Projeto: kronos-gestao-fincanceira');
  } else {
    console.log('❌ KRONOS SYSTEM - Desconectado do Firebase!');
  }
});

console.log('✅ KRONOS SYSTEM - Configuração carregada com sucesso!');
