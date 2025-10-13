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
        // Usuario logueado: mostrar menú de usuario
        guestNav.classList.add('hidden');
        userNav.classList.remove('hidden');
        userNav.classList.add('flex');

        // Obtener datos del perfil para mostrar la inicial
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, first_name, last_name')
            .eq('id', user.id)
            .single();

        if (userInitialElement && profile) {
            // Priorizar first_name si existe, sino usar full_name
            const displayName = profile.first_name || profile.full_name || profile.last_name;
            if (displayName) {
                userInitialElement.textContent = displayName.charAt(0).toUpperCase();
            } else {
                userInitialElement.textContent = '👤';
            }
        } else if (userInitialElement) {
            userInitialElement.textContent = '👤';
        }

    } else {
        // Usuario NO logueado: mostrar menú de invitado
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
            // Clonar el botón para eliminar eventos previos
            const newLogoutButton = logoutButton.cloneNode(true);
            logoutButton.parentNode.replaceChild(newLogoutButton, logoutButton);
            
            newLogoutButton.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    // Limpiar almacenamiento local
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // Cerrar sesión en Supabase
                    await supabase.auth.signOut({ scope: 'local' });
                    
                    // Redirigir al inicio
                    window.location.href = '/public/index.html';
                    
                } catch (error) {
                    console.error('Error al cerrar sesión:', error);
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/public/index.html';
                }
            });
        }
    }, 500);
};

/**
 * Configura los listeners para los menús desplegables del header
 */
const setupHeaderEventListeners = () => {
    document.body.addEventListener('click', (event) => {
        const profileMenuButton = document.getElementById('profile-menu-button');
        const profileMenu = document.getElementById('profile-menu');
        const userProfileButton = document.getElementById('user-profile-button');
        const userProfileMenu = document.getElementById('user-profile-menu');
        
        // Menú de invitado (icono de usuario)
        if (profileMenuButton?.contains(event.target)) {
            event.preventDefault();
            event.stopPropagation();
            profileMenu?.classList.toggle('hidden');
            userProfileMenu?.classList.add('hidden'); // Cerrar el otro menú
            return;
        }
        
        // Menú de usuario logueado (círculo con inicial)
        if (userProfileButton?.contains(event.target)) {
            event.preventDefault();
            event.stopPropagation();
            userProfileMenu?.classList.toggle('hidden');
            profileMenu?.classList.add('hidden'); // Cerrar el otro menú
            return;
        }

        // Cerrar menús si se hace clic fuera de ellos
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

/**
 * Muestra la notificación de cita agendada
 */
const showScheduleNotification = () => {
    const notificationBanner = document.querySelector('#notification-banner');
    if (!notificationBanner) return;

    // Mostrar la notificación
    notificationBanner.classList.remove('opacity-0', 'translate-x-full', 'pointer-events-none');

    // Ocultar después de 4 segundos
    setTimeout(() => {
        notificationBanner.classList.add('opacity-0', 'translate-x-full', 'pointer-events-none');
    }, 4000);
};

/**
 * Verifica si viene de agendar cita para mostrar notificación
 */
const checkForNotification = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('from') === 'schedule') {
        showScheduleNotification();
        // Limpiar el parámetro de la URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};

/**
 * Punto de entrada principal que se ejecuta una vez que el layout está listo.
 */
const initialize = () => {
    // Escuchar cambios en el estado de autenticación
    supabase.auth.onAuthStateChange((_event, session) => {
        setupUI(session?.user);
        
        if (session?.user) {
            setupLogoutButton();
        }
    });

    // Configurar listeners del header
    setupHeaderEventListeners();
    
    // Configurar logout (por si ya hay sesión activa)
    setupLogoutButton();
    
    // Verificar notificaciones
    checkForNotification();
    
    // Actualizar badge del carrito
    updateCartBadge();
};

// Esperar a que el layout esté listo antes de inicializar
document.addEventListener('layoutReady', initialize);