import { initHeaderWithRetry } from './header.js';

/**
 * Carga un componente HTML desde una URL en un contenedor específico.
 */
const loadComponent = async (url, containerId) => {
    const container = document.getElementById(containerId);
    // Si el contenedor no existe o ya tiene contenido (para evitar recargas dobles), salir
    if (!container || container.children.length > 0) return;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error al cargar ${url}: ${response.statusText}`);
        }
        const html = await response.text();
        container.innerHTML = html;
    } catch (error) {
        console.error(`No se pudo cargar el componente: ${error}`);
    }
};

/**
 * Carga todos los componentes comunes del layout
 */
const loadLayout = async () => {
    console.log('📦 Cargando layout...');
    
    // NOTA DE OPTIMIZACIÓN: 
    // El header ya no se carga aquí porque está incluido estáticamente en el index.html
    // para mejorar el First Contentful Paint (FCP) y evitar saltos de layout (CLS).
    
    await Promise.all([
        // Solo cargamos el footer dinámicamente
        loadComponent('/public/components/footer.html', 'footer-container')
    ]);
    
    console.log('✅ Layout cargado');
    
    // Inicializar la lógica del header (eventos de menú, login, carrito)
    // Esto funcionará igual ya que el HTML del header ya existe en el DOM
    await initHeaderWithRetry();
    
    // Disparar evento de que todo está listo
    document.dispatchEvent(new CustomEvent('layoutReady'));
    console.log('🎉 Layout listo');
};

document.addEventListener('DOMContentLoaded', loadLayout);