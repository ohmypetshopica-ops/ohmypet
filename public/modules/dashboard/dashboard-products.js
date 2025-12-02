// public/modules/dashboard/dashboard-products.js

import { supabase } from '../../core/supabase.js';
// MODIFICADO: Importar la nueva función paginada y las funciones existentes
import { getProductsPaginated, addProduct, updateProduct, deleteProduct } from './products.api.js';
import { createProductRow } from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const productsTableBody = document.querySelector('#products-table-body');
const headerTitle = document.querySelector('#header-title');
const addProductButton = document.querySelector('#add-product-button');

// --- NUEVO: Selectores de filtros y paginación ---
const productSearchInput = document.querySelector('#product-search-input');
const categoryFilterSelect = document.querySelector('#category-filter-select');
const clearFiltersBtn = document.querySelector('#clear-filters-btn');
const paginationContainer = document.querySelector('#pagination-container');

// --- ELEMENTOS DEL MODAL (Sin cambios) ---
const productModal = document.querySelector('#product-modal');
const closeModalButton = document.querySelector('#close-modal-button');
const productForm = document.querySelector('#product-form');
const productModalTitle = document.querySelector('#product-modal-title');
const productIdInput = document.querySelector('#product-id');
const existingImageUrlInput = document.querySelector('#existing-image-url');

// --- NUEVO: Estado de paginación y filtros ---
let currentPage = 1;
const itemsPerPage = 10; // Puedes ajustar esto
let currentSearch = '';
let currentCategory = '';
let totalProducts = 0;

// --- RENDERIZADO DE LA TABLA (MODIFICADO) ---
// Ahora solo renderiza los productos que recibe, no los busca
const renderProducts = (products) => {
    if (products.length > 0) {
        productsTableBody.innerHTML = products.map(createProductRow).join('');
    } else {
        productsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">No se encontraron productos con los filtros actuales.</td></tr>`;
    }
};

// --- NUEVO: Renderizado de paginación ---
const renderPagination = () => {
    const totalPages = Math.ceil(totalProducts / itemsPerPage);
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center justify-center space-x-2 mt-4 mb-4">';
    
    // Botón Anterior
    if (currentPage > 1) {
        paginationHTML += `<button class="page-btn px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors" data-page="${currentPage - 1}">Anterior</button>`;
    }

    // Números de Página
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'bg-green-600 text-white' : 'border border-gray-300 hover:bg-gray-100';
        paginationHTML += `<button class="page-btn px-3 py-1.5 text-sm rounded-lg transition-colors ${activeClass}" data-page="${i}">${i}</button>`;
    }

    // Botón Siguiente
    if (currentPage < totalPages) {
        paginationHTML += `<button class="page-btn px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors" data-page="${currentPage + 1}">Siguiente</button>`;
    }

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;

    // Listeners para los botones de paginación
    paginationContainer.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            currentPage = parseInt(btn.dataset.page);
            await loadAndRenderProducts();
        });
    });
};

// --- NUEVO: Cargar y renderizar productos (función principal) ---
const loadAndRenderProducts = async () => {
    productsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">Cargando...</td></tr>`;
    
    // Obtener valores actuales de los filtros
    currentSearch = productSearchInput.value;
    currentCategory = categoryFilterSelect.value;

    // Llamar a la API paginada
    const { data, count } = await getProductsPaginated(currentPage, itemsPerPage, currentSearch, currentCategory);
    
    totalProducts = count || 0;
    renderProducts(data);
    renderPagination();
};

// --- NUEVO: Popular el filtro de categorías ---
const populateCategoryFilter = async () => {
    // Obtener todas las categorías únicas
    const { data, error } = await supabase
        .from('products')
        .select('category');
    
    if (error) {
        console.error('Error al cargar categorías:', error);
        return;
    }

    // Crear una lista única de categorías, filtrar nulos/vacíos y ordenar
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))].sort();
    
    // Limpiar opciones existentes (excepto la primera)
    categoryFilterSelect.innerHTML = '<option value="">Todas las categorías</option>';
    
    // Llenar el select
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        // Capitalizar la primera letra
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categoryFilterSelect.appendChild(option);
    });
};


// --- LÓGICA DEL MODAL (Sin cambios) ---
const openModalForNew = () => {
    productForm.reset();
    productIdInput.value = '';
    existingImageUrlInput.value = '';
    productModalTitle.textContent = 'Agregar Nuevo Producto';
    productModal.classList.remove('hidden');
};

