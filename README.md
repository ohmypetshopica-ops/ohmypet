# OhMyPet - Tienda y Estética Canina en Ica, Perú

Este proyecto es una solución web para la gestión de servicios de estética y productos para mascotas, diseñado para clientes y empleados de la tienda OhMyPet en Ica.

---

## 🚀 Funcionalidades Principales

* **Autenticación de Usuarios:** Registro e inicio de sesión seguro para clientes y empleados.
* **Gestión de Perfil:** Los clientes pueden ver su información, así como agregar, editar y eliminar los datos de sus mascotas.
* **Sistema de Citas:** Permite a los clientes agendar citas para servicios de estética. La solicitud se envía automáticamente a través de WhatsApp.
* **Tienda en Línea:** Un catálogo de productos donde los clientes pueden agregar artículos a un carrito y generar un mensaje de pedido por WhatsApp.
* **Dashboard Administrativo:** Un panel para empleados y dueños que muestra estadísticas clave (clientes, mascotas) y permite la gestión de productos y servicios.

---

## 🛠️ Tecnologías Utilizadas

* **Front-end:** HTML5, CSS3 (con **Tailwind CSS** para un desarrollo rápido y escalable), y JavaScript ES6 para la lógica del cliente.
* **Back-end/Base de Datos:** **Supabase**, una plataforma de código abierto que proporciona autenticación, base de datos en tiempo real y almacenamiento de archivos.

---

## 📦 Cómo Iniciar el Proyecto

1.  **Clona el repositorio:**
    ```bash
    git clone [URL_DEL_REPOSITORIO]
    cd ohmypetshopica-ops/ohmypet/ohmypet-ef8011efaceda99faaaf56342ddc7bdbce6e9036/
    ```

2.  **Configura Supabase:**
    * Crea un nuevo proyecto en Supabase.
    * Crea las tablas necesarias: `profiles`, `pets`, `products`, `services`, y `appointments`.
    * Asegúrate de configurar los permisos de lectura/escritura (RLS) apropiadamente.
    * Copia tus claves `SUPABASE_URL` y `SUPABASE_ANON_KEY` y pégalas en el archivo `/public/core/supabase.js`.

3.  **Ejecuta la Aplicación:**
    * Dado que es un proyecto de solo front-end, no necesitas un servidor Node.js.
    * Simplemente abre los archivos HTML en tu navegador. Por ejemplo:
        * `index.html` para la página principal.
        * `public/modules/login/login.html` para el inicio de sesión del cliente.
        * `public/modules/admin-login/admin-login.html` para el inicio de sesión administrativo.

---

## 📄 Estructura de Archivos

* `public/`: Contiene todos los archivos estáticos de la aplicación.
    * `assets/`: Imágenes e íconos.
    * `core/`: Archivos base como la configuración de Supabase (`supabase.js`) y la lógica de autenticación.
    * `js/`: Scripts globales y de lógica del carrito.
    * `modules/`: Directorios para cada módulo de la aplicación (e.g., `login`, `profile`, `store`, `dashboard`).
* `README.md`: Este archivo.

---