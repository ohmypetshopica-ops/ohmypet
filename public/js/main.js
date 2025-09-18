import { supabase } from '../core/supabase.js';
import { updateCartBadge } from './cart.js';

// --- ELEMENTOS DEL DOM ---
const guestNav = document.querySelector('#guest-nav');
const userNav = document.querySelector('#user-nav');
const userProfileButton = document.querySelector('#user-profile-button');
const userProfileMenu = document.querySelector('#user-profile-menu');
const userInitialElement = document.querySelector('#user-initial');
const logoutButton = document.querySelector('#logout-button');

// --- FUNCIÓN PARA ACTUALIZAR LA UI ---
const setupUI = async () => {
    // 1. Obtenemos el usuario actual
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // --- Si hay un usuario logueado ---
        guestNav.classList.add('hidden');
        userNav.classList.remove('hidden');
        userNav.classList.add('flex'); // Tailwind usa flex para alinear items

        // Buscamos su nombre en la tabla 'profiles'
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        if (profile && profile.full_name) {
            // Obtenemos la primera letra del nombre
            const firstInitial = profile.full_name.charAt(0).toUpperCase();
            userInitialElement.textContent = firstInitial;
        }

    } else {
        // --- Si NO hay un usuario logueado ---
        guestNav.classList.remove('hidden');
        userNav.classList.add('hidden');
        userNav.classList.remove('flex');
    }
};

// --- MANEJO DEL LOGOUT Y MENÚ DE PERFIL ---
if (userProfileButton) {
    userProfileButton.addEventListener('click', (event) => {
        event.stopPropagation();
        userProfileMenu.classList.toggle('hidden');
    });
}

if (logoutButton) {
    logoutButton.addEventListener('click', async (event) => {
        event.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error al cerrar sesión:', error);
        } else {
            window.location.reload();
        }
    });
}

// Cierra el menú de perfil si se hace clic fuera de él
window.addEventListener('click', (event) => {
    if (userNav && !userNav.contains(event.target) && userProfileMenu) {
        userProfileMenu.classList.add('hidden');
    }
});


// --- LÓGICA PARA LA NOTIFICACIÓN DE CITA AGENDADA ---
const showScheduleNotification = () => {
    const notificationBanner = document.querySelector('#notification-banner');
    if (!notificationBanner) return;

    notificationBanner.classList.remove('hidden', 'translate-x-full');
    notificationBanner.classList.add('translate-x-0');

    setTimeout(() => {
        notificationBanner.classList.remove('translate-x-0');
        notificationBanner.classList.add('translate-x-full');
    }, 5000);
};

// --- INICIO DE LA CORRECCIÓN ---
// Función de notificación global que podemos usar en cualquier parte.
export const showAppNotification = (message, type = 'success') => {
    const notification = document.querySelector('#app-notification');
    const messageElement = document.querySelector('#app-notification-message');
    if (!notification || !messageElement) return;

    // Asignar mensaje y estilo
    messageElement.textContent = message;
    notification.classList.remove('bg-green-600', 'bg-red-600');
    if (type === 'success') {
        notification.classList.add('bg-green-600');
    } else {
        notification.classList.add('bg-red-600');
    }

    // Mostrar banner
    notification.classList.remove('hidden', 'translate-x-full');
    notification.classList.add('translate-x-0');

    // Ocultar después de 3 segundos
    setTimeout(() => {
        notification.classList.remove('translate-x-0');
        notification.classList.add('translate-x-full');
    }, 3000);
};
// --- FIN DE LA CORRECCIÓN ---


const checkForNotification = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('from') === 'schedule') {
        showScheduleNotification();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};


// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    checkForNotification();
    updateCartBadge();
});