// --- VARIABLES GLOBALES ---
let editingProductId = null;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return; 
    }

    setupWelcomeMessage(user);
    setupNavigation();
    setupProductManagement(); // Configura la lógica de productos

    // Lógica de roles para mostrar el enlace de productos
    const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    if (!roleError && roleData && ['dueno', 'empleado'].includes(roleData.role)) {
        document.querySelector('#products-link').classList.remove('hidden');
        document.querySelector('#products-link').classList.add('flex');
    }

    // Lógica para cerrar sesión
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

            // Ocultar todas las vistas y quitar la clase activa de los enlaces
            views.forEach(view => view.classList.remove('active'));
            navLinks.forEach(navLink => {
                navLink.classList.remove('bg-blue-100', 'text-blue-800');
                navLink.classList.add('text-gray-600', 'hover:bg-gray-200');
            });
            
            // Mostrar la vista seleccionada y marcar el enlace como activo
            const targetView = document.querySelector(`#${targetViewId}`);
            if (targetView) {
                targetView.classList.add('active');
                link.classList.add('bg-blue-100', 'text-blue-800');
                link.classList.remove('text-gray-600', 'hover:bg-gray-200');
            }

            // Si se hace clic en productos, cargar los productos
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
    if (userName) {
        welcomeMessageElement.textContent = `¡Bienvenido de vuelta, ${userName}!`;
    } else {
        welcomeMessageElement.textContent = '¡Bienvenido!';
    }
};

// --- LÓGICA DE GESTIÓN DE PRODUCTOS ---
const setupProductManagement = () => {
    const addProductButton = document.querySelector('#add-product-button');
    const cancelButton = document.querySelector('#cancel-button');
    const productForm = document.querySelector('#product-form');
    const imageInput = document.querySelector('#product-image');

    addProductButton.addEventListener('click', () => showModal(false));
    cancelButton.addEventListener('click', hideModal);
    imageInput.addEventListener('change', handleImagePreview);
    productForm.addEventListener('submit', handleFormSubmit);
    document.querySelector('#product-grid').addEventListener('click', handleGridClick);
};

const fetchAndDisplayProducts = async () => {
    const { data: productos, error } = await supabase.from('productos').select('*').order('id', { ascending: true });
    if (error) {
        console.error('Error al obtener productos:', error);
        return;
    }
    const productGrid = document.querySelector('#product-grid');
    productGrid.innerHTML = ''; 
    productos.forEach(producto => {
        const productCard = `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden transition-transform transform hover:-translate-y-1">
                <img class="h-48 w-full object-contain bg-gray-100" src="${producto.imagen_url || 'https://via.placeholder.com/400x300.png?text=Sin+Imagen'}" alt="Imagen de ${producto.nombre}">
                <div class="p-4">
                    <h3 class="text-lg font-bold text-gray-800">${producto.nombre}</h3>
                    <p class="text-gray-600 mt-1">S/ ${producto.precio.toFixed(2)}</p>
                    <p class="text-sm text-gray-500 mt-1">Stock: ${producto.stock}</p>
                    <div class="mt-4">
                        <button data-id="${producto.id}" class="edit-button text-sm text-blue-600 hover:text-blue-800 font-semibold">Editar</button>
                    </div>
                </div>
            </div>`;
        productGrid.innerHTML += productCard;
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

const handleGridClick = async (event) => {
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