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
  },
  {
    id: "camp_peruana",
    name: "Cevichería El Sol - Cocina Peruana",
    category: "Gastronomía",
    icon: "🇵🇪",
    brand_name: "Cevichería & Restaurante El Sol",
    brand_tag: "@elsolperuano",
    phone: "+56 9 7845 1290",
    keywords: [
      "comida peruana", "ceviche", "lomo saltado", "ají de gallina", "aji de gallina",
      "arroz chaufa", "suspiro limeño", "restaurante peruano", "delivery peruano",
      "almuerzo peruano", "mariscos", "leche de tigre"
    ],
    negative_keywords: [
      "ofrecemos almuerzos", "menu diario $", "se vende", "taxi", "fletes"
    ],
    highlights: "Ceviche mixto tradicional, lomo saltado al wok y gastronomía auténtica a domicilio",
    restrictions: "Enfocarse en sabor tradicional, frescura de los mariscos y rapidez de entrega.",
    template_reply: "Hola {nombre}! Te recomiendo muchísimo a @elsolperuano. Tienen un ceviche mixto y un lomo saltado increíbles, porciones contundentes y el delivery llega rapidísimo. Puedes pedirles al +56 9 7845 1290.",
    prompt_instructions: "Recomienda con entusiasmo el restaurante peruano El Sol. Destaca que los platos son contundentes, frescos y deliciosos. Siempre en 3ra persona.",
    is_active: true
  },
  {
    id: "camp_sushi",
    name: "Sushi Master Quilicura",
    category: "Gastronomía",
    icon: "🍣",
    brand_name: "Sushi Master Quilicura",
    brand_tag: "@sushimaster_cl",
    phone: "+56 9 6521 4488",
    keywords: [
      "sushi", "handroll", "hand roll", "rolls", "promo sushi", "tablas de sushi",
      "piezas de sushi", "tempura", "delivery sushi", "antojo de sushi", "sushi delivery"
    ],
    negative_keywords: [
      "ofrezco promo sushi", "tenemos sushi", "local abierto", "taxi"
    ],
    highlights: "Rolls calientes crocantes, tablas XL para compartir y delivery express",
    restrictions: "Enfocarse en excelente relación precio-calidad, empaque impecable y rapidez.",
    template_reply: "Hola {nombre}! Te sugiero probar @sushimaster_cl. Tienen unas promos buenísimas de tablas y handrolls, los envíos llegan calentitos y el pescado súper fresco. El WhatsApp de pedidos es +56 9 6521 4488.",
    prompt_instructions: "Recomienda Sushi Master Quilicura en tercera persona. Menciona sus excelentes promociones de tablas y la rapidez del delivery.",
    is_active: true
  },
  {
    id: "camp_pizza",
    name: "Pizzería Artesanal Di Napoli",
    category: "Gastronomía",
    icon: "🍕",
    brand_name: "Pizzería Artesanal Di Napoli",
    brand_tag: "@dinapolipizza",
    phone: "+56 9 5532 9911",
    keywords: [
      "pizza", "pizzas", "pizzería", "pizzeria", "pizza a la piedra",
      "pizza familiar", "delivery pizza", "antojo de pizza", "pizza napolitana"
    ],
    negative_keywords: [
      "ofrecemos pizzas", "abierto hasta las", "vendo horno", "taxi"
    ],
    highlights: "Masa madre fermentada 48h a la piedra, mozzarella premium e ingredientes italianos",
    restrictions: "Enfocarse en la textura de la masa a la piedra crujiente y quesos de calidad.",
    template_reply: "Hola {nombre}! Si buscas buena pizza, te recomiendo 100% a @dinapolipizza. La masa es a la piedra auténtica y traen abundante queso. Te atienden al toque en el +56 9 5532 9911.",
    prompt_instructions: "Recomienda la pizzería Di Napoli como vecino en tercera persona. Destaca la calidad de la masa a la piedra y los ingredientes abundantes.",
    is_active: true
  },
  {
    id: "camp_gasfiter",
    name: "Gasfitería Express Lo Campino",
    category: "Hogar",
    icon: "🔧",
    brand_name: "Gasfitería Express Lo Campino",
    brand_tag: "@gasfiter_lo_campino",
    phone: "+56 9 4412 7700",
    keywords: [
      "gasfiter", "gásfiter", "gasfiteria", "gasfitería", "fuga de agua",
      "destape", "cañería", "cañeria", "calefon", "calefón", "filtración",
      "filtracion", "llave de paso", "alcantarillado"
    ],
    negative_keywords: [
      "ofrezco mis servicios de gasfiter", "realizo trabajos", "vendo herramientas"
    ],
    highlights: "Certificado SEC, emergencias de fugas y destapes con garantía escrita",
    restrictions: "Enfocarse en honestidad, rapidez para urgencias y trabajos garantizados.",
    template_reply: "Hola {nombre}! Te recomiendo al maestro de @gasfiter_lo_campino. Es certificado, súper honesto con los precios y viene rápido para urgencias. Lo puedes contactar directo al +56 9 4412 7700.",
    prompt_instructions: "Recomienda al gásfiter certificado en tercera persona. Resalta la seriedad, honradez y rapidez para solucionar problemas en el hogar.",
    is_active: true
  }
];
