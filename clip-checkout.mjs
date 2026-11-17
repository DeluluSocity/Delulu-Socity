const PRICES = {"p0":1650,"p1":1600,"p2":1550,"p3":1700,"p4":1600,"p5":1700,"p6":1700,"p7":1600,"p8":1700,"p9":1600,"p10":1800,"p11":1800,"p12":1700,"p13":1800,"p14":1700,"p15":1600,"p16":1400,"p17":1300,"p18":1600,"p19":1900,"p20":1700,"p21":1800,"p22":1700,"p23":1500,"p24":1900,"p25":1400,"p26":1400,"p27":1650,"p28":1600,"p29":1600,"p30":1800,"p31":2000,"p32":350,"p33":1300};
const CLIP_URL = process.env.CLIP_CHECKOUT_URL || "https://api.payclip.com/v2/checkout";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const key = process.env.CLIP_API_KEY, secret = process.env.CLIP_SECRET_KEY;
  if (!key || !secret) return Response.json({ error: "Faltan las llaves de Clip" }, { status: 500 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Pedido inválido" }, { status: 400 }); }
  const items = Array.isArray(body.items) ? body.items : [];
  let total = 0;
  for (const it of items) {
    const q = Math.floor(Number(it.q));
    if (!(it.id in PRICES) || !(q >= 1 && q <= 50)) return Response.json({ error: "Producto no disponible" }, { status: 400 });
    total += PRICES[it.id] * q;
  }
  if (!total) return Response.json({ error: "Bag vacía" }, { status: 400 });
  const origin = new URL(req.url).origin;
  const auth = "Basic " + Buffer.from(key + ":" + secret).toString("base64");
  const r = await fetch(CLIP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json", "Authorization": auth, "x-api-key": auth },
    body: JSON.stringify({
      amount: total,
      currency: "MXN",
      purchase_description: "Pedido Delulu Society",
      redirection_url: { success: origin + "/?pago=ok", error: origin + "/?pago=error", default: origin + "/?pago=pendiente" },
      metadata: { me_reference_id: "DLL-" + Date.now() }
    })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.payment_request_url) {
    console.log("Clip error", r.status, JSON.stringify(data));
    return Response.json({ error: "Clip no pudo crear el cobro" }, { status: 502 });
  }
  return Response.json({ url: data.payment_request_url, total });
};
