import { supabase } from '../../core/supabase.js';

// --- FUNCIÓN PARA CARGAR DATOS DEL USUARIO ---
const loadUserData = async () => {
    const ownerNameInput = document.getElementById('owner-name');
    if (!ownerNameInput) return;

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error al cargar el perfil del usuario:', error);
            ownerNameInput.value = 'Error al cargar nombre';
            return;
        }

        if (profile && profile.full_name) {
            ownerNameInput.value = profile.full_name;
        } else {
            ownerNameInput.value = user.email;
        }
    }
};

// --- LÓGICA DEL FORMULARIO (VERSIÓN FINAL) ---
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();

    const appointmentForm = document.getElementById('appointment-form');

    if (appointmentForm) {
        appointmentForm.addEventListener('submit', (event) => {
            event.preventDefault();

            // --- Recolección de datos ---
            const ownerPhoneNumber = '51904343849';
            const ownerName = document.getElementById('owner-name').value;
            const petName = document.getElementById('pet-name').value.trim();
            const petBreed = document.getElementById('pet-breed').value.trim();
            const petSize = document.getElementById('pet-size').value;
            const appointmentDate = document.getElementById('appointment-date').value;
            const appointmentTime = document.getElementById('appointment-time').value;
            const extraNotes = document.getElementById('extra-notes').value.trim();

            // --- Validación ---
            if (!petName || !appointmentDate || !appointmentTime) {
                alert('Por favor, completa todos los campos requeridos: Nombre de la mascota, Fecha y Hora.');
                return;
            }

            // --- Formateo del mensaje (versión limpia sin emojis) ---
            const messageParts = [
                "*¡Nueva Solicitud de Cita!*",
                "",
                `*Cliente:* ${ownerName}`,
                `*Mascota:* ${petName}`,
                `*Raza:* ${petBreed}`,
                `*Tamaño:* ${petSize}`,
                `*Fecha:* ${appointmentDate}`,
                `*Hora:* ${appointmentTime}`
            ];

            if (extraNotes) {
                messageParts.push("");
                messageParts.push("*Notas Adicionales:*");
                messageParts.push(extraNotes);
            }
            
            const message = messageParts.join('\n');

            // --- Construcción y apertura de URL ---
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/${ownerPhoneNumber}?text=${encodedMessage}`;

            window.open(whatsappUrl, '_blank');
            
            // --- ¡NUEVO! Redirigir a la página de inicio con un parámetro ---
            window.location.href = '/public/index.html?from=schedule';
        });
    }
});