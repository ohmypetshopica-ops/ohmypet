document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayProducts();
});

const fetchAndDisplayProducts = async () => {
    // 1. Obtener los productos desde Supabase
    const { data: productos, error } = await supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });

    if (error) {
        console.error('Error al obtener productos:', error);
        return;
    }

    // 2. Obtener el contenedor de la parrilla
    const productGrid = document.querySelector('#product-grid');
    if (!productGrid) {
        console.error('El contenedor de productos no se encontró.');
        return;
    }
    
    // 3. Limpiar la parrilla y mostrar los productos
    productGrid.innerHTML = ''; 
    productos.forEach(producto => {
        // Crear la tarjeta de producto
        const productCard = `
            <div class="bg-white rounded-xl shadow-md overflow-hidden transition-transform transform hover:-translate-y-2 hover:shadow-xl">
                <div class="h-56 flex items-center justify-center bg-gray-100 p-4">
                    <img class="max-h-full max-w-full object-contain" src="${producto.imagen_url || 'https://via.placeholder.com/400x300.png?text=Sin+Imagen'}" alt="Imagen de ${producto.nombre}">
                </div>
                <div class="p-5">
                    <h3 class="text-lg font-bold text-gray-900 truncate">${producto.nombre}</h3>
                    <p class="text-2xl font-bold text-blue-800 mt-2">S/ ${producto.precio.toFixed(2)}</p>
                    <p class="text-sm text-gray-500 mt-1">Stock disponible: ${producto.stock}</p>
                    <button class="w-full mt-4 bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
                        Agregar al Carrito
                    </button>
                </div>
            </div>
        `;
        // Añadir la tarjeta a la parrilla
        productGrid.innerHTML += productCard;
    });
};