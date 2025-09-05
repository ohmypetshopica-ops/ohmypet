// Responsabilidad: acceso a datos para "dashboard" (Supabase queries / vistas / RPC).
// No manipular DOM aquí.

function handleError(tag, error) {
  if (error) {
    console.error(`[dashboard.api] ${tag}:`, error);
    throw new Error(error.message || String(error));
  }
}

export async function getLowStock(limit = 5) {
  const { data, error } = await supabase
    .from("v_low_stock_products")
    .select("*")
    .order("stock", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 50));
  handleError("getLowStock", error);
  return data || [];
}

export async function getExpiring(limit = 5) {
  const { data, error } = await supabase
    .from("v_expiring_products")
    .select("*")
    .order("expires_on", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 50));
  handleError("getExpiring", error);
  return data || [];
}

export async function getNextAppointments(limit = 5) {
  // Respeta el rol: si es cliente, solo sus citas; sino, todas.
  const { data: { user } } = await supabase.auth.getUser();
  let userId = user?.id || null;

  // Buscar rol actual
  let role = null;
  if (userId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    role = prof?.role || null;
  }

  let query = supabase
    .from("appointments_view")
    .select("*")
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 50));

  if (role === "cliente" && userId) {
    query = query.eq("client_id", userId);
  }

  const { data, error } = await query;
  handleError("getNextAppointments", error);
  return data || [];
}

export async function getKpis() {
  // KPIs simples: conteo de productos, mascotas y citas del día
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const [products, pets, appts] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("pets").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id", { count: "exact", head: true })
      .gte("start_at", start).lt("start_at", end)
  ]);

  if (products.error) handleError("getKpis.products", products.error);
  if (pets.error) handleError("getKpis.pets", pets.error);
  if (appts.error) handleError("getKpis.appts", appts.error);

  return {
    products: products.count ?? 0,
    pets: pets.count ?? 0,
    appointmentsToday: appts.count ?? 0,
  };
}
