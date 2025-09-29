// public/modules/dashboard/dashboard-loader.js

async function loadComponent(url, containerId) {
    try {
        const timestamp = new Date().getTime();
        const urlWithCache = `${url}?v=${timestamp}`;
        
        const response = await fetch(urlWithCache);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const html = await response.text();
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Contenedor ${containerId} no encontrado`);
            return;
        }
        
        container.innerHTML = html;
        console.log(`✓ Componente ${url} cargado exitosamente`);
        
        // Esperar a que el navegador renderice el HTML
        await new Promise(resolve => setTimeout(resolve, 50));
        
    } catch (error) {
        console.error(`Error al cargar ${url}:`, error);
    }
}

async function initializeDashboard() {
    console.log('=== Iniciando carga de componentes del dashboard ===');
    
    // Cargar sidebar y header
    await Promise.all([
        loadComponent('/public/modules/dashboard/dashboard-sidebar.html', 'sidebar-container'),
        loadComponent('/public/modules/dashboard/dashboard-header.html', 'header-container')
    ]);
    
    console.log('✓ Componentes HTML cargados');
    
    // Esperar un poco más para asegurar que el DOM esté completamente renderizado
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Inicializar el sidebar
    try {
        console.log('Importando módulo del sidebar...');
        const sidebarModule = await import('./dashboard-sidebar.js?v=' + new Date().getTime());
        
        if (sidebarModule && sidebarModule.initSidebar) {
            sidebarModule.initSidebar();
        } else {
            console.error('El módulo del sidebar no tiene la función initSidebar');
        }
    } catch (error) {
        console.error('Error al inicializar el sidebar:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeDashboard);

export { loadComponent, initializeDashboard };