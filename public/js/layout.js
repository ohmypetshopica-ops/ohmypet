import { initHeaderWithRetry } from './header.js';

/**
 * Carga un componente HTML desde una URL en un contenedor específico.
 */
const loadComponent = async (url, containerId) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error al cargar ${url}: ${response.statusText}`);
        }
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
        }
    } catch (error) {
        console.error(`No se pudo cargar el componente: ${error}`);
    }
};

/**
 * Carga todos los componentes comunes del layout
 */
const loadLayout = async () => {
    console.log('📦 Cargando layout...');
    
    await Promise.all([
        loadComponent('/public/components/header.html', 'header-container'),
        loadComponent('/public/components/footer.html', 'footer-container')
    ]);
    
    console.log('✅ Layout cargado');
    
    // Inicializar header
    await initHeaderWithRetry();
    
    // Disparar evento de que todo está listo
    document.dispatchEvent(new CustomEvent('layoutReady'));
    console.log('🎉 Layout listo');
};

document.addEventListener('DOMContentLoaded', loadLayout);