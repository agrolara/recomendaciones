import { getSettings } from './db.js';

export const SUPPORTED_AI_MODELS = [
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3 (Recomendado · Ultra Económico)", cost: "~$0.14 / 1M tokens" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B (Excelente Calidad · Económico)", cost: "~$0.30 / 1M tokens" },
  { id: "google/gemini-flash-1.5", name: "Google Gemini 1.5 Flash (Súper Rápido)", cost: "~$0.075 / 1M tokens" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku (Rápido y Conciso)", cost: "~$0.25 / 1M tokens" }
];

/**
 * Generates an AI recommendation reply for a detected Facebook lead.
 * Always writes in THIRD PERSON, honors campaign restrictions, and falls back gracefully.
 */
export async function generateAiReply({ authorName, postText, campaign }) {
  const settings = await getSettings();
  const apiKey = settings.openrouter_api_key?.trim();
  const model = settings.openrouter_model?.trim() || "deepseek/deepseek-chat";

  const firstName = (authorName || 'Vecino').split(' ')[0];

  // 1. Fallback Template Builder
  const buildTemplateFallback = () => {
    let text = campaign.template_reply || `Hola {nombre}! Te recomiendo a {marca}. Tienen excelente servicio, contáctalos al {telefono}.`;
    text = text.replace(/{nombre}/gi, firstName)
               .replace(/{marca}/gi, campaign.brand_tag || campaign.brand_name)
               .replace(/{telefono}/gi, campaign.phone || '')
               .replace(/{servicios}/gi, campaign.highlights || '');

    // Safety enforce: zero forbidden words
    if (campaign.id === 'camp_radiotaxi' || campaign.name.toLowerCase().includes('taxi')) {
      text = text.replace(/\bfletes?\b/gi, 'traslados y encomiendas');
    }
    return {
      reply: text,
      modelUsed: "template_deterministic",
      isAi: false
    };
  };

  // If no API key configured, use deterministic template immediately
  if (!apiKey) {
    return buildTemplateFallback();
  }

  // 2. OpenRouter API Call
  try {
    const systemPrompt = `Eres un redactor experto en recomendaciones de servicios locales en grupos de Facebook de Chile (Quilicura, Valle Lo Campino, Valle Grande, Santiago).
El usuario publicará desde su perfil PERSONAL de Facebook para responder a un vecino que busca un servicio.

REGLAS OBLIGATORIAS (VIOLARLAS INVALIDA LA RESPUESTA):
1. ESCRIBE ESTRICTAMENTE EN TERCERA PERSONA: Eres un vecino recomendando a un tercero ("Te recomiendo a...", "Ellos atienden...", "Tienen excelente servicio...").
   - NUNCA uses la primera persona ("yo hago", "hacemos", "ofrezco", "tenemos").
2. RESPETAR RESTRICCIONES DE LA CAMPAÑA:
   ${campaign.restrictions ? `ADVERTENCIA CRÍTICA: ${campaign.restrictions}` : ''}
   - Si la campaña es de Radio Taxi: ESTÁ TERMINANTEMENTE PROHIBIDO usar la palabra 'flete' o 'fletes'. Solo traslados de personas, delivery de cosas y encomiendas.
3. DATOS DEL CLIENTE A RECOMENDAR:
   - Marca / Mención: ${campaign.brand_tag || campaign.brand_name}
   - Teléfono / WhatsApp de contacto: ${campaign.phone || 'No especificado'}
   - Especialidad: ${campaign.highlights || ''}
4. ESTILO Y FORMATO:
   - Saluda al autor por su primer nombre (${firstName}).
   - Tono cercano, amable, creíble y 100% chileno educado.
   - Longitud máxima: 2 a 3 oraciones breves y directas.
   - Devuelve ÚNICAMENTE el texto final del comentario, sin comillas adicionales ni explicaciones previas.`;

    const userPrompt = `Publicación del vecino ${authorName}:
"${postText}"

Campaña asignada: ${campaign.name} (${campaign.category})
Instrucciones específicas de la campaña: ${campaign.prompt_instructions || 'Recomienda con confianza.'}

Redacta el comentario de recomendación en tercera persona ahora:`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://recomendaciones.agrolara.dedyn.io",
        "X-Title": "Recomendaciones AI Platform",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[AI Engine] OpenRouter error HTTP ${response.status}:`, errText);
      return buildTemplateFallback();
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply || reply.length < 15) {
      return buildTemplateFallback();
    }

    // Clean up any extraneous quotes or prefixes
    reply = reply.replace(/^["']|["']$/g, '').trim();

    // Final safety audit: if radiotaxi, verify no "flete"
    if (campaign.id === 'camp_radiotaxi' || campaign.name.toLowerCase().includes('taxi')) {
      reply = reply.replace(/\bfletes?\b/gi, 'traslados y encomiendas');
    }

    return {
      reply: reply,
      modelUsed: model,
      isAi: true
    };
  } catch (err) {
    console.error("[AI Engine] Excepción llamando a OpenRouter:", err.message);
    return buildTemplateFallback();
  }
}

/**
 * Tests an OpenRouter API key with a sample prompt.
 */
export async function testOpenRouterKey(apiKey, model = "deepseek/deepseek-chat") {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://recomendaciones.agrolara.dedyn.io",
        "X-Title": "Recomendaciones AI Key Test",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "user", content: "Di 'Conexión exitosa con OpenRouter' y tu modelo en una frase corta." }
        ],
        max_tokens: 40
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: `Error ${response.status}: ${errorData}` };
    }

    const data = await response.json();
    return {
      success: true,
      message: data.choices?.[0]?.message?.content?.trim() || "OK",
      model: model
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
