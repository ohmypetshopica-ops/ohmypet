// public/modules/dashboard/dashboard-sidebar.js

import { supabase } from '../../core/supabase.js';

const setupSidebarLogout = () => {
    const logoutButton = document.querySelector('#sidebar-logout-button');
    
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
                await supabase.auth.signOut();
                window.location.href = '/public/modules/login/login.html';
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                alert('Hubo un error al cerrar sesión. Por favor, intenta de nuevo.');
            }
        });
    } else {
        console.error('No se encontró el botón de logout en el sidebar');
    }
};

// Exportamos la función para usarla cuando se cargue el sidebar
export { setupSidebarLogout };