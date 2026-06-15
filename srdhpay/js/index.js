/* workers/src/index.js */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // ระบบ CORS สำหรับรองรับการเรียกจาก Browser
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // 1. API Login
    if (path === "/api/login" && method === "POST") {
      try {
        const { email, password } = await request.json();
        
        // เช็คในฐานข้อมูล
        const user = await env.DB.prepare(
          "SELECT * FROM auth WHERE email = ? AND password = ?"
        ).bind(email, password).first();

        if (user) {
          return new Response(JSON.stringify({ 
            success: true, 
            username: user.username,
            role: user.role 
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } else {
          return new Response(JSON.stringify({ success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }), { status: 401, headers: corsHeaders });
        }
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // Default response
    return new Response("SRDH Pay API is ready!", { headers: corsHeaders });
  },
};
