// --- VARIABLES GLOBALES ---
let editingProductId = null;

// --- FUNCIÓN DE VERIFICACIÓN DE DISPOSITIVO ---
const checkDevice = () => {
    const dashboardContainer = document.querySelector('#dashboard-container');
    const mobileBlocker = document.querySelector('#mobile-blocker');
    
    if (window.innerWidth < 1024) {
        dashboardContainer.classList.add('hidden');
        dashboardContainer.classList.remove('flex');
        mobileBlocker.classList.remove('hidden');
        mobileBlocker.classList.add('flex');
    } else {
        dashboardContainer.classList.remove('hidden');
        dashboardContainer.classList.add('flex');
        mobileBlocker.classList.add('hidden');
        mobileBlocker.classList.remove('flex');
    }
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    checkDevice();
    window.addEventListener('resize', checkDevice);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return; 
    }

    setupWelcomeMessage(user);
    setupNavigation();
    setupProductManagement();

    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
    if (roleData && ['dueno', 'empleado'].includes(roleData.role)) {
        document.querySelector('#products-link').classList.remove('hidden');
        document.querySelector('#products-link').classList.add('flex');
    }

    document.querySelector('#logout-button').addEventListener('click', async (event) => {
        event.preventDefault();
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });
});

// --- LÓGICA DE NAVEGACIÓN ---
const setupNavigation = () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetViewId = link.dataset.view;
            views.forEach(view => view.classList.remove('active'));
            navLinks.forEach(navLink => {
                // ✅ Remueve las nuevas clases de color
                navLink.classList.remove('bg-teal-100', 'text-teal-800');
                navLink.classList.add('text-gray-600');
            });
            const targetView = document.querySelector(`#${targetViewId}`);
            if (targetView) {
                targetView.classList.add('active');
                // ✅ Agrega las nuevas clases de color
                link.classList.add('bg-teal-100', 'text-teal-800');
            }
            if (targetViewId === 'products-view') {
                fetchAndDisplayProducts();
            }
        });
    });
};

// --- LÓGICA DE BIENVENIDA ---
const setupWelcomeMessage = (user) => {
    const userName = user.user_metadata.nombre;
    const welcomeMessageElement = document.querySelector('#welcome-message');
    welcomeMessageElement.textContent = userName ? `¡Bienvenido de vuelta, ${userName}!` : '¡Bienvenido!';
};

// --- LÓGICA DE GESTIÓN DE PRODUCTOS (SIN CAMBIOS) ---
const setupProductManagement = () => {
    document.querySelector('#add-product-button').addEventListener('click', () => showModal(false));
    document.querySelector('#cancel-button').addEventListener('click', hideModal);
    document.querySelector('#product-image').addEventListener('change', handleImagePreview);
    document.querySelector('#product-form').addEventListener('submit', handleFormSubmit);
    document.querySelector('#product-table-body').addEventListener('click', handleTableClick);
};

