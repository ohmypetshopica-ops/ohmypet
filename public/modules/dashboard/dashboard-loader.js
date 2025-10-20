// public/modules/dashboard/dashboard-loader.js

const CACHE_VERSION = Date.now();

/**
 * Carga un componente HTML en un contenedor específico.
 * @param {string} url - La URL del archivo HTML a cargar.
 * @param {string} containerId - El ID del div donde se inyectará el HTML.
 */
async function loadComponent(url, containerId) {
    try {
        const response = await fetch(`${url}?v=${CACHE_VERSION}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
        } else {
            console.warn(`Contenedor con ID "${containerId}" no encontrado.`);
        }
    } catch (error) { 
        console.error(`Error cargando el componente ${url}:`, error); 
    }
}

/**
 * Configura los listeners y la lógica para el menú móvil.
 * Se ejecuta después de que los componentes del header y sidebar están cargados.
 */
function setupMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const closeMobileMenuButton = document.getElementById('close-mobile-menu');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const mobileNavContent = document.getElementById('mobile-nav-content');
    
    if (!mobileMenuButton || !closeMobileMenuButton || !mobileMenu || !mobileOverlay) {
        console.error("Faltan elementos esenciales del menú móvil en el HTML.");
        return;
    }
    
    const toggleMenu = (show) => {
        mobileMenu.classList.toggle('active', show);
        overlay.classList.toggle('active', show);
        document.body.style.overflow = show ? 'hidden' : '';
    };
    
    mobileMenuButton.addEventListener('click', () => toggleMenu(true));
    closeMobileMenuButton.addEventListener('click', () => toggleMenu(false));
    mobileOverlay.addEventListener('click', () => toggleMenu(false));
    
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer && sidebarContainer.querySelector('nav') && mobileNavContent) {
        const navClone = sidebarContainer.querySelector('nav').cloneNode(true);
        mobileNavContent.innerHTML = ''; 
        mobileNavContent.appendChild(navClone);

        navClone.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 768) {
                    toggleMenu(false);
                }
            });
        });
    }
}

/**
 * Función principal que orquesta la carga de todo el layout del dashboard.
 */
async function initializeDashboardLayout() {
    // 1. Cargar todos los componentes HTML comunes en paralelo
    await Promise.all([
        loadComponent('/public/modules/dashboard/dashboard-sidebar.html', 'sidebar-container'),
        loadComponent('/public/modules/dashboard/dashboard-header.html', 'header-container')
    ]);
    
    // 2. Una vez que el HTML está en su sitio, configurar los scripts que dependen de él
    setupMobileMenu();
    
    try {
        // 3. Importar y ejecutar los módulos de lógica comunes
        await import(`/public/core/auth.js?v=${CACHE_VERSION}`);
        
        const sidebarModule = await import(`./dashboard-sidebar.js?v=${CACHE_VERSION}`);
        if (sidebarModule?.initSidebar) sidebarModule.initSidebar();
        
        const headerModule = await import(`./dashboard-header.js?v=${CACHE_VERSION}`);
        if (headerModule?.initializeHeader) headerModule.initializeHeader();

        // 4. Cargar el script específico de la página actual (ej: dashboard-reports.js)
        const pageModulePath = window.location.pathname.replace('.html', '.js');
        await import(`${pageModulePath}?v=${CACHE_VERSION}`);
        
        console.log(`✅ Módulo específico de la página (${pageModulePath}) cargado.`);

    } catch (error) { 
        console.error('❌ Error fatal al inicializar los scripts del dashboard:', error); 
    }
}

// Punto de entrada principal
document.addEventListener('DOMContentLoaded', initializeDashboardLayout);