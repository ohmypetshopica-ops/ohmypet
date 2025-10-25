// public/modules/employee/employee-state.js
// Estado global compartido entre todos los módulos del dashboard del empleado

export const state = {
    // Datos
    allClients: [],
    allPets: [],
    allAppointments: [],
    monthlyAppointments: [],
    clientsWithPets: [],
    allProducts: [],
    cart: [],
    paymentLines: [],
    
    // Estado UI
    currentDate: new Date(),
    currentClientId: null,
    currentPetId: null,
    selectedDate: null,
};

// Funciones auxiliares para actualizar estado
export const updateState = (key, value) => {
    state[key] = value;
};

export const getState = (key) => {
    return state[key];
};

export const resetCart = () => {
    state.cart = [];
    state.paymentLines = [];
};