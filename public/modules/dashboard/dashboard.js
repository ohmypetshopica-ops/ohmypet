// Lógica principal para la página del dashboard

// Importamos el cliente de supabase desde la misma fuente que auth.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ---- RECUERDA USAR TUS PROPIAS CLAVES ----
const SUPABASE_URL = 'https://halhpbhglyouufmveqic.supabase.co'; // Pega aquí tu URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGhwYmhnbHlvdXVmbXZlcWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODA5MTMsImV4cCI6MjA3MjY1NjkxM30.Rjvm_ujTXveNyYrF5ZKqsdFsV4-_SsGYKyo8bSS8wT4';   // Pega aquí tu clave anónima

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ELEMENTOS DEL DOM ---
const userInfoDiv = document.querySelector('#user-info');
const ownerContent = document.querySelector('#owner-content');
const employeeContent = document.querySelector('#employee-content');
const clientContent = document.querySelector('#client-content');
const logoutButton = document.querySelector('#logout-button');

// --- FUNCIÓN PARA OBTENER DATOS DEL USUARIO ---
const loadUserProfile = async () => {
    // 1. Obtenemos el usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // 2. Si hay un usuario, buscamos su perfil en nuestra tabla "profiles"
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, role') // Pedimos solo el nombre completo y el rol
            .eq('id', user.id)         // Donde el ID coincida
            .single();                 // Esperamos solo un resultado

        if (error) {
            console.error('Error al obtener el perfil:', error);
            userInfoDiv.innerHTML = `<p class="text-red-500">No se pudo cargar el perfil.</p>`;
            return;
        }

        if (profile) {
            // 3. Mostramos la información básica del perfil
            userInfoDiv.innerHTML = `
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Nombre:</strong> ${profile.full_name || 'No especificado'}</p>
                <p><strong>Rol:</strong> <span class="font-bold capitalize">${profile.role}</span></p>
            `;

            // 4. Mostramos el contenido según el rol del usuario
            switch (profile.role) {
                case 'dueño':
                    ownerContent.classList.remove('hidden');
                    break;
                case 'empleado':
                    employeeContent.classList.remove('hidden');
                    break;
                case 'cliente':
                    clientContent.classList.remove('hidden');
                    break;
            }
        }
    }
};

// --- MANEJO DEL LOGOUT ---
logoutButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const { error } = await supabase.auth.signOut(); // Cerramos la sesión en Supabase

    if (error) {
        console.error('Error al cerrar sesión:', error);
    } else {
        // Si el logout es exitoso, limpiamos la sesión y redirigimos al login
        window.location.href = '/public/modules/login/login.html';
    }
});

// --- INICIALIZACIÓN ---
// Llamamos a la función para cargar los datos del perfil cuando la página se carga
loadUserProfile();