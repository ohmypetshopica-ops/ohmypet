import { supabase } from '../core/supabase.js';

/**
 * Inicializa el header con toda su lógica
 */
export const initHeader = async () => {
    console.log('🚀 [Header] Iniciando carga...');
    
    // Obtener elementos del DOM
    const guestNav = document.getElementById('guest-nav');
    const userNav = document.getElementById('user-nav');
    const dashboardLink = document.getElementById('dashboard-link'); // El botón que buscamos
    
    const userInitial = document.getElementById('user-initial');
    const userRoleLabel = document.getElementById('user-role-label'); 

    const guestMenuBtn = document.getElementById('guest-menu-btn');
    const guestDropdown = document.getElementById('guest-dropdown');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const cartBadge = document.getElementById('cart-badge');
    const cartBtn = document.querySelector('a[href="/public/modules/store/store.html"]');

    // Verificar elementos críticos
    if (!guestNav || !userNav) {
        console.warn('⚠️ [Header] No se encontraron los elementos de navegación.');
        return false;
    }

    // Verificar sesión
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // -- USUARIO LOGUEADO --
        console.log('✅ [Header] Usuario autenticado:', user.email);
        
        guestNav.classList.add('hidden');
        userNav.classList.remove('hidden');
        userNav.style.display = 'flex'; // Forzar visualización flex

        // Obtener datos del perfil
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name, last_name, full_name, role')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('❌ [Header] Error al cargar perfil:', error);
        }

        if (profile) {
            console.log('👤 [Header] Perfil cargado. Rol:', profile.role);
            
            // 1. Iniciales
            const displayName = (profile.first_name && profile.last_name) 
                ? `${profile.first_name} ${profile.last_name}` 
                : profile.full_name;
            const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';
            if (userInitial) userInitial.textContent = initial;

            // 2. Etiqueta de Rol en menú
            if (userRoleLabel) {
                userRoleLabel.textContent = profile.role ? profile.role.toUpperCase() : 'CLIENTE';
            }

            // 3. LÓGICA DEL BOTÓN DASHBOARD
            if (dashboardLink) {
                // Normalizar el rol a minúsculas por si acaso
                const role = (profile.role || '').toLowerCase().trim();
                
                if (role === 'dueño' || role === 'admin') {
                    console.log('🔓 [Header] Acceso ADMIN concedido. Mostrando botón.');
                    dashboardLink.href = '/public/modules/dashboard/dashboard-overview.html';
                    dashboardLink.classList.remove('hidden');
                    dashboardLink.style.display = 'flex'; 
                } else if (role === 'empleado') {
                    console.log('🔓 [Header] Acceso EMPLEADO concedido. Mostrando botón.');
                    dashboardLink.href = '/public/modules/employee/dashboard.html';
                    dashboardLink.classList.remove('hidden');
                    dashboardLink.style.display = 'flex';
                } else {
                    console.log('🔒 [Header] Usuario es CLIENTE. Ocultando botón Dashboard.');
                    dashboardLink.classList.add('hidden');
                    dashboardLink.style.display = 'none';
                }
            } else {
                console.error('❌ [Header] No se encontró el elemento HTML #dashboard-link');
            }
        }
    } else {
        // -- USUARIO NO LOGUEADO --
        console.log('zzz [Header] Sesión de invitado.');
        guestNav.classList.remove('hidden');
        userNav.classList.add('hidden');
        userNav.style.display = 'none';
    }

    // --- EVENT LISTENERS (Menús, Logout, Carrito) ---
    const toggleDropdown = (btn, dropdown, otherDropdown) => {
        if (btn && dropdown) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
                if (otherDropdown) otherDropdown.classList.add('hidden');
            });
        }
    };

    toggleDropdown(guestMenuBtn, guestDropdown, userDropdown);
    toggleDropdown(userMenuBtn, userDropdown, guestDropdown);

    document.addEventListener('click', () => {
        guestDropdown?.classList.add('hidden');
        userDropdown?.classList.add('hidden');
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/public/index.html';
        });
    }

    if (cartBtn) {
        cartBtn.addEventListener('click', (e) => {
            if (typeof window.renderCart === 'function') {
                e.preventDefault();
                const cartModal = document.getElementById('cart-modal');
                const cartModalContent = document.getElementById('cart-modal-content');
                if (cartModal) {
                    cartModal.classList.remove('hidden');
                    setTimeout(() => cartModalContent.style.transform = 'translateX(0)', 10);
                    window.renderCart();
                }
            }
        });
    }

    updateCartBadge(cartBadge);
    return true;
};

const updateCartBadge = (badge) => {
    if (!badge) return;
    try {
        const cart = JSON.parse(localStorage.getItem('ohmypet_cart') || '[]');
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        if (totalItems > 0) {
            badge.textContent = totalItems;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (error) {}
};

export const refreshCartBadge = () => {
    const badge = document.getElementById('cart-badge');
    updateCartBadge(badge);
};

export const initHeaderWithRetry = async () => {
    let attempts = 0;
    const tryInit = async () => {
        const success = await initHeader();
        if (!success && attempts < 3) {
            attempts++;
            setTimeout(tryInit, 200);
        }
    };
    tryInit();
};