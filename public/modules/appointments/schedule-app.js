document.addEventListener("DOMContentLoaded", () => {
  const steps = document.querySelectorAll(".step");
  let currentStep = 0;

  const pets = ["Rocky 🐕", "Michi 🐈", "Lola 🐶"]; // Ejemplo, luego lo conectamos con Supabase
  const petOptionsContainer = document.getElementById("pet-options");
  const timeOptionsContainer = document.getElementById("time-options");

  let selectedPet = null;
  let selectedDate = null;
  let selectedTime = null;

  // Renderizar mascotas
  pets.forEach(pet => {
    const btn = document.createElement("button");
    btn.className = "option-btn bg-orange-400 text-white px-4 py-2 rounded-lg hover:bg-orange-500";
    btn.textContent = pet;
    btn.onclick = () => {
      document.querySelectorAll("#pet-options .option-btn").forEach(b => b.classList.remove("bg-orange-600"));
      btn.classList.add("bg-orange-600");
      selectedPet = pet;
    };
    petOptionsContainer.appendChild(btn);
  });

  // Renderizar horas (10:00 - 16:00)
  const hours = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
  hours.forEach(hour => {
    const btn = document.createElement("button");
    btn.className = "option-btn bg-orange-400 text-white px-4 py-2 rounded-lg hover:bg-orange-500";
    btn.textContent = hour;
    btn.onclick = () => {
      document.querySelectorAll("#time-options .option-btn").forEach(b => b.classList.remove("bg-orange-600"));
      btn.classList.add("bg-orange-600");
      selectedTime = hour;
    };
    timeOptionsContainer.appendChild(btn);
  });

  // Mostrar paso
  function showStep(index) {
    steps.forEach((s, i) => s.classList.toggle("hidden", i !== index));
    currentStep = index;
  }

  // Botones siguiente
  document.querySelectorAll(".next-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (currentStep === 0 && !selectedPet) {
        alert("Selecciona una mascota.");
        return;
      }
      if (currentStep === 1) {
        selectedDate = document.getElementById("appointment-date").value;
        if (!selectedDate) {
          alert("Selecciona una fecha.");
          return;
        }
      }
      if (currentStep === 2 && !selectedTime) {
        alert("Selecciona una hora.");
        return;
      }
      showStep(currentStep + 1);
    });
  });

  // Botones atrás
  document.querySelectorAll(".prev-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      showStep(currentStep - 1);
    });
  });

  // Confirmar
  document.getElementById("confirm-btn").addEventListener("click", () => {
    const notes = document.getElementById("extra-notes").value;
    if (!selectedPet || !selectedDate || !selectedTime) {
      alert("Faltan datos.");
      return;
    }

    const message = `*¡Nueva Cita!*\n\nMascota: ${selectedPet}\nFecha: ${selectedDate}\nHora: ${selectedTime}\nNotas: ${notes || "Ninguna"}`;
    const phoneNumber = "51904343849"; // Tu número
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  });

  // Iniciar en paso 0
  showStep(0);
});
