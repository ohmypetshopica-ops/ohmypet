import { supabase } from '../core/supabase.js';
import { updateCartBadge } from './cart.js';

/**
 * Actualiza la UI del header según el estado de autenticación del usuario.
 * @param {Object|null} user - El objeto de usuario de Supabase, o null si no está logueado.
 */
const setupUI = async (user) => {
    // Se seleccionan los elementos aquí para garantizar que ya existen en el DOM.
    const guestNav = document.getElementById('guest-nav');
    const userNav = document.getElementById('user-nav');
    const userInitialElement = document.getElementById('user-initial');

    if (!guestNav || !userNav) return; // Si los elementos no existen, no hace nada.

    if (user) {
        // --- Usuario logueado ---
        guestNav.classList.add('hidden');
        userNav.classList.remove('hidden');
        userNav.classList.add('flex');

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        if (userInitialElement && profile && profile.full_name) {
            userInitialElement.textContent = profile.full_name.charAt(0).toUpperCase();
        } else if (userInitialElement) {
            userInitialElement.textContent = '👤'; // Ícono por defecto
        }

    } else {
        // --- Usuario no logueado ---
        guestNav.classList.remove('hidden');
        userNav.classList.add('hidden');
        userNav.classList.remove('flex');
    }
};

/**
 * Configura los listeners para los menús desplegables y el botón de logout en el header.
 * Usa delegación de eventos para funcionar con contenido cargado dinámicamente.
 */
const setupHeaderEventListeners = () => {
    document.body.addEventListener('click', async (event) => {
        const profileMenuButton = document.getElementById('profile-menu-button');
        const profileMenu = document.getElementById('profile-menu');
        const userProfileButton = document.getElementById('user-profile-button');
        const userProfileMenu = document.getElementById('user-profile-menu');
        
        // Lógica para abrir/cerrar menús
        if (profileMenuButton?.contains(event.target)) {
            profileMenu.classList.toggle('hidden');
        } else if (userProfileButton?.contains(event.target)) {
            userProfileMenu.classList.toggle('hidden');
        }

        // Lógica para cerrar menús al hacer clic fuera
        if (profileMenu && !profileMenu.classList.contains('hidden') && !profileMenuButton?.contains(event.target)) {
            profileMenu.classList.add('hidden');
        }
        if (userProfileMenu && !userProfileMenu.classList.contains('hidden') && !userProfileButton?.contains(event.target)) {
            userProfileMenu.classList.add('hidden');
        }
        
        // Lógica para cerrar sesión
        if (event.target.matches('#logout-button')) {
            event.preventDefault();
            await supabase.auth.signOut();
            window.location.href = '/public/index.html';
        }
    });
};

const showScheduleNotification = () => {
    const notificationBanner = document.querySelector('#notification-banner');
    if (!notificationBanner) return;
    notificationBanner.classList.remove('hidden', 'translate-x-full');
    notificationBanner.classList.add('translate-x-0');
    setTimeout(() => {
        notificationBanner.classList.add('translate-x-full');
    }, 5000);
};

const checkForNotification = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('from') === 'schedule') {
        showScheduleNotification();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};

/**
 * Punto de entrada principal que se ejecuta una vez que el layout está listo.
 */
const initialize = () => {
    // Escucha cambios de autenticación (login/logout) y actualiza la UI.
    supabase.auth.onAuthStateChange((_event, session) => {
        setupUI(session?.user);
    });

    setupHeaderEventListeners();
    checkForNotification();
    updateCartBadge();
};

// Espera a que el layout (header/footer) se cargue antes de inicializar la lógica.
document.addEventListener('layoutReady', initialize);