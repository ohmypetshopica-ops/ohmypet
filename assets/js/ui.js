// assets/js/ui.js
import { supabase } from './supabaseClient.js';

export async function injectUI() {
  await Promise.all([injectSidebar(), injectTopbar()]);
}

async function injectSidebar() {
  const host = document.getElementById('sidebar-root');
  if (!host) return;
  const html = await fetch('/public/shared/sidebar.html').then(r => r.text());
  host.innerHTML = html;
  // marca activa
  const cur = location.pathname.split('/').pop();
  document.querySelectorAll('#ohmy-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === cur) a.classList.add('bg-gray-100', 'font-medium');
  });
}

async function injectTopbar() {
  const host = document.getElementById('topbar-root');
  if (!host) return;
  const html = await fetch('/public/shared/topbar.html').then(r => r.text());
  host.innerHTML = html;

  const { data: { session } } = await supabase.auth.getSession();
  document.getElementById('ohmy-user-email').textContent = session?.user?.email ?? '';

  document.getElementById('ohmy-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.href = 'login.html';
  });
}
