// assets/js/guard.js
import { supabase } from './supabaseClient.js';

/** Redirige a login si no hay sesión. Devuelve la sesión si existe. */
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search + location.hash);
    // relativo: funciona en subcarpetas
    location.replace(`login.html?next=${next}`);
    throw new Error('redirect:no-session');
  }
  return session;
}

/** Devuelve array de roles del usuario actual (o ['cliente'] si no hay fila). */
export async function getMyRoles() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ['cliente'];
  const { data, error } = await supabase
    .from('roles_usuarios')
    .select('role')
    .eq('user_id', user.id);
  if (error) return ['cliente'];
  return data.map(r => r.role);
}

/** Exige al menos uno de los roles indicados. */
export async function requireRole(allowed) {
  const session = await requireAuth();
  const need = Array.isArray(allowed) ? allowed : [allowed];
  const mine = await getMyRoles();

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

/** Guarda de página: exige login y opcionalmente roles. */
export async function guardPage(config = {}) {
  if (config.roles && config.roles.length) {
    return requireRole(config.roles);
  }
  return requireAuth();
}
