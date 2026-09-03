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
