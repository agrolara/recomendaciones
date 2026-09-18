# 🌟 Recomendaciones AI (LeadRadar Multifuncional)

Plataforma inteligente de detección de demanda en grupos de Facebook, clasificación multifuncional de solicitudes de clientes y recomendación dinámica en tercera persona asistida por IA (OpenRouter).

Desplegada en **Coolify** (`https://recomendaciones.agrolara.dedyn.io`) con base de datos **Supabase** autohospedada y automatización local mediante el perfil personal de Facebook del usuario.

---

## 🚀 Características Principales

1. **Multifuncionalidad Total (Gestor de Campañas & Clientes):**
   - Configura cualquier cantidad de servicios o productos a recomendar:
     - 🚖 **Radio Taxi Full Express** (Traslados 24/7, encomiendas, delivery — *sin fletes*).
     - 🇵🇪 **Cevichería El Sol - Cocina Peruana** (Ceviches, lomo saltado a domicilio).
     - 🍣 **Sushi Master Quilicura** (Rolls tempura, tablas XL express).
     - 🍕 **Pizzería Di Napoli** (Masa madre a la piedra).
     - 🔧 **Gasfitería Express Lo Campino** (Urgencias, destapes y fugas de agua).
   - Palabras clave personalizadas, exclusiones de publicidad, número de WhatsApp y restricciones estrictas por cliente.

2. **Generación con Inteligencia Artificial (OpenRouter):**
   - Soporte para modelos de lenguaje económicos y de alto rendimiento:
     - `deepseek/deepseek-chat` (DeepSeek V3, ~$0.14 / 1M tokens)
     - `meta-llama/llama-3.3-70b-instruct` (~$0.30 / 1M tokens)
     - `google/gemini-flash-1.5` (~$0.075 / 1M tokens)
     - `anthropic/claude-3-haiku` (~$0.25 / 1M tokens)
   - Redacción obligatoria en **Tercera Persona**: actúa como un vecino satisfecho que recomienda el servicio de su cliente.
   - Filtro de seguridad que elimina palabras prohibidas (ej: *fletes* en taxis).
   - Fallback determinístico inteligente si no hay API Key configurada.

3. **Radar de Solicitudes en Tiempo Real:**
   - Detección precisa de permalinks de publicaciones directas (`/posts/<id>/`).
   - Ordenamiento estricto de menor tiempo a mayor tiempo (más recientes primero).
   - Insignia verde de **Presencia Activa** para publicaciones de 1 a 2 horas.
   - Publicación en 1 clic utilizando el perfil personal del usuario en Facebook.

4. **Infraestructura Cloud + Agente Local:**
   - **Cloud:** Despliegue en VPS con Coolify y base de datos Supabase / PostgreSQL.
   - **Local:** Integración con OpenCLI para publicar comentarios de forma 100% segura sin bloqueos de IP.

---

## 🛠️ Despliegue en Coolify

- **Servidor:** VPS Hetzner / Coolify (`http://148.116.104.222:8000`)
- **Dominio:** `https://recomendaciones.agrolara.dedyn.io`
- **Base de Datos:** PostgreSQL en `supabase-db:5432` / Supabase Kong `https://supabase.agrolara.dedyn.io`

---

## 📦 Ejecución Local

```bash
npm install
npm start
# Abre http://localhost:3000
```