const fetchAndDisplayProducts = async () => {
    const { data: productos, error } = await supabase.from('productos').select('*').order('id', { ascending: true });
    if (error) {
        console.error('Error al obtener productos:', error);
        return;
    }
    const tableBody = document.querySelector('#product-table-body');
    tableBody.innerHTML = ''; 
    productos.forEach(producto => {
        let statusClass = '';
        let statusText = '';
        if (producto.stock > 10) {
            statusClass = 'bg-green-100 text-green-800';
            statusText = 'En Stock';
        } else if (producto.stock > 0) {
            statusClass = 'bg-yellow-100 text-yellow-800';
            statusText = 'Stock Bajo';
        } else {
            statusClass = 'bg-red-100 text-red-800';
            statusText = 'Agotado';
        }

        const tableRow = `
            <tr class="hover:bg-gray-50">
                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 w-12 h-12">
                            <img class="w-full h-full rounded-md object-cover" src="${producto.imagen_url || 'https://via.placeholder.com/150'}" alt="${producto.nombre}" />
                        </div>
                        <div class="ml-4">
                            <p class="text-gray-900 font-semibold whitespace-no-wrap">${producto.nombre}</p>
                        </div>
                    </div>
                </td>
                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p class="text-gray-900 whitespace-no-wrap">SKU-${producto.id}</p>
                </td>
                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p class="text-gray-900 whitespace-no-wrap">${producto.stock}</p>
                </td>
                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <span class="relative inline-block px-3 py-1 font-semibold leading-tight ${statusClass} rounded-full">
                        <span class="relative">${statusText}</span>
                    </span>
                </td>
                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p class="text-gray-900 whitespace-no-wrap">S/ ${producto.precio.toFixed(2)}</p>
                </td>
                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <button data-id="${producto.id}" class="edit-button text-teal-600 hover:text-teal-900">
                        <ion-icon name="create-outline" class="text-xl"></ion-icon>
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += tableRow;
    });
};

async function uploadProductImage(file) {
    if (!file) return null;
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
    const { error } = await supabase.storage.from('imagenes-productos').upload(fileName, file);
    if (error) {
        console.error('Error al subir la imagen:', error);
        return null;
    }
    const { data: publicUrlData } = supabase.storage.from('imagenes-productos').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
}

const showModal = (isEdit = false, product = {}) => {
    const modalTitle = document.querySelector('#modal-title');
    const productForm = document.querySelector('#product-form');
    const imagePreview = document.querySelector('#image-preview');
    modalTitle.textContent = isEdit ? 'Editar Producto' : 'Agregar Nuevo Producto';
    editingProductId = isEdit ? product.id : null;
    productForm.name.value = product.nombre || '';
    productForm.price.value = product.precio || '';
    productForm.stock.value = product.stock || '';
    if (isEdit && product.imagen_url) {
        imagePreview.src = product.imagen_url;
        imagePreview.classList.remove('hidden');
    }
    document.querySelector('#product-modal').classList.remove('hidden');
};

const hideModal = () => {
    document.querySelector('#product-form').reset();
    editingProductId = null;
    const imagePreview = document.querySelector('#image-preview');
    imagePreview.src = '';
    imagePreview.classList.add('hidden');
    document.querySelector('#product-modal').classList.add('hidden');
};
        
const handleImagePreview = (event) => {
    const file = event.target.files[0];
    const imagePreview = document.querySelector('#image-preview');
    if (file) {
        imagePreview.src = URL.createObjectURL(file);
        imagePreview.classList.remove('hidden');
    }
};

const handleFormSubmit = async (event) => {
    event.preventDefault();
    const productForm = document.querySelector('#product-form');
    const productData = {
        nombre: productForm.name.value,
        precio: parseFloat(productForm.price.value),
        stock: parseInt(productForm.stock.value),
    };
    const imageFile = productForm.image.files[0];
    if (imageFile) {
        const imageUrl = await uploadProductImage(imageFile);
        if (imageUrl) {
            productData.imagen_url = imageUrl;
        } else {
            alert('Hubo un error al subir la imagen.');
            return;
        }
    }
    let error;
    if (editingProductId) {
        ({ error } = await supabase.from('productos').update(productData).eq('id', editingProductId));
    } else {
        ({ error } = await supabase.from('productos').insert([productData]));
    }
    if (error) {
        alert(`Error al guardar el producto: ${error.message}`);
    } else {
        alert(`¡Producto ${editingProductId ? 'actualizado' : 'agregado'} con éxito!`);
        hideModal();
        fetchAndDisplayProducts();
    }
};

const handleTableClick = async (event) => {
    const editButton = event.target.closest('.edit-button');
    if (editButton) {
        const productId = editButton.dataset.id;
        const { data: product, error } = await supabase.from('productos').select('*').eq('id', productId).single();
        if (error) {
            alert(`No se pudo obtener el producto: ${error.message}`);
        } else {
            showModal(true, product);
        }
    }
};