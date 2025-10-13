import { initHeaderWithRetry, refreshCartBadge } from '../../js/header.js';

/**
 * Carga el header en la tienda
 */
const loadStoreHeader = async () => {
    console.log('📦 Cargando header de tienda...');
    
    try {
        const response = await fetch('/public/components/header.html');
        if (!response.ok) throw new Error('Error al cargar header');
        
        const html = await response.text();
        const container = document.getElementById('header-container');
        
        if (container) {
            container.innerHTML = html;
        }
        
        console.log('✅ Header de tienda cargado');
        
        // Inicializar header
        await initHeaderWithRetry();
        
        // Exponer función para actualizar badge
        window.refreshCartBadge = refreshCartBadge;
        
        // IMPORTANTE: Disparar evento de que la tienda está lista
        document.dispatchEvent(new CustomEvent('storeReady'));
        console.log('🎉 Tienda lista para cargar productos');
        
    } catch (error) {
        console.error('Error cargando header:', error);
    }
};

document.addEventListener('DOMContentLoaded', loadStoreHeader);