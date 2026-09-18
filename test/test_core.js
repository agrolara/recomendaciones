import { matchPostToCampaign } from '../src/matcher.js';
import { generateAiReply } from '../src/ai.js';
import { DEFAULT_CAMPAIGNS } from '../src/defaultCampaigns.js';
import assert from 'assert';

console.log("=== INICIANDO PRUEBAS UNITARIAS DE RECOMENDACIONES AI ===");

// TEST 1: Taxi matching
const taxiPost = "Hola vecinos, necesito algún taxi o uber urgente para trasladarme desde Valle Lo Campino al centro";
const taxiMatch = matchPostToCampaign(taxiPost, DEFAULT_CAMPAIGNS);
assert.strictEqual(taxiMatch.isMatch, true, "Debe hacer match con solicitud de taxi");
assert.strictEqual(taxiMatch.campaign.id, "camp_radiotaxi", "Debe asignar la campaña Radio Taxi");
console.log("✅ Test 1 Superado: Match correcto para Radio Taxi");

// TEST 2: Food matching (Peruana)
const foodPost = "Buenas tardes, algún dato de buena comida peruana o ceviche con delivery?";
const foodMatch = matchPostToCampaign(foodPost, DEFAULT_CAMPAIGNS);
assert.strictEqual(foodMatch.isMatch, true, "Debe hacer match con comida peruana");
assert.strictEqual(foodMatch.campaign.id, "camp_peruana", "Debe asignar la campaña Comida Peruana");
console.log("✅ Test 2 Superado: Match correcto para Comida Peruana");

// TEST 3: Sushi matching
const sushiPost = "Hola, recomienden algún lugar rico para pedir sushi y handroll hoy?";
const sushiMatch = matchPostToCampaign(sushiPost, DEFAULT_CAMPAIGNS);
assert.strictEqual(sushiMatch.isMatch, true, "Debe hacer match con sushi");
assert.strictEqual(sushiMatch.campaign.id, "camp_sushi", "Debe asignar la campaña Sushi");
console.log("✅ Test 3 Superado: Match correcto para Sushi Master");

// TEST 4: Ad rejection
const adPost = "Ofrecemos servicios de fletes y mudanzas en todo Santiago, disponibles las 24 horas, cotice al wsp";
const adMatch = matchPostToCampaign(adPost, DEFAULT_CAMPAIGNS);
assert.strictEqual(adMatch.isMatch, false, "Los anuncios deben ser descartados automáticamente");
console.log("✅ Test 4 Superado: Descarte automático de publicidad ajena");

// TEST 5: Template generation in 3rd person and NO "fletes"
const taxiReply = await generateAiReply({
  authorName: "Angui Lls",
  postText: "Algún taxi que trabaje ahora porfitas",
  campaign: DEFAULT_CAMPAIGNS.find(c => c.id === 'camp_radiotaxi')
});
assert.ok(taxiReply.reply.includes("Angui"), "Debe saludar al autor");
assert.ok(taxiReply.reply.includes("@radiotaxi fullexpress"), "Debe mencionar la marca");
assert.ok(taxiReply.reply.includes("+56 9 3024 7992"), "Debe incluir el teléfono");
assert.ok(!taxiReply.reply.toLowerCase().includes("flete"), "NUNCA debe mencionar fletes");
console.log("✅ Test 5 Superado: Respuesta generada en 3ra persona y sin mención de fletes");
console.log("   Ejemplo generado:", taxiReply.reply);

console.log("\n🎉 ¡TODAS LAS PRUEBAS UNITARIAS PASARON CON ÉXITO!");
