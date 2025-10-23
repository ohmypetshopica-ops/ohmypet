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
                
                // --- ACTUALIZACIÓN PARA AMBAS VISTAS (DESKTOP Y MÓVIL) ---
                const elements = [
                    { name: 'sidebar-user-name', initial: 'sidebar-user-initial' },
                    { name: 'mobile-user-name', initial: 'mobile-user-initial' }
                ];
                
                elements.forEach(pair => {
                    const userNameEl = document.getElementById(pair.name);
                    const userInitialEl = document.getElementById(pair.initial);
                    
                    if (userNameEl) {
                        userNameEl.textContent = displayName;
                    }
                    
                    if (userInitialEl) {
                        userInitialEl.textContent = displayName.charAt(0).toUpperCase();
                    }
                });
                
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
    // Se seleccionan los items de ambos menús (desktop y móvil)
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
    // Lógica unificada para cerrar sesión
    const handleLogout = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('Cerrando sesión...');

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
    };

    // Función para adjuntar el listener a un botón por su ID
    const attachListener = (buttonId) => {
        const button = document.getElementById(buttonId);
        if (button) {
            // Clonar para remover listeners previos y evitar duplicados
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', handleLogout);
            console.log(`✓ Botón de logout '${buttonId}' configurado.`);
        } else {
            console.warn(`- Botón de logout '${buttonId}' no encontrado en el DOM.`);
        }
    };

    // Usamos un pequeño retraso para asegurar que el menú móvil dinámico se haya cargado
    setTimeout(() => {
        attachListener('sidebar-logout-button'); // Botón de escritorio
        attachListener('mobile-logout-button'); // Botón móvil
    }, 200);
};

/**
 * Inicializa el sidebar cuando se carga
 */
const initSidebar = () => {
    console.log('=== Inicializando sidebar ===');
    
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) {
        console.error('❌ Contenedor del sidebar no encontrado');
        return;
    }
    
    if (sidebarContainer.children.length === 0) {
        // Esto es normal si se está cargando dinámicamente, no es un error fatal.
        console.log('⏳ El contenedor del sidebar está vacío, esperando carga dinámica.');
    } else {
        console.log('✓ Contenedor del sidebar encontrado con contenido');
    }
    
    setActiveMenuItem();
    setupSidebarLogout();
    loadUserInfo();
    
    console.log('=== Sidebar inicializado ===');
};

export { setupSidebarLogout, setActiveMenuItem, initSidebar };