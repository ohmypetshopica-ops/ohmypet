// Responsabilidad: validaciones/reglas de negocio para "dashboard". Sin llamadas a red.

export function ensureLimit(n, fallback = 5) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(Math.max(Math.trunc(x), 1), 50);
}

export function listOrEmpty(arr) {
  return Array.isArray(arr) ? arr : [];
}
