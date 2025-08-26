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
  if (['dueno','duenio','owner','admin','administrator'].includes(n)) return 'dueno';
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

/* Obtiene roles del usuario probando varias tablas/columnas ------------- */
export async function getMyRoles() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ['cliente'];

  // Tablas y columnas posibles en tu proyecto
  const tables = [
    { table: 'roles_usuarios', userCol: 'user_id' },
    { table: 'user_roles',     userCol: 'user_id' },
    { table: 'roles_users',    userCol: 'user_id' },
    { table: 'roles',          userCol: 'user_id' }
  ];

  for (const t of tables) {
    try {
      // Pedimos varias columnas: Supabase devolverá solo las que existan
      const { data, error } = await supabase
        .from(t.table)
        .select('role, rol, name, nombre')
        .eq(t.userCol, user.id);

      if (error) continue;
      if (Array.isArray(data) && data.length) {
        const roles = data
          .map(r => r.role ?? r.rol ?? r.name ?? r.nombre)
          .filter(Boolean)
          .map(canonicalRole);
        if (roles.length) return roles;
      }
    } catch {
      /* probar siguiente tabla */
    }
  }
  // Fallback
  return ['cliente'];
}

/* Exige al menos uno de los roles indicados ----------------------------- */
export async function requireRole(allowed) {
  const session = await requireAuth();
  const need = (Array.isArray(allowed) ? allowed : [allowed]).map(canonicalRole);
  const mine = (await getMyRoles()).map(canonicalRole);

  const ok = mine.some(r => need.includes(r));
  if (!ok) {
    const url = new URL('unauthorized.html', location.href);
    url.searchParams.set('need', need.join(','));
    url.searchParams.set('have', mine.join(','));
    location.replace(url.toString());
    throw new Error('redirect:no-role');
  }
  return { session, roles: mine };
}

/* Guarda de página ------------------------------------------------------ */
export async function guardPage(config = {}) {
  if (config.roles && config.roles.length) {
    return requireRole(config.roles);
  }
  return requireAuth();
}
