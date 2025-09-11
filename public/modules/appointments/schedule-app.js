import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const steps = document.querySelectorAll(".step");
const petOptionsContainer = document.getElementById("pet-options");
const timeOptionsContainer = document.getElementById("time-options");
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

const loadUserDataAndPets = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        window.location.href = '/public/modules/login/login.html';
        return;
    }
    currentUser = user;
    
    const [profileResponse, petsResponse] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('pets').select('id, name, breed, size, weight, age').eq('owner_id', user.id)
    ]);
    
    const { data: profile } = profileResponse;
    const { data: pets, error: petsError } = petsResponse;

    if (profile) clientFullName = profile.full_name;
    
    if (petsError) {
        console.error('Error al cargar las mascotas:', petsError);
        petOptionsContainer.innerHTML = `<p class="text-red-500">No se pudieron cargar las mascotas.</p>`;
        return;
    }
    
    if (pets && pets.length > 0) {
        noPetsMessage.classList.add('hidden');
        nextBtnStep1.classList.remove('hidden');
        petOptionsContainer.innerHTML = '';
        pets.forEach(pet => {
            const btn = document.createElement("button");
            btn.className = "option-btn bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-200 font-medium transition-colors duration-200";
            btn.textContent = `${pet.name} 🐾`;
            btn.onclick = () => {
                document.querySelectorAll("#pet-options .option-btn").forEach(b => b.classList.remove("bg-emerald-600", "text-white"));
                btn.classList.add("bg-emerald-600", "text-white");
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

const renderTimeOptions = () => {
    const hours = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
    timeOptionsContainer.innerHTML = ''; 
    hours.forEach(hour => {
        const btn = document.createElement("button");
        btn.className = "option-btn bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-200 font-medium transition-colors duration-200";
        btn.textContent = hour;
        btn.onclick = () => {
            document.querySelectorAll("#time-options .option-btn").forEach(b => b.classList.remove("bg-emerald-600", "text-white"));
            btn.classList.add("bg-emerald-600", "text-white");
            selectedTime = hour;
        };
        timeOptionsContainer.appendChild(btn);
    });
};

function showStep(index) {
    steps.forEach((step, i) => step.classList.toggle("hidden", i !== index));
    currentStep = index;
}

const initializeNavigation = () => {
    document.querySelectorAll(".next-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (currentStep === 0 && !selectedPet) {
                alert("Por favor, selecciona una mascota.");
                return;
            }
            if (currentStep === 1) {
                selectedDate = document.getElementById("appointment-date").value;
                if (!selectedDate || !selectedTime) {
                    alert("Por favor, selecciona fecha y hora.");
                    return;
                }
            }
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
        if (!selectedPet || !selectedDate || !selectedTime || !currentUser) {
            alert("Faltan datos por completar. Revisa los pasos anteriores.");
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Procesando...';
        
        // --- CÓDIGO CORREGIDO ---
        // Creamos el objeto solo con las columnas que SÍ existen en tu tabla
        const newAppointment = {
            user_id: currentUser.id,
            pet_id: selectedPet.id,
            appointment_date: selectedDate,
            appointment_time: selectedTime,
            // Agregamos un valor por defecto para 'service' y las notas del usuario.
            service: `Servicio de Estética. Notas: ${userNotes || 'Ninguna'}` 
        };
        
        const { error } = await supabase.from('appointments').insert([newAppointment]);

        if (error) {
            console.error('Error al guardar la cita:', error);
            alert('Hubo un error al registrar tu cita. Por favor, inténtalo de nuevo.');
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

document.addEventListener("DOMContentLoaded", () => {
    loadUserDataAndPets();
    renderTimeOptions();
    initializeNavigation();
    showStep(0);
});

