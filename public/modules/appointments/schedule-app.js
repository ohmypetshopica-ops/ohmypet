// public/modules/appointments/schedule-app.js

import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const steps = document.querySelectorAll(".step");
const petOptionsContainer = document.getElementById("pet-options");
const timeOptionsContainer = document.getElementById("time-options");
const dateInput = document.getElementById("appointment-date");
const noPetsMessage = document.getElementById("no-pets-message");
const nextBtnStep1 = document.getElementById("next-btn-step1");
const confirmBtn = document.getElementById("confirm-btn");

// --- ESTADO DE LA APLICACIÓN ---
let currentStep = 0;
let selectedPet = null;
let selectedDate = null;
let selectedTime = null;
let clientFullName = 'Cliente';
let currentUser = null; 

// --- LÓGICA DE LA APLICACIÓN ---

/**
 * Carga los datos del usuario y sus mascotas.
 */
const loadUserDataAndPets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = '/public/modules/login/login.html';
        return;
    }
    currentUser = user;
    
    const [{ data: profile }, { data: pets }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('pets').select('id, name').eq('owner_id', user.id)
    ]);
    
    if (profile) clientFullName = profile.full_name;
    
    if (pets && pets.length > 0) {
        noPetsMessage.classList.add('hidden');
        nextBtnStep1.classList.remove('hidden');
        petOptionsContainer.innerHTML = '';
        pets.forEach(pet => {
            const btn = document.createElement("button");
            btn.className = "option-btn bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-200 font-medium transition-colors duration-200";
            btn.textContent = `${pet.name} 🐾`;
            btn.onclick = () => {
                document.querySelectorAll("#pet-options .option-btn").forEach(b => b.classList.remove("bg-green-700", "text-white"));
                btn.classList.add("bg-green-700", "text-white");
                selectedPet = pet;
            };
            petOptionsContainer.appendChild(btn);
        });
    } else {
        petOptionsContainer.innerHTML = '';
        noPetsMessage.classList.remove('hidden');
        nextBtnStep1.classList.add('hidden');
    }
};

/**
 * Dibuja los botones de las horas, deshabilitando las que ya están ocupadas.
 * @param {string[]} bookedTimes - Un array con las horas ya reservadas.
 */
const renderTimeOptions = (bookedTimes = []) => {
    // 1. NUEVO HORARIO DE 9:00 A 16:00 EN INTERVALOS DE 30 MIN
    const hours = [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
        "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", 
        "15:00", "15:30", "16:00"
    ];
    timeOptionsContainer.innerHTML = ''; 
    hours.forEach(hour => {
        const isBooked = bookedTimes.includes(hour);
        const btn = document.createElement("button");
        btn.textContent = hour;
        btn.disabled = isBooked;
        
        if (isBooked) {
            btn.className = "option-btn bg-gray-200 text-gray-400 px-4 py-2 rounded-lg cursor-not-allowed line-through";
        } else {
            btn.className = "option-btn bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-200 font-medium transition-colors duration-200";
            btn.onclick = () => {
                // 2. MEJORA VISUAL AL SELECCIONAR
                // Quita el estilo seleccionado de cualquier otro botón
                const currentSelected = timeOptionsContainer.querySelector('.selected');
                if (currentSelected) {
                    currentSelected.classList.remove('selected', 'bg-green-700', 'text-white');
                }
                // Añade el estilo al botón presionado
                btn.classList.add('selected', 'bg-green-700', 'text-white');
                selectedTime = hour;
            };
        }
        
        timeOptionsContainer.appendChild(btn);
    });
};

/**
 * Revisa la disponibilidad de horarios para la fecha seleccionada.
 */
const handleDateChange = async () => {
    selectedDate = dateInput.value;
    if (!selectedDate) {
        renderTimeOptions([]);
        return;
    }

    timeOptionsContainer.innerHTML = '<p class="text-sm text-gray-500">Cargando disponibilidad...</p>';

    // 3. VALIDACIÓN CORREGIDA
    const { data: appointments, error } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('appointment_date', selectedDate)
        .in('status', ['pendiente', 'confirmada']);
    
    if (error) {
        console.error("Error al verificar horarios:", error);
        timeOptionsContainer.innerHTML = '<p class="text-sm text-red-500">No se pudo verificar la disponibilidad.</p>';
        return;
    }
    
    // Para depurar, podemos ver en la consola qué horas nos devuelve la base de datos
    console.log('Horas ocupadas para la fecha', selectedDate, appointments);
    
    const bookedTimes = appointments.map(app => app.appointment_time);
    renderTimeOptions(bookedTimes);
};

/**
 * Muestra el paso actual del formulario.
 */
const showStep = (index) => {
    steps.forEach((step, i) => step.classList.toggle("hidden", i !== index));
    currentStep = index;
};

/**
 * Configura los eventos de navegación y confirmación.
 */
const initializeNavigation = () => {
    dateInput.min = new Date().toISOString().split("T")[0];
    dateInput.addEventListener('change', handleDateChange);
    
    document.querySelectorAll(".next-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (currentStep === 0 && !selectedPet) return alert("Por favor, selecciona una mascota.");
            if (currentStep === 1 && (!selectedDate || !selectedTime)) return alert("Por favor, selecciona fecha y hora.");
            if (currentStep < steps.length - 1) showStep(currentStep + 1);
        });
    });

    document.querySelectorAll(".prev-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (currentStep > 0) showStep(currentStep - 1);
        });
    });

    confirmBtn.addEventListener("click", async () => {
        const userNotes = document.getElementById("extra-notes").value;
        if (!selectedPet || !selectedDate || !selectedTime || !currentUser) return alert("Faltan datos por completar.");

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Procesando...';
        
        const newAppointment = {
            user_id: currentUser.id, pet_id: selectedPet.id,
            appointment_date: selectedDate, appointment_time: selectedTime,
            service: `Servicio de Estética. Notas: ${userNotes || 'Ninguna'}` 
        };
        
        const { error } = await supabase.from('appointments').insert([newAppointment]);

        if (error) {
            console.error('Error al guardar la cita:', error);
            alert('Hubo un error al registrar tu cita.');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `<img src="/public/assets/icons/whatsapp.svg" alt="WhatsApp" class="h-5 w-5 mr-2"> Confirmar`;
            return; 
        }

        const message = `*¡Nueva Solicitud de Cita OhMyPet!*\n(Ya registrada en el sistema)\n\n*Cliente:* ${clientFullName}\n*Mascota:* ${selectedPet.name}\n*Fecha:* ${selectedDate}\n*Hora:* ${selectedTime}\n\n*Notas:* ${userNotes || 'Ninguna'}`;
        const phoneNumber = "51904343849";
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, "_blank");
        window.location.href = '/public/index.html?from=schedule';
    });
};

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
    loadUserDataAndPets();
    renderTimeOptions();
    initializeNavigation();
    showStep(0);
});