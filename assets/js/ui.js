import { supabase } from './supabaseClient.js';

// Renderiza sidebar
(async function renderSidebar() {
  const sidebarRoot = document.getElementById('sidebar-root');
  if (!sidebarRoot) return;
  const res = await fetch('/public/shared/sidebar.html');
  const html = await res.text();
  sidebarRoot.innerHTML = html;
})();

// Renderiza topbar
(async function renderTopbar() {
  const topbarRoot = document.getElementById('topbar-root');
  if (!topbarRoot) return;
  const res = await fetch('/public/shared/topbar.html');
  const html = await res.text();
  topbarRoot.innerHTML = html;

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    document.getElementById('ohmy-user-email').textContent = session.user.email;
  }

  document.getElementById('ohmy-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.href = 'login.html';
  });
})();
