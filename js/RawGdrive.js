/**
 * Extrae el ID de un archivo de Google Drive desde una URL completa o devuelve el texto original si no es una URL.
 * @param {string} urlOrId - La URL completa del archivo de Google Drive o solo el ID.
 * @returns {string | null} El ID del archivo extraído o el texto original si no parece una URL.
 */
function extractDriveId(urlOrId) {
    if (!urlOrId) return null;

    // Expresión regular para encontrar el ID en los formatos de URL más comunes de Google Drive.
    // 1. .../file/d/FILE_ID/...
    // 2. ...?id=FILE_ID...
    const regex = /\/d\/([a-zA-Z0-9_-]+)|[?&]id=([a-zA-Z0-9_-]+)/;
    const match = urlOrId.match(regex);

    // Si hay una coincidencia, el ID estará en el primer o segundo grupo de captura.
    if (match) {
        return match[1] || match[2];
    }

    // Si no hay coincidencia, asumimos que el usuario ya introdujo solo el ID.
    return urlOrId;
}

function generarLink() {
    const baseUrl = document.getElementById('baseUrl').value.trim();
    const userInput = document.getElementById('fileId').value.trim();
    const mimeType = document.getElementById('mimeType').value;

    if (!baseUrl || !userInput) {
        alert('Por favor, completa la URL Base y el ID del Archivo.');
        return;
    }

    // Asegurarse de que la URL base no tenga parámetros de query
    const cleanBaseUrl = baseUrl.split('?')[0];

    // Extraer el ID del archivo desde la entrada del usuario
    const fileId = extractDriveId(userInput);

    // Construir los parámetros
    const params = new URLSearchParams();
    if (!fileId) { // Doble chequeo por si la extracción devuelve null
        alert('No se pudo obtener un ID de archivo válido. Por favor, revisa el campo.');
        return;
    }
    params.append('id', fileId);

    if (mimeType) {
        params.append('mime', mimeType);
    }

    const finalUrl = `${cleanBaseUrl}?${params.toString()}`;

    // Mostrar el resultado
    const resultadoDiv = document.getElementById('resultado');
    const linkGenerado = document.getElementById('linkGenerado');
    linkGenerado.href = finalUrl;
    linkGenerado.textContent = finalUrl;
    resultadoDiv.style.display = 'block';
}