export const DEFAULT_CAMPAIGNS = [
  {
    id: "camp_radiotaxi",
    name: "Radio Taxi Full Express",
    category: "Transporte",
    icon: "🚖",
    brand_name: "Radio Taxi Full Express",
    brand_tag: "@radiotaxi fullexpress",
    phone: "+56 9 3024 7992",
    keywords: [
      "uber", "taxi", "radiotaxi", "radio taxi", "movil", "móvil",
      "carrera", "carreras", "traslado", "traslados", "chofer", "auto",
      "vehículo", "delivery", "encomienda", "encomiendas"
    ],
    negative_keywords: [
      "ofrezco servicio", "ofrecemos", "disponibles 24", "atención las 24",
      "tenemos móviles", "nuestros móviles", "pide tu móvil", "agende su",
      "flota de móviles", "conductores responsables", "taxifulla", "rt full",
      "flete", "fletes", "camión", "mudanza"
    ],
    highlights: "Traslados de personas, delivery de cosas y transporte de encomiendas las 24 horas",
    restrictions: "ESTRICTAMENTE PROHIBIDO mencionar fletes o camiones. Solo traslados de personas, delivery de cosas y encomiendas.",
    template_reply: "Hola {nombre}! Te recomiendo a @radiotaxi fullexpress. Ellos hacen traslados de personas, delivery de cosas y transporte de encomiendas las 24 horas. Son súper puntuales y confiables, este es su número: +56 9 3024 7992.",
    prompt_instructions: "Recomienda a Radio Taxi Full Express como vecino satisfecho en tercera persona. Destaca puntualidad y seguridad. Bajo ninguna circunstancia uses la palabra 'flete' o 'fletes'.",
    is_active: true
  }
];
