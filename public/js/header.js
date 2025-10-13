import { supabase } from '../core/supabase.js';

/**
 * Inicializa el header con toda su lógica
 */
export const initHeader = async () => {
    console.log('🚀 Inicializando header...');
    
    // Obtener elementos del DOM
    const guestNav = document.getElementById('guest-nav');
    const userNav = document.getElementById('user-nav');
    const guestMenuBtn = document.getElementById('guest-menu-btn');
    const guestDropdown = document.getElementById('guest-dropdown');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    const userInitial = document.getElementById('user-initial');
    const logoutBtn = document.getElementById('logout-btn');
    const cartBadge = document.getElementById('cart-badge');
    const cartBtn = document.getElementById('cart-btn');

    // Verificar que existen los elementos
    if (!guestNav || !userNav) {
        console.log('⏳ Header no cargado aún, reintentando...');
        return false;
    }

    console.log('✅ Elementos del header encontrados');

    // ========== VERIFICAR ESTADO DE AUTENTICACIÓN ==========
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // Usuario LOGUEADO
        console.log('👤 Usuario logueado:', user.email);
        guestNav.classList.add('hidden');
        userNav.classList.remove('hidden');

        // Obtener nombre del perfil
        const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, full_name')
            .eq('id', user.id)
            .single();

        if (profile) {
            const name = profile.first_name || profile.full_name || profile.last_name || 'U';
            userInitial.textContent = name.charAt(0).toUpperCase();
            console.log('✅ Inicial del usuario:', name.charAt(0).toUpperCase());
        }

    } else {
        // Usuario NO logueado
        console.log('🔓 Usuario no logueado');
        guestNav.classList.remove('hidden');
        userNav.classList.add('hidden');
    }

    // ========== EVENT LISTENERS ==========

    // Abrir/cerrar menú de invitado
    if (guestMenuBtn && guestDropdown) {
        guestMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            guestDropdown.classList.toggle('hidden');
            userDropdown?.classList.add('hidden');
            console.log('🔽 Menú invitado toggled');
        });
    }

    // Abrir/cerrar menú de usuario
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
            guestDropdown?.classList.add('hidden');
            console.log('🔽 Menú usuario toggled');
        });
    }

    // Cerrar sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('🚪 Cerrando sesión...');
            
            try {
                await supabase.auth.signOut();
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/public/index.html';
            } catch (error) {
                console.error('❌ Error al cerrar sesión:', error);
                window.location.href = '/public/index.html';
            }
        });
    }

    // ========== CARRITO ==========
    
    // Abrir modal del carrito (solo si estamos en store.html)
    if (cartBtn) {
        cartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const cartModal = document.getElementById('cart-modal');
            const cartModalContent = document.getElementById('cart-modal-content');
            
            if (cartModal && cartModalContent) {
                // Estamos en la tienda, abrir modal
                cartModal.classList.remove('hidden');
                setTimeout(() => {
                    cartModalContent.style.transform = 'translateX(0)';
                }, 10);
                
                // Llamar función de renderizado si existe
                if (window.renderCart) {
                    window.renderCart();
                }
                console.log('🛒 Modal del carrito abierto');
            } else {
                // No estamos en la tienda, ir a la tienda
                console.log('🛒 Redirigiendo a tienda...');
                window.location.href = '/public/modules/store/store.html';
            }
        });
    }

    // Actualizar badge del carrito
    updateCartBadge(cartBadge);

    // Cerrar menús al hacer click fuera
    document.addEventListener('click', () => {
        guestDropdown?.classList.add('hidden');
        userDropdown?.classList.add('hidden');
    });

    console.log('✅ Header inicializado completamente');
    return true;
};

/**
 * Actualiza el badge del carrito
 */
const updateCartBadge = (badge) => {
    if (!badge) return;
    
    try {
        const cart = JSON.parse(localStorage.getItem('ohmypet_cart') || '[]');
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        if (totalItems > 0) {
            badge.textContent = totalItems;
            badge.classList.remove('hidden');
            console.log('🛒 Badge actualizado:', totalItems);
        } else {
            badge.classList.add('hidden');
        }
    } catch (error) {
        console.log('Cart no disponible');
    }
};

/**
 * Función pública para actualizar el badge desde otros scripts
 */
export const refreshCartBadge = () => {
    const badge = document.getElementById('cart-badge');
    updateCartBadge(badge);
};

/**
 * Reintentar inicialización si falla
 */
export const initHeaderWithRetry = async () => {
    let attempts = 0;
    const maxAttempts = 20;

    const tryInit = async () => {
        const success = await initHeader();
        
        if (!success && attempts < maxAttempts) {
            attempts++;
            console.log(`⏳ Reintento ${attempts}/${maxAttempts}`);
            setTimeout(tryInit, 100);
        } else if (!success) {
            console.error('❌ No se pudo inicializar el header después de múltiples intentos');
        }
    };

    tryInit();
};