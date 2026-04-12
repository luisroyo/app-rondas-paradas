// Configurações e Estado Central
const CONDOMINIOS = [
    "Arosa", "Associação Master", "Baden", "Basel", "Casarão", "Biel", "Botanico", "Davos", "Fribourg", 
    "Genebra", "Geneve", "Glarus", "La Vie", "Lauerz", "Lenk", "Lugano", "Luzern", 
    "Noville", "Office", "St. Moritz", "Vevey", "Villeneuve", "Zermatt", "Zurich"
];

let registros = [];
let db;
let modoAtual = 'ronda'; // 'ronda' ou 'parada'
let modoOrdenacao = 'condominio';
let registroRemovido = null;
let timerToast = null;
