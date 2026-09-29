// Configurações e Estado Central
const CONDOMINIOS_RONDA = [
    "Arosa", "Baden", "Basel", "Biel", "Davos", "Eco Vila Genebra", "Fribourg", "Geneve", "Glarus",
    "La Vie", "Lauerz", "Lenk", "Lugano", "Luzern", "St. Moritz", "Vevey", "Zermatt", "Zurich"
].sort();

const CONDOMINIOS_PARADA = [
    "Arosa", "Baden", "Basel", "Bern", "Biel", "Botânico", "Davos", "Eco Vila Genebra",
    "Fribourg", "Geneve", "Glarus", "La Vie", "Lauerz", "Lenk", "Lugano", "Luzern",
    "Noville", "Office", "St. Moritz", "Vevey", "Villeneuve", "Zermatt", "Zurich"
].sort();

let registros = [];
let db;
let modoAtual = 'ronda'; // 'ronda' ou 'parada'
let modoOrdenacao = 'condominio';
let registroRemovido = null;
let timerToast = null;

const DEFAULT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxkI4vZmqzXZ-e1OJoEUWUcKC8VF7CJDy0f73eCAyike8lW94BygYrSWKCYlvBNpzJTWw/exec";

// ==========================================
// CONFIGURAÇÕES GLOBAIS (APLICADAS A TODAS AS MÁQUINAS)
// ==========================================

// Cole aqui a URL da Planilha (Totais)
const GLOBAL_GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzHWaOxa4wz_-mcMM3_K31j40wIqXorRIa-5MJNM-k13W2kaKl_oCV2Bf4h15ixlbx-/exec"; 

// Cole aqui o código JSON do Firebase (Substitua as aspas vazias pelo objeto)
const GLOBAL_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBvEUIegKZPa-GO9QHHsZJoJBJA7ghOi1Y",
  authDomain: "app-rondas-paradas.firebaseapp.com",
  projectId: "app-rondas-paradas",
  storageBucket: "app-rondas-paradas.firebasestorage.app",
  messagingSenderId: "543206289894",
  appId: "1:543206289894:web:5b9519c50bad038307a627"
}; 

// Nome da sessão padrão (se quiser que todas as máquinas conectem na mesma sessão automaticamente, ex: "SESSAO-UNICA")
const GLOBAL_DEFAULT_SESSION = ""; 

