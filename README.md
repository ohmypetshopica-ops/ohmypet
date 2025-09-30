# OhMyPet - Tienda y Estética Canina

Este documento presenta una descripción completa del prototipo final de OhMyPet, una solución web integral para la gestión de servicios y productos para mascotas. El proyecto está diseñado con un flujo claro y una arquitectura modular que facilita su comprensión y presentación.

---

## 🚀 Funcionalidades Principales

El sistema se divide en dos grandes áreas para mejorar la experiencia de usuario y la gestión interna:

### 1. Área de Cliente
Dirigida a los dueños de mascotas, esta área facilita la interacción con la tienda y sus servicios.

* **Autenticación de Usuarios:** Permite a los clientes registrarse y acceder de forma segura a su perfil.
* **Gestión de Perfil y Mascotas:** Los clientes pueden visualizar su información personal y, de manera centralizada, agregar, editar y eliminar los datos de sus mascotas.
* **Sistema de Citas:** Un flujo guiado en tres pasos permite agendar citas para servicios de estética. Al finalizar, el sistema genera automáticamente un mensaje de WhatsApp con los detalles de la cita para la tienda.
* **Tienda en Línea:** Un catálogo de productos en stock que los clientes pueden agregar a un carrito virtual. El pedido se finaliza generando un mensaje de WhatsApp para el equipo de OhMyPet.

### 2. Panel Administrativo
Restringido a empleados y dueños, este panel facilita la administración del negocio.

* **Acceso Restringido:** El acceso al panel se limita a usuarios con un rol de "dueño" o "empleado".
* **Dashboard de Resumen:** Muestra un resumen de clientes y mascotas registrados, proporcionando una visión general del negocio.
* **Gestión de Datos:** Permite al equipo administrativo ver y gestionar los productos, servicios y citas agendadas.

---

## 🔁 Flujo de Procesos

El sistema OhMyPet está diseñado para guiar a dos tipos de usuarios a través de flujos de trabajo específicos: el **cliente** y el **administrador**.

### Flujo del Cliente
1.  **Inicio (Usuario No Autenticado):** Al acceder a la página principal (`index.html`), el usuario ve una descripción de los servicios. La barra de navegación superior ofrece opciones para **"Registrarse"** o **"Iniciar Sesión"**.
2.  **Autenticación:** El usuario puede crear una nueva cuenta o iniciar sesión. En caso de olvidar su contraseña, el sistema le permite solicitar un enlace de recuperación por correo electrónico.
3.  **Interacción (Usuario Autenticado):** Una vez que inicia sesión, la barra de navegación cambia para mostrar su perfil. El cliente puede gestionar su perfil y sus mascotas, agendar citas y comprar productos en la tienda.

### Flujo del Administrador
1.  **Acceso:** Un formulario de inicio de sesión dedicado (`admin-login.html`) restringe el acceso al panel administrativo solo a usuarios con roles específicos de "dueño" o "empleado".
2.  **Dashboard:** El administrador accede a un panel centralizado donde puede monitorear las métricas clave y gestionar listas de productos y citas.

---

## 🎨 Diseño y Experiencia de Usuario

* **Interfaz Responsiva:** El diseño se adapta a diferentes tamaños de pantalla (escritorio y móvil) utilizando **Tailwind CSS**.
* **Navegación Dinámica:** La barra de navegación cambia automáticamente para mostrar opciones de perfil/cerrar sesión si el usuario está autenticado, o botones de registro/inicio de sesión si es un invitado.
* **Sistema de Modales:** Se utilizan ventanas modales para el carrito de compras y la adición de productos en el dashboard, lo que evita recargar la página y mejora la fluidez.
* **Feedback Visual:** Se muestran mensajes de error y notificaciones claras al usuario para guiarlo en cada proceso, como un banner de confirmación después de agendar una cita o mensajes de error en los formularios de login.

---

## 📊 Arquitectura y Tecnologías

* **Arquitectura:** Es una aplicación **Single Page Application (SPA)**, lo que significa que la navegación entre secciones es fluida y no requiere recargas completas de la página. El código está organizado de manera modular para mejorar la mantenibilidad y escalabilidad.
* **Tecnologías Clave:**
    * **Supabase:** Funciona como el "Backend como Servicio" (BaaS). Se encarga de la **autenticación** y la **base de datos**, almacenando la información de usuarios, mascotas, citas y productos.
    * **Tailwind CSS:** Un *framework* CSS de primera utilidad para un diseño rápido y consistente.
    * **JavaScript (ES Modules):** El código está escrito con módulos nativos de JavaScript. Esto permite organizar la lógica en archivos separados y reutilizar funciones, como la comunicación con Supabase, en diferentes partes del proyecto sin duplicar el código.

---

## 💻 Enfoque de Desarrollo

* **Modularización:** El código está organizado en módulos (`core`, `modules`, `js`) para mejorar la mantenibilidad y escalabilidad. La lógica de la base de datos se abstrae en archivos `.api.js` para mantener los archivos de la interfaz de usuario más limpios.
* **Optimización del Rendimiento:**
    * Las consultas a la base de datos se ejecutan en paralelo mediante `Promise.all` para optimizar la carga de información en el perfil de usuario y el dashboard, reduciendo los tiempos de espera.
    * El carrito de compras utiliza `localStorage` para el manejo del estado, lo que evita llamadas innecesarias a la base de datos y proporciona una experiencia fluida al cliente.