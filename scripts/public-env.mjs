export function validatePublicSupabaseEnv(url, key) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error("NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida."); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if ((parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) || parsed.username || parsed.password) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL debe usar HTTPS (HTTP solo local) y no contener credenciales.");
  }
  let publicKey = /^sb_publishable_[a-zA-Z0-9_-]{16,}$/.test(key);
  if (!publicKey && key.startsWith("eyJ")) {
    try {
      const parts = key.split(".");
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      publicKey = parts.length === 3 && payload.role === "anon" && parts[2].length > 0;
    } catch { publicKey = false; }
  }
  if (!publicKey) throw new Error("Usa una clave publishable o anon; las claves secret y service_role están prohibidas en variables públicas.");
  return { url: parsed.toString().replace(/\/$/, ""), publishableKey: key };
}
