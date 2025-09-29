// public/modules/dashboard/dashboard-sidebar.js

import { supabase } from '../../core/supabase.js';

/**
 * Carga la información del usuario en el footer del sidebar
 */
const loadUserInfo = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, first_name, last_name, role')
                .eq('id', user.id)
                .single();
            
            if (profile) {
                const displayName = (profile.first_name && profile.last_name) 
                    ? `${profile.first_name} ${profile.last_name}` 
                    : profile.full_name || 'Usuario';
                
                const sidebarUserName = document.getElementById('sidebar-user-name');
                const sidebarUserInitial = document.getElementById('sidebar-user-initial');
                
                if (sidebarUserName) {
                    sidebarUserName.textContent = displayName;
                }
                
                if (sidebarUserInitial) {
                    sidebarUserInitial.textContent = displayName.charAt(0).toUpperCase();
                }
                
                console.log('Información del usuario cargada:', displayName);
            }
        }
    } catch (error) {
        console.error('Error al cargar información del usuario:', error);
    }
};

/**
 * Marca el ítem activo del sidebar según la URL actual
 */
const setActiveMenuItem = () => {
    const currentPath = window.location.pathname;
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    
    if (sidebarItems.length === 0) {
        console.warn('No se encontraron items del sidebar');
        return;
    }
    
    sidebarItems.forEach(item => {
        item.classList.remove('bg-white', 'shadow-sm');
        const span = item.querySelector('span');
        const icon = item.querySelector('svg');
        
        if (span) {
            span.classList.remove('text-green-700', 'font-semibold');
            span.classList.add('text-gray-700');
        }
        
        if (icon) {
            icon.classList.remove('text-green-600');
            icon.classList.add('text-gray-500');
        }
        
        if (item.getAttribute('href') === currentPath) {
            item.classList.add('bg-white', 'shadow-sm');
            
            if (span) {
                span.classList.remove('text-gray-700');
                span.classList.add('text-green-700', 'font-semibold');
            }
            
            if (icon) {
                icon.classList.remove('text-gray-500');
                icon.classList.add('text-green-600');
            }
        }
    });
    
    console.log('Menú activo configurado');
};

/**
 * Configura el botón de cerrar sesión del sidebar
 */
const setupSidebarLogout = () => {
    // Intentar encontrar el botón con reintentos
    let attempts = 0;
    const maxAttempts = 10;
    
    const trySetup = () => {
        const logoutButton = document.querySelector('#sidebar-logout-button');
        
        if (logoutButton) {
            console.log('Botón de logout encontrado, configurando...');
            
            // Remover listeners previos clonando el botón
            const newButton = logoutButton.cloneNode(true);
            logoutButton.parentNode.replaceChild(newButton, logoutButton);
            
            newButton.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Cerrando sesión desde el sidebar...');
                
                try {
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    await supabase.auth.signOut({ scope: 'local' });
                    
                    console.log('Sesión cerrada, redirigiendo...');
                    window.location.href = '/public/modules/login/login.html';
                } catch (error) {
                    console.error('Error al cerrar sesión:', error);
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/public/modules/login/login.html';
                }
            });
            
            console.log('✓ Botón de logout configurado correctamente');
        } else {
            attempts++;
            if (attempts < maxAttempts) {
                console.log(`Intento ${attempts}/${maxAttempts}: Botón no encontrado, reintentando en 100ms...`);
                setTimeout(trySetup, 100);
            } else {
                console.error('❌ No se encontró el botón de logout después de múltiples intentos');
            }
        }
    };
    
    trySetup();
};

/**
 * Inicializa el sidebar cuando se carga
 */
const initSidebar = () => {
    console.log('=== Inicializando sidebar ===');
    
    // Verificar que el contenedor del sidebar existe
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) {
        console.error('❌ Contenedor del sidebar no encontrado');
        return;
    }
    
    if (sidebarContainer.children.length === 0) {
        console.error('❌ El contenedor del sidebar está vacío');
        return;
    }
    
    console.log('✓ Contenedor del sidebar encontrado con contenido');
    
    setActiveMenuItem();
    setupSidebarLogout();
    loadUserInfo();
    
    console.log('=== Sidebar inicializado ===');
};

export { setupSidebarLogout, setActiveMenuItem, initSidebar };