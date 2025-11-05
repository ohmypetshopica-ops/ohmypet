// supabase/functions/send-whatsapp/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Función 'send-whatsapp' iniciada.");

serve(async (req) => {
  // Manejar la solicitud PREFLIGHT de CORS (necesario para llamadas desde el navegador/otras funciones)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Obtener los datos de la solicitud (a quién y qué enviar)
    const { to, body } = await req.json();

    // Validar datos de entrada
    if (!to) {
      throw new Error("El parámetro 'to' (número de destino) es obligatorio.");
    }
    if (!body) {
      throw new Error("El parámetro 'body' (mensaje) es obligatorio.");
    }

    // 2. Obtener las credenciales secretas de Twilio (¡NUNCA las escribas aquí!)
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      throw new Error("Faltan las variables de entorno de Twilio en Supabase.");
    }

    // 3. Preparar la llamada a la API de Twilio
    const twilioUrl = https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json;

    // Formatear el número de destino para WhatsApp (ej: "whatsapp:‪+51987654321‬")
    const formattedTo = whatsapp:${to};
    // Formatear el número de origen de Twilio (ej: "whatsapp:‪+14155238886‬")
    const formattedFrom = whatsapp:${TWILIO_WHATSAPP_NUMBER};

    // 4. Crear la "llave" de autorización (Basic Auth)
    const authToken = btoa(${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN});
    const authHeader = Basic ${authToken};

    // 5. Enviar la solicitud a Twilio
    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedTo,
        From: formattedFrom,
        Body: body,
      }),
    });

    // 6. Revisar la respuesta de Twilio
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error de Twilio:", errorData);
      throw new Error(Error de Twilio: ${errorData.message});
    }

    const responseData = await response.json();
    console.log("Mensaje enviado, SID:", responseData.sid);

    // 7. Devolver éxito
    return new Response(
      JSON.stringify({
        success: true,
        message_sid: responseData.sid,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error en la Edge Function:", error.message);
    // Devolver un error
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});