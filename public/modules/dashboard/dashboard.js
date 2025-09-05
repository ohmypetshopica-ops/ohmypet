// Responsabilidad: orquestación de UI del módulo "dashboard" (eventos, render).
// Sin llamadas directas a Supabase aquí: usar dashboard.api.js.
import { $ } from "../../core/ui.js";
import { ensureLimit, listOrEmpty } from "./dashboard.validate.js";
import { getLowStock, getExpiring, getNextAppointments, getKpis } from "./dashboard.api.js";

function li(text) {
  return `<li>${text}</li>`;
}
function emptyLi(text = "Sin datos") {
  return `<li class="text-gray-500">${text}</li>`;
}

async function renderLowStock(limit = 5) {
  const safe = ensureLimit(limit);
  const ul = $("#lowStockList");
  ul.innerHTML = li("Cargando…");
  try {
    const rows = listOrEmpty(await getLowStock(safe));
    ul.innerHTML = rows.length
      ? rows.map(r => li(`${r.name} — stock: ${r.stock}`)).join("")
      : emptyLi("Sin alertas");
  } catch (e) {
    console.error(e);
    ul.innerHTML = emptyLi("Error al cargar");
  }
}

async function renderExpiring(limit = 5) {
  const safe = ensureLimit(limit);
  const ul = $("#expiringList");
  ul.innerHTML = li("Cargando…");
  try {
    const rows = listOrEmpty(await getExpiring(safe));
    ul.innerHTML = rows.length
      ? rows.map(r => li(`${r.name} — vence: ${r.expires_on}`)).join("")
      : emptyLi("Sin alertas");
  } catch (e) {
    console.error(e);
    ul.innerHTML = emptyLi("Error al cargar");
  }
}

async function renderNextAppointments(limit = 5) {
  const safe = ensureLimit(limit);
  const ul = $("#nextAppointments");
  ul.innerHTML = li("Cargando…");
  try {
    const rows = listOrEmpty(await getNextAppointments(safe));
    ul.innerHTML = rows.length
      ? rows.map(a => li(`<b>${a.start_at}</b> — ${a.pet_name} (${a.service_name}) • ${a.employee_name || a.employee_id}`)).join("")
      : emptyLi("Sin citas");
  } catch (e) {
    console.error(e);
    ul.innerHTML = emptyLi("Error al cargar");
  }
}

async function renderKpis() {
  try {
    const k = await getKpis();
    $("#kpiProducts").textContent = k.products;
    $("#kpiPets").textContent = k.pets;
    $("#kpiAppointments").textContent = k.appointmentsToday;
  } catch (e) {
    console.error(e);
    $("#kpiProducts").textContent = "—";
    $("#kpiPets").textContent = "—";
    $("#kpiAppointments").textContent = "—";
  }
}

export async function init() {
  // Carga en paralelo
  await Promise.all([
    renderLowStock(5),
    renderExpiring(5),
    renderNextAppointments(5),
    renderKpis()
  ]);
}