const openModalForEdit = (product) => {
    productForm.reset();
    productIdInput.value = product.id;
    existingImageUrlInput.value = product.image_url || '';
    productModalTitle.textContent = 'Editar Producto';
    
    document.querySelector('#product-name').value = product.name;
    document.querySelector('#product-description').value = product.description || '';
    document.querySelector('#product-category').value = product.category || '';
    document.querySelector('#product-price').value = product.price;
    document.querySelector('#product-stock').value = product.stock;

    productModal.classList.remove('hidden');
};

const closeModal = () => {
    productModal.classList.add('hidden');
};

// --- MANEJO DE EVENTOS (MODIFICADO) ---
const setupEventListeners = () => {
    addProductButton.addEventListener('click', openModalForNew);
    closeModalButton.addEventListener('click', closeModal);
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) closeModal();
    });

    // --- NUEVO: Listeners de filtros ---
    let searchDebounce;
    productSearchInput.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        // Esperar 300ms después de que el usuario deje de escribir
        searchDebounce = setTimeout(() => {
            currentPage = 1; // Resetear a la página 1
            loadAndRenderProducts();
        }, 300);
    });

    categoryFilterSelect.addEventListener('change', () => {
        currentPage = 1; // Resetear a la página 1
        loadAndRenderProducts();
    });

    clearFiltersBtn.addEventListener('click', () => {
        currentPage = 1; // Resetear a la página 1
        productSearchInput.value = '';
        categoryFilterSelect.value = '';
        loadAndRenderProducts();
    });
    // --- FIN: Listeners de filtros ---


    // Manejo de acciones (Editar y Eliminar)
    productsTableBody.addEventListener('click', async (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const productData = JSON.parse(button.dataset.product || '{}');
        
        if (action === 'edit') {
            openModalForEdit(productData);
        } else if (action === 'delete') {
            if (confirm(`¿Estás seguro de que quieres eliminar el producto "${productData.name}"?`)) {
                const { success } = await deleteProduct(productData.id);
                if (success) {
                    // MODIFICADO: Recargar la vista actual paginada
                    await loadAndRenderProducts();
                    // Actualizar el filtro de categorías si esa fue la última
                    await populateCategoryFilter(); 
                } else {
                    alert('Hubo un error al eliminar el producto.');
                }
            }
        }
    });

    // Manejo del formulario (MODIFICADO en caso de éxito)
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = productForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';

        const formData = new FormData(productForm);
        const imageFile = formData.get('image_file');
        let imageUrl = existingImageUrlInput.value;

        if (imageFile && imageFile.size > 0) {
            const fileName = `products/${Date.now()}_${imageFile.name}`;
            const { data, error } = await supabase.storage.from('product_images').upload(fileName, imageFile);
            if (error) {
                alert('Error al subir la imagen: ' + error.message);
                submitButton.disabled = false;
                submitButton.textContent = 'Guardar Producto';
                return;
            }
            const { data: { publicUrl } } = supabase.storage.from('product_images').getPublicUrl(fileName);
            imageUrl = publicUrl;
        }

        const productData = {
            name: formData.get('name'),
            description: formData.get('description'),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            stock: parseInt(formData.get('stock')),
            image_url: imageUrl,
        };

        const productId = productIdInput.value;
        const { success } = productId 
            ? await updateProduct(productId, productData) 
            : await addProduct(productData);
        
        if (success) {
            closeModal();
            // MODIFICADO: Recargar la vista actual paginada
            await loadAndRenderProducts();
            // NUEVO: Actualizar el filtro de categorías
            await populateCategoryFilter();
        } else {
            alert(`Error al guardar el producto.`);
        }
        
        submitButton.disabled = false;
        submitButton.textContent = 'Guardar Producto';
    });
};

// --- INICIALIZACIÓN (MODIFICADO) ---
const initializeProductsSection = async () => {
    if (headerTitle) headerTitle.textContent = 'Gestión de Productos';
    
    // NUEVO: Cargar filtros y luego productos
    await populateCategoryFilter();
    await loadAndRenderProducts();
    
    // Configurar todos los listeners
    setupEventListeners();
};

document.addEventListener('DOMContentLoaded', initializeProductsSection);