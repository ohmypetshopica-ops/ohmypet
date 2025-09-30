// Sistema automático de cache busting para imports dinámicos
const CACHE_VERSION = Date.now();

/**
 * Importa un módulo con cache busting automático
 * @param {string} modulePath - Ruta del módulo a importar
 * @returns {Promise<Module>}
 */
export const importModule = async (modulePath) => {
    const versionedPath = `${modulePath}?v=${CACHE_VERSION}`;
    return import(versionedPath);
};

/**
 * Carga un componente HTML con cache busting
 * @param {string} url - URL del componente HTML
 * @param {string} containerId - ID del contenedor donde inyectar el HTML
 */
export const loadComponent = async (url, containerId) => {
    try {
        const versionedUrl = `${url}?v=${CACHE_VERSION}`;
        const response = await fetch(versionedUrl, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
        }
    } catch (error) {
        console.error(`Error cargando ${url}:`, error);
    }
};