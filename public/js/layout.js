import { initHeaderWithRetry } from './header.js';

const CACHE_VERSION = Date.now(); // Genera un número único cada vez

/**
 * Carga un componente HTML desde una URL en un contenedor específico.
 * AÑADIDO: Cache busting (?v=...) para forzar la carga del nuevo HTML.
 */
const loadComponent = async (url, containerId) => {
    try {
        // Agregamos la versión para evitar que el navegador use el archivo viejo
        const versionedUrl = `${url}?v=${CACHE_VERSION}`; 
        
        const response = await fetch(versionedUrl, { cache: 'no-store' });
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
    console.log('📦 Cargando layout (sin caché)...');
    
    await Promise.all([
        loadComponent('/public/components/header.html', 'header-container'),
        loadComponent('/public/components/footer.html', 'footer-container')
    ]);
    
    console.log('✅ Layout cargado');
    
    // Inicializar header
    await initHeaderWithRetry();
    
    // Disparar evento de que todo está listo
    document.dispatchEvent(new CustomEvent('layoutReady'));
};

document.addEventListener('DOMContentLoaded', loadLayout);