// assets/js/guard.js
import { supabase } from './supabaseClient.js';

/* Helpers --------------------------------------------------------------- */
function normalize(s) {
  return (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function canonicalRole(r) {
  const n = normalize(r);
  if (['dueno','dueño','duenio','owner','admin','administrator'].includes(n)) return 'dueno';
  if (['empleado','staff','worker','colaborador'].includes(n)) return 'empleado';
  if (['cliente','customer','usuario','user'].includes(n)) return 'cliente';
  return n;
}

/* Autenticación --------------------------------------------------------- */
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search + location.hash);
    location.replace(`login.html?next=${next}`);
    throw new Error('redirect:no-session');
  }
  return session;
}

/* Obtiene roles del usuario desde la tabla user_roles ------------------- */
export async function getMyRoles() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ['cliente'];

  // Buscar en la tabla user_roles
  const { data: rows, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  if (error || !rows || rows.length === 0) {
    console.warn('No se pudo obtener rol desde user_roles, asignando cliente:', error);
    return ['cliente'];
  }

  // Mapear roles a formato canónico
  return rows.map(r => canonicalRole(r.role));
}

/* Verifica si el usuario tiene rol requerido ---------------------------- */
export async function requireRole(requiredRole) {
  const roles = await getMyRoles();
  const required = canonicalRole(requiredRole);
  if (!roles.includes(required)) {
    location.replace('unauthorized.html');
    throw new Error(`redirect:role-mismatch (${roles} vs ${required})`);
  }
}
