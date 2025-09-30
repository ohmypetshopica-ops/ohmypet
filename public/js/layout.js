// public/js/layout.js

/**
 * Carga un componente HTML desde una URL en un contenedor específico.
 * @param {string} url - La ruta al archivo del componente HTML.
 * @param {string} containerId - El ID del elemento donde se inyectará el HTML.
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
 * Carga todos los componentes comunes del layout y notifica cuando ha terminado.
 */
const loadLayout = async () => {
    await Promise.all([
        loadComponent('/public/components/header.html', 'header-container'),
        loadComponent('/public/components/footer.html', 'footer-container')
    ]);
    // Disparamos un evento personalizado para avisar que el layout está listo.
    document.dispatchEvent(new CustomEvent('layoutReady'));
};

document.addEventListener('DOMContentLoaded', loadLayout);