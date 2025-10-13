import { supabase } from '../core/supabase.js';

// Importar cart solo si el archivo existe y no causa errores
let updateCartBadge = () => {}; // Función vacía por defecto

try {
    const cartModule = await import('./cart.js');
    if (cartModule.updateCartBadge) {
        updateCartBadge = cartModule.updateCartBadge;
    }
} catch (error) {
    console.log('Cart.js no disponible en esta página');
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
 * Configura los menús desplegables
 */
const setupHeaderEventListeners = () => {
    document.body.addEventListener('click', (event) => {
        const profileMenuButton = document.getElementById('profile-menu-button');
        const profileMenu = document.getElementById('profile-menu');
        const userProfileButton = document.getElementById('user-profile-button');
        const userProfileMenu = document.getElementById('user-profile-menu');
        
        if (profileMenuButton?.contains(event.target)) {
            event.preventDefault();
            event.stopPropagation();
            profileMenu?.classList.toggle('hidden');
            userProfileMenu?.classList.add('hidden');
            return;
        }
        
        if (userProfileButton?.contains(event.target)) {
            event.preventDefault();
            event.stopPropagation();
            userProfileMenu?.classList.toggle('hidden');
            profileMenu?.classList.add('hidden');
            return;
        }

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
 * Inicializa la UI
 */
const initializeUI = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    let attempts = 0;
    const maxAttempts = 10;
    
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
    setupHeaderEventListeners();
    initializeUI();
    
    supabase.auth.onAuthStateChange((_event, session) => {
        setupUI(session?.user);
        if (session?.user) {
            setupLogoutButton();
        }
    });
    
    // Actualizar badge del carrito (si existe)
    updateCartBadge();
};

document.addEventListener('layoutReady', initialize);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    setTimeout(initialize, 100);
}