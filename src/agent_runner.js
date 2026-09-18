import { runScanner } from './scanner.js';
import { publishComment } from './commenter.js';

const REMOTE_URL = process.env.REMOTE_URL || 'https://recomendaciones.agrolara.dedyn.io';

console.log("=================================================");
console.log("🚀 Agente Local de Automatización Facebook");
console.log(`🌐 Servidor Cloud: ${REMOTE_URL}`);
console.log("=================================================");

const arg = process.argv[2];

if (arg === '--scan') {
  console.log("[Agente Local] Ejecutando escaneo en vivo con sesión de Facebook local...");
  runScanner().then(async res => {
    console.log("[Agente Local] Escaneo finalizado. Resultado:", res);
    process.exit(0);
  }).catch(err => {
    console.error("[Agente Local] Error:", err.message);
    process.exit(1);
  });
} else if (arg === '--comment') {
  const postId = process.argv[3];
  const postUrl = process.argv[4];
  const text = process.argv[5];
  if (!postUrl || !text) {
    console.error("Uso: node src/agent_runner.js --comment <postId> <postUrl> <text>");
    process.exit(1);
  }
  publishComment({ postId, postDirectUrl: postUrl, commentText: text }).then(res => {
    console.log("[Agente Local] Comentario publicado:", res);
    process.exit(0);
  }).catch(err => {
    console.error("[Agente Local] Error comentando:", err.message);
    process.exit(1);
  });
} else {
  console.log("Uso:");
  console.log("  node src/agent_runner.js --scan                (Rastrea Facebook y guarda leads)");
  console.log("  node src/agent_runner.js --comment <id> <url> <txt> (Publica recomendación)");
}
