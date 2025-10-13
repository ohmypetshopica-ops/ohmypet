import { supabase } from '../core/supabase.js';

// Importar cart de forma segura
let updateCartBadge = () => {};
try {
    const cartModule = await import('./cart.js');
    if (cartModule.updateCartBadge) {
        updateCartBadge = cartModule.updateCartBadge;
    }
} catch (error) {
    console.log('Cart no disponible');
}

/**
 * Actualiza la UI del header según el estado de autenticación
 */
const setupUI = async (user) => {
    const guestNav = document.getElementById('guest-nav');
    const userNav = document.getElementById('user-nav');
    const userInitialElement = document.getElementById('user-initial');

    if (!guestNav || !userNav) return false;

    if (user) {
        guestNav.classList.add('hidden');
        userNav.classList.remove('hidden');
        userNav.classList.add('flex');

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, first_name, last_name')
            .eq('id', user.id)
            .single();

        if (userInitialElement && profile) {
            const displayName = profile.first_name || profile.full_name || profile.last_name;
            if (displayName) {
                userInitialElement.textContent = displayName.charAt(0).toUpperCase();
            } else {
                userInitialElement.textContent = '👤';
            }
        }
    } else {
        guestNav.classList.remove('hidden');
        userNav.classList.add('hidden');
        userNav.classList.remove('flex');
    }
    
    return true;
};

/**
 * Configura el botón de logout
 */
const setupLogoutButton = () => {
    const logoutButton = document.getElementById('logout-button');
    if (!logoutButton) return;
    
    const newLogoutButton = logoutButton.cloneNode(true);
    logoutButton.parentNode.replaceChild(newLogoutButton, logoutButton);
    
    newLogoutButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            localStorage.clear();
            sessionStorage.clear();
            await supabase.auth.signOut({ scope: 'local' });
            window.location.href = '/public/index.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            window.location.href = '/public/index.html';
        }
    });
};

/**
 * SOLUCIÓN: Event delegation en el body para que funcione incluso si el header no existe aún
 */
const setupHeaderEventListeners = () => {
    // Usar event delegation en document.body para capturar clicks incluso si los elementos se cargan después
    document.body.addEventListener('click', (event) => {
        // Menú de invitado (icono de usuario)
        const profileMenuButton = event.target.closest('#profile-menu-button');
        if (profileMenuButton) {
            event.preventDefault();
            event.stopPropagation();
            const profileMenu = document.getElementById('profile-menu');
            const userProfileMenu = document.getElementById('user-profile-menu');
            profileMenu?.classList.toggle('hidden');
            userProfileMenu?.classList.add('hidden');
            return;
        }
        
        // Menú de usuario logueado (círculo con inicial)
        const userProfileButton = event.target.closest('#user-profile-button');
        if (userProfileButton) {
            event.preventDefault();
            event.stopPropagation();
            const userProfileMenu = document.getElementById('user-profile-menu');
            const profileMenu = document.getElementById('profile-menu');
            userProfileMenu?.classList.toggle('hidden');
            profileMenu?.classList.add('hidden');
            return;
        }

        // Cerrar menús si se hace clic fuera
        const profileMenu = document.getElementById('profile-menu');
        const userProfileMenu = document.getElementById('user-profile-menu');
        const clickedInsideProfileMenu = event.target.closest('#profile-menu');
        const clickedInsideUserMenu = event.target.closest('#user-profile-menu');
        
        if (profileMenu && !profileMenu.classList.contains('hidden') && 
            !profileMenuButton && !clickedInsideProfileMenu) {
            profileMenu.classList.add('hidden');
        }
        
        if (userProfileMenu && !userProfileMenu.classList.contains('hidden') && 
            !userProfileButton && !clickedInsideUserMenu) {
            userProfileMenu.classList.add('hidden');
        }
    });
};

/**
 * Inicializa la UI con reintentos
 */
const initializeUI = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    let attempts = 0;
    const maxAttempts = 15; // Aumentamos intentos
    
    const trySetup = async () => {
        const success = await setupUI(user);
        
        if (success) {
            if (user) {
                setupLogoutButton();
            }
        } else {
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(trySetup, 100);
            }
        }
    };
    
    trySetup();
};

/**
 * Inicialización principal
 */
const initialize = () => {
    // IMPORTANTE: Configurar listeners INMEDIATAMENTE, antes de que el header exista
    setupHeaderEventListeners();
    
    // Luego inicializar UI
    initializeUI();
    
    // Escuchar cambios de autenticación
    supabase.auth.onAuthStateChange((_event, session) => {
        setupUI(session?.user);
        if (session?.user) {
            setupLogoutButton();
        }
    });
    
    // Actualizar badge del carrito
    updateCartBadge();
};

// Múltiples puntos de entrada para asegurar inicialización
document.addEventListener('layoutReady', initialize);
document.addEventListener('DOMContentLoaded', initialize);

// Si el script se carga después del DOMContentLoaded
if (document.readyState !== 'loading') {
    initialize();
}