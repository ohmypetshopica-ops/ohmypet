import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const steps = document.querySelectorAll(".step");
const petOptionsContainer = document.getElementById("pet-options");
const timeOptionsContainer = document.getElementById("time-options");
const noPetsMessage = document.getElementById("no-pets-message");
const nextBtnStep1 = document.getElementById("next-btn-step1");

// --- ESTADO DE LA APLICACIÓN ---
let currentStep = 0;
let selectedPet = null;
let selectedDate = null;
let selectedTime = null;
let clientFullName = 'Cliente';

/**
 * Carga las mascotas y el perfil del usuario logueado desde Supabase.
 */
const loadUserDataAndPets = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = '/public/modules/login/login.html';
        return;
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
    
    if (profile) {
        clientFullName = profile.full_name;
    }

    const { data: pets, error } = await supabase
        .from('pets')
        .select('id, name, breed, size, weight, age')
        .eq('owner_id', user.id);

    if (error) {
        console.error('Error al cargar las mascotas:', error);
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
                document.querySelectorAll("#pet-options .option-btn").forEach(b => {
                    b.classList.remove("bg-emerald-600", "text-white");
                    b.classList.add("bg-emerald-100", "text-emerald-800");
                });
                btn.classList.remove("bg-emerald-100", "text-emerald-800");
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
    hours.forEach(hour => {
        const btn = document.createElement("button");
        btn.className = "option-btn bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-200 font-medium transition-colors duration-200";
        btn.textContent = hour;
        btn.onclick = () => {
            document.querySelectorAll("#time-options .option-btn").forEach(b => {
                b.classList.remove("bg-emerald-600", "text-white");
                b.classList.add("bg-emerald-100", "text-emerald-800");
            });
            btn.classList.remove("bg-emerald-100", "text-emerald-800");
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
                if (!selectedDate) {
                    alert("Por favor, selecciona una fecha.");
                    return;
                }
                if (!selectedTime) {
                    alert("Por favor, selecciona una hora.");
                    return;
                }
            }
            if (currentStep < steps.length - 1) {
                showStep(currentStep + 1);
            }
        });
    });

    document.querySelectorAll(".prev-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (currentStep > 0) {
                showStep(currentStep - 1);
            }
        });
    });

    document.getElementById("confirm-btn").addEventListener("click", () => {
        const userNotes = document.getElementById("extra-notes").value;
        if (!selectedPet || !selectedDate || !selectedTime) {
            alert("Faltan datos por completar. Por favor, revisa los pasos anteriores.");
            return;
        }

        const messageParts = [
            "*¡Nueva Solicitud de Cita OhMyPet!*",
            "",
            `*Cliente:* ${clientFullName}`,
            `*Mascota:* ${selectedPet.name}`,
            `*Raza:* ${selectedPet.breed || 'No especificada'}`,
            `*Tamaño:* ${selectedPet.size || 'No especificado'}`,
            `*Peso:* ${selectedPet.weight ? selectedPet.weight + ' kg' : 'No especificado'}`,
            `*Edad:* ${selectedPet.age ? selectedPet.age + ' años' : 'No especificada'}`,
            "",
            `*Fecha:* ${selectedDate}`,
            `*Hora:* ${selectedTime}`,
        ];
        
        if (userNotes) {
            messageParts.push("", "*Notas para esta Cita:*", userNotes);
        }

        const message = messageParts.join('\n');
        const phoneNumber = "51904343849";
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        
        // Abre WhatsApp en una nueva pestaña
        window.open(whatsappUrl, "_blank");

        // --- *** LÍNEA AÑADIDA PARA REDIRIGIR Y MOSTRAR LA NOTIFICACIÓN *** ---
        window.location.href = '/public/index.html?from=schedule';
    });
};

document.addEventListener("DOMContentLoaded", () => {
    loadUserDataAndPets();
    renderTimeOptions();
    initializeNavigation();
    showStep(0);
});