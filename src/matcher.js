// GLOBAL INTENT PATTERNS: Expressing a customer need or question (DEMANDA REAL)
const INTENT_PATTERNS = [
  // 1. Solicitud explícita de transporte / móvil / conductor
  /\b(?:busco|busca|buscando|necesito|requiero|preciso|solicito)\s+(?:un|una|alg[uú]n|algun|el|la|buen|buena)?\s*(?:radiotaxi|radio\s*taxi|taxi|uber|didi|indrive|movil|móvil|movilizaci[oó]n|transporte|carrera|carreras|chofer|auto|viaje|viajes|veh[ií]culo|delivery|encomienda|encomiendas)?\b/i,
  // 2. Preguntas sobre quién realiza servicios o viajes
  /\b(?:qui[eé]n|quien)\s+(?:hace|va\s+a|est[aá]\s+haciendo|viaja\s+a|sale\s+a)\s+(?:carreras?|viajes?|traslados?|fletes?|delivery|repartos?|encomiendas?)\b/i,
  /\balguien\s+(?:que\s+)?(?:hace|haga|vaya|viaje|est[eé]\s+disponible|disponible\s+para)\s+(?:carreras?|viajes?|traslados?|delivery|encomiendas?)\b/i,
  // 3. Solicitudes directas o urgentes
  /\bsolicitud\s+de\s+(?:m[oó]vil|movil|taxi|transporte|carreras?|viajes?)\b/i,
  /\b(?:alg[uú]n|algun)\s+(?:uber|taxi|radiotaxi|m[oó]vil|movil|chofer|auto|viaje|carrera|traslado)\s+(?:disponible|ahora|hoy|para|hacia|que|de\s+confianza|porfa|porfitas?)\b/i,
  /\b(?:alg[uú]n|algun|algunos|alguna)\s+(?:dato|contacto|número|numero|recomendaci[oó]n|recomendacion)\s+de\s+(?:radiotaxi|radio\s*taxi|taxi|uber|m[oó]vil|movil|chofer|carreras?|traslados?)\b/i,
  /\b(?:traslado|trasladarme|trasladar|ir\s+a|viajar\s+a|llegar\s+a)\s+(?:desde|hacia|a|urgente)\b/i,
  /\b(?:delivery|despacho|encomienda|encomiendas|paquete)\s+(?:urgente|para\s+llevar|para\s+traer)\b/i,
  /\b(?:d[oó]nde|donde)\s+(?:puedo\s+comprar|venden|hacen|encuentro|piden)\b/i,
  /\b(?:recomienden|recomiendenme|alguna\s+recomendaci[oó]n|qu[eé]\s+recomiendan)\b/i
];

// GLOBAL AD / SPAM EXCLUSION PATTERNS (OFERTA / PUBLICIDAD DE OTROS CHOFERES, PERMUTAS Y LOCALES)
const GLOBAL_AD_PATTERNS = [
  // Ofertas de choferes y taxis (Oferta de servicios)
  /\b(?:hago|hacemos|se\s+hacen|realizo|realizamos)\s+(?:carreras?|viajes?|traslados?|fletes?|delivery|repartos?|encomiendas?)\b/i,
  /\b(?:m[oó]vil|auto|chofer|veh[ií]culo|furg[oó]n|camioneta)\s+disponible\b/i,
  /\b(?:estoy|quedo|me\s+encuentro)\s+disponible\s+para\b/i,
  /\bdisponible\s+para\s+(?:fletes?|mudanzas?)\b/i,
  /\bdisponible\s+para\s+(?:carreras?|viajes?|traslados?|delivery)\s*(?:[,.]|\s*(?:consultas?|al\s+wsp|al\s+whatsapp|al\s+inbox|al\s+dm|escribir|\+?56))/i,
  /\bdisponibilidad\s+inmediata\b/i,
  /\b(?:haciendo|tirando)\s+(?:carreras?|viajes?|traslados?)\b/i,
  /\bcarreritas?\s+disponibles?\b/i,
  /\bauto\s+(?:con\s+chofer\s+)?disponible\b/i,
  /\b(?:voy\s+saliendo|salgo)\s+(?:a|para|hacia|con\s+cupo)\b/i,
  /\bcupos?\s+disponibles?\b/i,
  /\bviajes?\s+(?:especiales|dentro\s+y\s+fuera|al\s+aeropuerto|a\s+regiones)\b/i,
  /\btarifas?\s+(?:econ[oó]micas?|accesibles?|al\s+bolsillo)\b/i,
  /\bconsultas?\s+al\s+(?:wsp|whatsapp|dm|interno|inbox)\b/i,
  /\bhablar\s+al\s+(?:wsp|whatsapp|dm|interno)\b/i,
  /\bescr[ií]beme\s+al\b/i,
  /\bescribir\s+al\s+(?:wsp|whatsapp)\b/i,
  /\bagende\s+(?:su|tu)\s+(?:m[oó]vil|carrera|viaje|traslado)\b/i,
  /\bflota\s+de\s+m[oó]viles\b/i,
  /\bconductores\s+responsables\b/i,
  /\bconvenio\s+empresas\b/i,
  /\b(?:wsp|whatsapp|fono|celular|inbox|dm)[:\s]*\+?56?\s*9?\s*\d{4}/i,
  /\binteresados?\s*(?:al|por|escribir|comunicarse)\b/i,
  /\bcotice\b/i,
  /\bcotizaciones\b/i,
  // Terceros recomendando o avisos de permuta
  /\b(?:quiero|paso\s+a|vengo\s+a)\s+recomendar\b/i,
  /\brecomiendo\s+a\b/i,
  /\bpermut[ao]\b/i,
  // Publicidad comercial general
  /\bofrezco\s+(?:servicio|trabajo|mis\s+servicios|productos?)\b/i,
  /\bofrecemos\b/i,
  /\btenemos\s+(?:m[oó]viles|stock|promociones|disponibles)\b/i,
  /\bdisponibles?\s+las?\s*24\b/i,
  /\batenci[oó]n\s+las\s+24\b/i,
  /\bpide\s+tu\s+(?:m[oó]vil|pedido|orden)\b/i,
  /\bhaga\s+su\s+pedido\b/i,
  /\bse\s+vende\b/i,
  /\bvendo\b/i,
  /\bventa\s+de\s+(?:ropa|casa|departamento|terreno|auto|comida)\b/i,
  // Competidores y auto-promoción
  /\bradiotaxi\s+(?:fullexpress|full\s*express)\b/i,
  /\btaxifulla\b/i,
  /\brt\s*full\b/i
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

  // Check if text is a customer question asking for services
  if (!hasIntent && cleanText.includes('?')) {
    const questionIntent = /\b(?:alg[uú]n|algun|alguien|qui[eé]n|quien|d[oó]nde|donde|habr[aá]|saben|recomiendan|conocer[aá]n)\b/i;
    if (questionIntent.test(cleanText)) {
      hasIntent = true;
    }
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
