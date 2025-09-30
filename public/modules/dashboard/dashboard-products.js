// public/modules/dashboard/dashboard-products.js

import { supabase } from '../../core/supabase.js';
import { getProducts, addProduct, updateProduct, deleteProduct } from './dashboard.api.js';
import { createProductRow } from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const productsTableBody = document.querySelector('#products-table-body');
const headerTitle = document.querySelector('#header-title');
const addProductButton = document.querySelector('#add-product-button');

// --- ELEMENTOS DEL MODAL ---
const productModal = document.querySelector('#product-modal');
const closeModalButton = document.querySelector('#close-modal-button');
const productForm = document.querySelector('#product-form');
const productModalTitle = document.querySelector('#product-modal-title');
const productIdInput = document.querySelector('#product-id');
const existingImageUrlInput = document.querySelector('#existing-image-url');

// --- RENDERIZADO DE LA TABLA ---
const renderProducts = async () => {
    productsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-500">Cargando...</td></tr>`;
    const products = await getProducts();
    if (products.length > 0) {
        productsTableBody.innerHTML = products.map(createProductRow).join('');
    } else {
        productsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-500">No hay productos registrados.</td></tr>`;
    }
};

// --- LÓGICA DEL MODAL ---
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
    
    // Llenar el formulario con los datos del producto
    document.querySelector('#product-name').value = product.name;
    document.querySelector('#product-description').value = product.description || '';
    document.querySelector('#product-price').value = product.price;
    document.querySelector('#product-stock').value = product.stock;

    productModal.classList.remove('hidden');
};

const closeModal = () => {
    productModal.classList.add('hidden');
};

// --- MANEJO DE EVENTOS ---
const setupEventListeners = () => {
    addProductButton.addEventListener('click', openModalForNew);
    closeModalButton.addEventListener('click', closeModal);
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) closeModal();
    });

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
                    await renderProducts();
                } else {
                    alert('Hubo un error al eliminar el producto.');
                }
            }
        }
    });

    // Manejo del formulario
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = productForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';

        const formData = new FormData(productForm);
        const imageFile = formData.get('image_file');
        let imageUrl = existingImageUrlInput.value;

        // Si se subió un nuevo archivo, lo procesamos
        if (imageFile && imageFile.size > 0) {
            const fileName = `products/${Date.now()}_${imageFile.name}`;
            const { data, error } = await supabase.storage.from('product_images').upload(fileName, imageFile);
            if (error) {
                alert('Error al subir la imagen: ' + error.message);
                submitButton.disabled = false;
                submitButton.textContent = 'Guardar Producto';
                return;
            }
            // Obtenemos la URL pública del archivo recién subido
            const { data: { publicUrl } } = supabase.storage.from('product_images').getPublicUrl(fileName);
            imageUrl = publicUrl;
        }

        const productData = {
            name: formData.get('name'),
            description: formData.get('description'),
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
            await renderProducts();
        } else {
            alert(`Error al guardar el producto.`);
        }
        
        submitButton.disabled = false;
        submitButton.textContent = 'Guardar Producto';
    });
};

// --- INICIALIZACIÓN ---
const initializeProductsSection = async () => {
    if (headerTitle) headerTitle.textContent = 'Gestión de Productos';
    await renderProducts();
    setupEventListeners();
};

document.addEventListener('DOMContentLoaded', initializeProductsSection);