document.addEventListener('DOMContentLoaded', () => {
    checkUserSession();

    const logoutButton = document.querySelector('#logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (event) => {
            event.preventDefault();
            await supabase.auth.signOut();
            window.location.reload();
        });
    }
});

/**
 * Verifica si hay un usuario autenticado y actualiza la barra de navegación.
 */
async function checkUserSession() {
    const { data: { user } } = await supabase.auth.getUser();

    const loginLink = document.querySelector('#login-link');
    const logoutButton = document.querySelector('#logout-button');

    if (user) {
        // --- Si el usuario ESTÁ conectado ---
        // Muestra el botón de cerrar sesión
        logoutButton.classList.remove('hidden');
        // Oculta el enlace para iniciar sesión
        loginLink.classList.add('hidden');
    } else {
        // --- Si el usuario NO ESTÁ conectado ---
        // Oculta el botón de cerrar sesión
        logoutButton.classList.add('hidden');
        // Muestra el enlace para iniciar sesión
        loginLink.classList.remove('hidden');
    }
}