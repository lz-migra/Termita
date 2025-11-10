/**
 * @file api-client.js
 * @description Módulo para gestionar la comunicación con la API de Google Apps Script.
 */

// --- CONFIGURACIÓN ---
// ⬇️ ¡IMPORTANTE! Reemplaza esto con la URL de tu Web App de Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbxiKwbI2K9l2SgQI1FPLZzAEyT6c0KHIY7ouuWCf_C7YqKqWUgOyp-a04W7gdI_iu6C/exec";

/**
 * Realiza una solicitud a la API y maneja las respuestas y errores comunes.
 * @param {string} queryString - La cadena de consulta para la URL (ej: "ADD=1&nombre=...").
 * @returns {Promise<object|null>} Una promesa que resuelve con los datos de la API o null si hay un error.
 */
async function apiRequest(queryString = '') {
    const url = API_URL + (queryString ? `?${queryString}` : '');
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || "Operación fallida en el servidor.");
        }
        return data;
    } catch (error) {
        console.error("Error en la solicitud a la API:", error);
        Termita.ui.displayMessage(`Fallo en la conexión o la API: ${error.message}`, false);
        return null;
    }
}