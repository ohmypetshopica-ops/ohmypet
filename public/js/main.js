import { supabase } from '../core/supabase.js';
import { updateCartBadge } from './cart.js';

/**
 * Actualiza la UI del header según el estado de autenticación del usuario.
 * @param {Object|null} user - El objeto de usuario de Supabase, o null si no está logueado.
 */
const setupUI = async (user) => {
    const guestNav = document.getElementById('guest-nav');
    const userNav = document.getElementById('user-nav');
    const userInitialElement = document.getElementById('user-initial');

    if (!guestNav || !userNav) return;

    if (user) {
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
            userInitialElement.textContent = '👤';
        }

    } else {
        guestNav.classList.remove('hidden');
        userNav.classList.add('hidden');
        userNav.classList.remove('flex');
    }
};

/**
 * Configura el botón de logout de manera directa
 */
const setupLogoutButton = () => {
    setTimeout(() => {
        const logoutButton = document.getElementById('logout-button');
        
        if (logoutButton) {
            // Removemos cualquier listener previo clonando el botón
            const newLogoutButton = logoutButton.cloneNode(true);
            logoutButton.parentNode.replaceChild(newLogoutButton, logoutButton);
            
            // Agregamos el nuevo listener
            newLogoutButton.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Cerrando sesión...');
                
                try {
                    // Primero limpiar cualquier estado local
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // Intentar cerrar sesión en Supabase
                    const { error } = await supabase.auth.signOut({ scope: 'local' });
                    
                    // Incluso si hay un error, redirigir (porque ya limpiamos el storage)
                    if (error) {
                        console.warn('Advertencia al cerrar sesión:', error.message);
                    }
                    
                    console.log('Sesión cerrada, redirigiendo...');
                    
                    // Redirigir a la página de inicio
                    window.location.href = '/public/index.html';
                    
                } catch (error) {
                    console.error('Error al cerrar sesión:', error);
                    
                    // Aún así intentar limpiar y redirigir
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/public/index.html';
                }
            });
            
            console.log('Listener de logout configurado correctamente');
        } else {
            console.warn('No se encontró el botón de logout');
        }
    }, 500);
};

/**
 * Configura los listeners para los menús desplegables
 */
const setupHeaderEventListeners = () => {
    document.body.addEventListener('click', (event) => {
        const profileMenuButton = document.getElementById('profile-menu-button');
        const profileMenu = document.getElementById('profile-menu');
        const userProfileButton = document.getElementById('user-profile-button');
        const userProfileMenu = document.getElementById('user-profile-menu');
        
        // Toggle menú de invitado
        if (profileMenuButton?.contains(event.target)) {
            event.preventDefault();
            event.stopPropagation();
            profileMenu?.classList.toggle('hidden');
            return;
        }
        
        // Toggle menú de usuario
        if (userProfileButton?.contains(event.target)) {
            event.preventDefault();
            event.stopPropagation();
            userProfileMenu?.classList.toggle('hidden');
            return;
        }

        // Cerrar menús al hacer clic fuera
        if (profileMenu && !profileMenu.classList.contains('hidden') && 
            !profileMenuButton?.contains(event.target) && !profileMenu.contains(event.target)) {
            profileMenu.classList.add('hidden');
        }
        
        if (userProfileMenu && !userProfileMenu.classList.contains('hidden') && 
            !userProfileButton?.contains(event.target) && !userProfileMenu.contains(event.target)) {
            userProfileMenu.classList.add('hidden');
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
    supabase.auth.onAuthStateChange((_event, session) => {
        setupUI(session?.user);
        
        // Configurar logout button después de actualizar la UI
        if (session?.user) {
            setupLogoutButton();
        }
    });

    setupHeaderEventListeners();
    setupLogoutButton();
    checkForNotification();
    updateCartBadge();
};

// Espera a que el layout (header/footer) se cargue antes de inicializar la lógica.
document.addEventListener('layoutReady', initialize);