export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    const jsonResponse = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Health Check
    if (path === "/" && method === "GET") {
      return jsonResponse({
        success: true,
        message: "SRDH Pay API is running"
      });
    }

    // Login
    if (path === "/api/login" && method === "POST") {
      try {
        const body = await request.json();
        const email = body.email?.trim();
        const password = body.password?.trim();

        if (!email || !password) {
          return jsonResponse({
            success: false,
            message: "กรุณากรอกอีเมลและรหัสผ่าน"
          }, 400);
        }

        const user = await env.DB.prepare(
          `SELECT id, email, username, role, dept, active
           FROM auth
           WHERE email = ? AND password = ?`
        ).bind(email, password).first();

        if (!user) {
          return jsonResponse({
            success: false,
            message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          }, 401);
        }

        if (Number(user.active) === 0) {
          return jsonResponse({
            success: false,
            message: "บัญชีผู้ใช้นี้ถูกปิดการใช้งาน"
          }, 403);
        }

        return jsonResponse({
          success: true,
          message: "เข้าสู่ระบบสำเร็จ",
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            dept: user.dept
          }
        });
      } catch (error) {
        return jsonResponse({
          success: false,
          message: "เกิดข้อผิดพลาดภายในระบบ",
          error: error.message
        }, 500);
      }
    }

    // Guest Login
    if (path === "/api/guest-login" && method === "POST") {
      return jsonResponse({
        success: true,
        message: "เข้าสู่ระบบ Guest สำเร็จ",
        user: {
          id: 0,
          email: "guest@srdh.local",
          username: "Guest",
          role: "guest",
          dept: "guest"
        }
      });
    }

    return jsonResponse({
      success: false,
      message: "ไม่พบ API ที่เรียกใช้งาน"
    }, 404);
  },
};
