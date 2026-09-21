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

// TEST 2: Delivery / Encomienda matching for Radio Taxi
const deliveryPost = "Hola buenas tardes, ¿alguien disponible para delivery o llevar una encomienda urgente?";
const deliveryMatch = matchPostToCampaign(deliveryPost, DEFAULT_CAMPAIGNS);
assert.strictEqual(deliveryMatch.isMatch, true, "Debe hacer match con solicitud de encomienda");
assert.strictEqual(deliveryMatch.campaign.id, "camp_radiotaxi", "Debe asignar la campaña Radio Taxi");
console.log("✅ Test 2 Superado: Match correcto para encomienda/delivery en Radio Taxi");

// TEST 3: Driver ad rejection (carreritas / auto disponible)
const driverAdPost = "Carreritas disponibles en Quilicura, auto cómodo con chofer, consultas al wsp +56987654321";
const driverAdMatch = matchPostToCampaign(driverAdPost, DEFAULT_CAMPAIGNS);
assert.strictEqual(driverAdMatch.isMatch, false, "Los avisos de choferes deben ser descartados automáticamente");
console.log("✅ Test 3 Superado: Descarte automático de chofer ofreciendo carreritas/viajes");

// TEST 4: Third-party recommendation / commercial barter rejection
const recommendPost = "Quiero recomendar a Francisca por el sushi tan rico que pedí hoy al 100%";
const recommendMatch = matchPostToCampaign(recommendPost, DEFAULT_CAMPAIGNS);
assert.strictEqual(recommendMatch.isMatch, false, "Las recomendaciones de terceros o permutas no son solicitudes de clientes");
console.log("✅ Test 4 Superado: Descarte automático de recomendaciones de terceros");

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
