// GLOBAL INTENT PATTERNS: Expressing a customer need or question
const INTENT_PATTERNS = [
  /\b(?:busco|busca|buscando|necesito|requiero|preciso|solicito)\s+(?:un|una|alg[uú]n|algun|el|la|buen|buena)?\s*(?:radiotaxi|radio\s*taxi|taxi|uber|didi|indrive|movil|móvil|movilizaci[oó]n|transporte|carrera|carreras|chofer|auto|viaje|viajes|veh[ií]culo|delivery|encomienda|encomiendas)?\b/i,
  /\b(?:alg[uú]n|algun|algunos|alguna)\s+(?:dato|lugar|contacto|número|numero|picada|local|recomendaci[oó]n|recomendacion)\b/i,
  /\b(?:qui[eé]n|quien)\s+(?:hace|va\s+a|est[aá]\s+haciendo|viaja\s+a|sale\s+a)\s+(?:carreras?|viajes?|traslados?|fletes?|delivery|repartos?)\b/i,
  /\balguien\s+(?:que\s+)?(?:hace|haga|vaya|viaje|est[eé]\s+disponible|disponible\s+para)\s+(?:carreras?|viajes?|traslados?|delivery|encomiendas?)\b/i,
  /\bsolicitud\s+de\s+(?:m[oó]vil|movil|taxi|transporte|carreras?|viajes?)\b/i,
  /\b(?:alg[uú]n|algun|necesito|busco)\s+(?:uber|taxi|radiotaxi|m[oó]vil|movil|chofer|auto|viaje|carrera|traslado)\b/i,
  /\b(?:traslado|trasladarme|trasladar|ir\s+a|viajar\s+a|llegar\s+a)\s+(?:desde|hacia|a|urgente)\b/i,
  /\b(?:delivery|despacho|encomienda|encomiendas|paquete)\s+(?:urgente|disponible|para|a)\b/i,
  /\b(?:d[oó]nde|donde)\s+(?:puedo\s+comprar|venden|hacen|encuentro|piden)\b/i,
  /\b(?:recomienden|recomiendenme|recomendar|alguna\s+recomendaci[oó]n)\b/i
];

// GLOBAL AD / SPAM EXCLUSION PATTERNS
const GLOBAL_AD_PATTERNS = [
  /\bofrezco\s+(?:servicio|trabajo|mis\s+servicios|productos?)\b/i,
  /\bofrecemos\b/i,
  /\btenemos\s+(?:m[oó]viles|stock|promociones|disponibles)\b/i,
  /\bdisponibles?\s+las?\s*24\b/i,
  /\batenci[oó]n\s+las\s+24\b/i,
  /\bpide\s+tu\s+(?:m[oó]vil|pedido|orden)\b/i,
  /\bhaga\s+su\s+pedido\b/i,
  /\bse\s+vende\b/i,
  /\bvendo\b/i,
  /\bventa\s+de\s+(?:ropa|casa|departamento|terreno|auto)\b/i,
  /\bflota\s+de\s+m[oó]viles\b/i,
  /\bconductores\s+responsables\b/i,
  /\bconvenio\s+empresas\b/i
];

/**
 * Evaluates a Facebook post content against active campaigns.
 */
export function matchPostToCampaign(text, campaigns) {
  if (!text || text.trim().length < 10) {
    return { isMatch: false, reason: "Texto muy corto" };
  }

  const cleanText = text.toLowerCase();

  // 1. Check Global Ad Exclusions
  for (const adPattern of GLOBAL_AD_PATTERNS) {
    if (adPattern.test(cleanText)) {
      return { isMatch: false, reason: "Descartado: Publicidad o aviso de venta detectado" };
    }
  }

  // 2. Check Intent of Request / Need
  let hasIntent = false;
  for (const intentPattern of INTENT_PATTERNS) {
    if (intentPattern.test(cleanText)) {
      hasIntent = true;
      break;
    }
  }

  // Also check if text contains question marks or short urgent query
  if (!hasIntent && (cleanText.includes('?') || cleanText.length < 90)) {
    // If it mentions specific service directly (e.g. "Algún taxi ahora"), allow
    hasIntent = true;
  }

  if (!hasIntent) {
    return { isMatch: false, reason: "No expresa solicitud directa de cliente" };
  }

  // 3. Match Against Active Campaigns
  let bestCampaign = null;
  let highestScore = 0;
  let matchedKeyword = null;

  for (const camp of campaigns) {
    if (!camp.is_active) continue;

    // Check campaign-specific negative keywords
    let excluded = false;
    if (Array.isArray(camp.negative_keywords)) {
      for (const neg of camp.negative_keywords) {
        if (neg && cleanText.includes(neg.toLowerCase())) {
          excluded = true;
          break;
        }
      }
    }
    if (excluded) continue;

    // Calculate match score
    let score = 0;
    let localMatchedKw = null;

    if (Array.isArray(camp.keywords)) {
      for (const kw of camp.keywords) {
        if (!kw) continue;
        const kwLower = kw.toLowerCase().trim();
        const regex = new RegExp(`\\b${kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(cleanText)) {
          // Phrase match gives higher score
          score += kwLower.includes(' ') ? 10 : 5;
          if (!localMatchedKw) localMatchedKw = kw;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestCampaign = camp;
      matchedKeyword = localMatchedKw;
    }
  }

  if (bestCampaign && highestScore > 0) {
    return {
      isMatch: true,
      campaign: bestCampaign,
      matchedKeyword: matchedKeyword,
      score: highestScore
    };
  }

  return { isMatch: false, reason: "No coincidió con las palabras clave de ninguna campaña activa" };
}
