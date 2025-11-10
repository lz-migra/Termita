/**
 * Este script analiza un archivo CSS que contiene una directiva no estándar '@theme inline'.
 * Resuelve las variables de ese bloque basándose en los valores de :root o .dark
 * y las inyecta en un <style> en el <head> del documento.
 * * --- MODIFICADO ---
 * + Añade lógica para analizar las variables --font-sans, --font-serif, y --font-mono.
 * + Extrae los nombres de las fuentes de Google Fonts.
 * + Carga dinámicamente las fuentes creando etiquetas <link> en el <head>.
 * + ¡CORRECCIÓN! Asegura que TODAS las variables base (incluyendo sombras) 
 * se inyecten primero, antes de las variables de @theme inline.
 * ------------------
 */
(function () {
  // --- Configuración ---
  const CSS_FILE_PATH = 'styles/index.css';
  const STYLE_TAG_ID = 'injected-theme-styles';
  // ---------------------

  // --- INICIO: Lógica de carga de fuentes (de tweakcn) ---

  const DEFAULT_FONT_WEIGHTS = ["400", "500", "600", "700"];

  /**
   * Extrae el primer nombre de fuente de una pila de fuentes CSS.
   * Ignora las fuentes genéricas/del sistema.
   * @param {string} fontFamilyString - Ej: "Plus Jakarta Sans, sans-serif"
   * @returns {string | null} - Ej: "Plus Jakarta Sans" o null
   */
  function extractFontFamily(fontFamilyString) {
      if (!fontFamilyString)
          return null;
      // Obtiene la primera fuente y la limpia de comillas
      const t = fontFamilyString.split(",")[0].trim().replace(/['"]/g, "");
      // Comprueba si es una fuente genérica
      return ["ui-sans-serif", "ui-serif", "ui-monospace", "system-ui", "sans-serif", "serif", "monospace", "cursive", "fantasy"].includes(t.toLowerCase()) ? null : t
  }

  /**
   * Construye una URL de Google Fonts API.
   * @param {string} fontFamily - Nombre de la fuente.
   * @param {string[]} weights - Array de pesos de fuente.
   * @returns {string} - La URL completa.
   */
  function buildFontCssUrl(fontFamily, weights) {
      weights = weights || DEFAULT_FONT_WEIGHTS;
      return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@${weights.join(";")}&display=swap`
  }

  /**
   * Añade una etiqueta <link> al <head> para cargar una fuente de Google Fonts.
   * Evita duplicados.
   * @param {string} fontFamily - Nombre de la fuente.
   * @param {string[]} weights - Array de pesos.
   */
  function loadGoogleFont(fontFamily, weights) {
      const fontUrl = buildFontCssUrl(fontFamily, weights = weights || DEFAULT_FONT_WEIGHTS);
      
      // Evitar añadir la misma fuente múltiples veces
      if (document.querySelector(`link[href="${fontUrl}"]`))
          return;
          
      const linkTag = document.createElement("link");
      linkTag.rel = "stylesheet";
      linkTag.href = fontUrl;
      document.head.appendChild(linkTag);
      // console.log('Cargando fuente:', fontFamily);
  }

  /**
   * Orquesta la carga de todas las fuentes definidas en el tema.
   * @param {Map<string, string>} baseVars - El mapa de variables base (:root + .dark).
   */
  function loadThemeFontsFromMap(baseVars) {
      try {
          // Obtiene los valores de las variables de fuente
          const fontsToLoad = {
              sans: baseVars.get('font-sans'),
              serif: baseVars.get('font-serif'),
              mono: baseVars.get('font-mono')
          };

          // Itera sobre cada tipo de fuente (sans, serif, mono)
          Object.values(fontsToLoad).forEach((fontStack) => {
              // fontStack es ej: "Plus Jakarta Sans, sans-serif"
              const fontFamilyName = extractFontFamily(fontStack);
              
              // Si se extrajo un nombre de fuente válido (no genérico)
              if (fontFamilyName) {
                  loadGoogleFont(fontFamilyName, DEFAULT_FONT_WEIGHTS);
              }
          });
      } catch (e) {
          console.warn("Theme Loader: No se pudieron cargar las fuentes:", e);
      }
  }
  
  // --- FIN: Lógica de carga de fuentes ---


  /**
   * Analiza un bloque de texto CSS y extrae variables CSS.
   * @param {string} cssText - El texto CSS del bloque (contenido de { ... }).
   * @returns {Map<string, string>} - Un mapa de nombre_variable: valor.
   */
  function parseVariablesFromBlock(cssText) {
    const variables = new Map();
    // Expresión regular para encontrar --variable: valor;
    const varRegex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
    let match;

    while ((match = varRegex.exec(cssText)) !== null) {
      // Clave: nombre de la variable (sin --)
      // Valor: valor de la variable (con trim)
      variables.set(match[1].trim(), match[2].trim());
    }
    return variables;
  }

  /**
   * Extrae el contenido de un bloque CSS específico (como :root o @theme inline).
   * @param {string} cssContent - Todo el contenido del archivo CSS.
   * @param {string} selector - El selector del bloque (p.ej., ':root', '.dark', '@theme inline').
   * @returns {string} - El contenido de texto dentro de las llaves {}.
   */
  function getCssBlockContent(cssContent, selector) {
    // Escapa caracteres especiales en el selector para la RegExp
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // RegExp para encontrar el bloque y capturar su contenido
    const blockRegex = new RegExp(escapedSelector + '\\s*\\{([\\s\\S]*?)\\}', 'i');
    const match = cssContent.match(blockRegex);
    return match ? match[1] : '';
  }

  /**
   * Resuelve el valor de una variable de @theme, reemplazando las referencias var().
   * @param {string} value - El valor de la variable de @theme (p.ej., "var(--background)" o "calc(var(--radius) - 4px)").
   * @param {Map<string, string>} baseVars - El mapa de variables base (:root + .dark).
   * @returns {string} - El valor resuelto.
   */
  function resolveVariableValue(value, baseVars) {
    // RegExp para encontrar todas las instancias de var(--nombre-variable)
    const varRefRegex = /var\(--([a-zA-Z0-9-]+)\)/g;

    return value.replace(varRefRegex, (match, varName) => {
      // Busca el valor en las variables base
      return baseVars.get(varName) || match; // Si no se encuentra, devuelve el 'var()' original
    });
  }

  /**
   * Inyecta o actualiza la etiqueta <style> en el <head> del DOM.
   * @param {string} cssString - El texto CSS final para inyectar.
   */
  function injectStyles(cssString) {
    let styleTag = document.getElementById(STYLE_TAG_ID);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = STYLE_TAG_ID;
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = cssString;
  }

  /**
   * Función principal que se ejecuta para procesar y aplicar el tema.
   * @param {string} cssContent - El contenido completo del archivo CSS.
   */
  function processAndApplyTheme(cssContent) {
    try {
      // 1. Analizar todos los bloques de variables
      const rootBlock = getCssBlockContent(cssContent, ':root');
      const darkBlock = getCssBlockContent(cssContent, '.dark');
      const themeBlock = getCssBlockContent(cssContent, '@theme inline');

      const rootVars = parseVariablesFromBlock(rootBlock);
      const darkVars = parseVariablesFromBlock(darkBlock);
      const themeVars = parseVariablesFromBlock(themeBlock);

      if (themeVars.size === 0) {
        console.warn('No se encontraron variables en el bloque @theme inline.');
        // return; // No hacemos return para que al menos carguen las fuentes y las bases.
      }

      // 2. Determinar el tema actual y crear el mapa de variables base
      const isDarkMode = document.documentElement.classList.contains('dark');
      // Empezar con :root y sobrescribir con .dark si está activo
      const baseVars = new Map([...rootVars, ...(isDarkMode ? darkVars : [])]);

      // 3. Cargar las fuentes (sans, serif, mono) definidas en las variables base
      loadThemeFontsFromMap(baseVars);

      // 4. Resolver las variables de @theme (ej: --radius-md: calc(var(--radius) - 2px))
      const resolvedThemeVars = new Map();
      for (const [name, value] of themeVars.entries()) {
        const resolvedValue = resolveVariableValue(value, baseVars);
        resolvedThemeVars.set(name, resolvedValue);
      }

      // 5. Generar el string CSS final
      let cssString = ':root {\n';
      
      // 5a. 🚀 ¡CORRECCIÓN! Inyectar TODAS las variables base primero.
      // Esto garantiza que --shadow, --shadow-md, etc. con sus valores finales,
      // estén disponibles para el navegador.
      for (const [name, value] of baseVars.entries()) {
        // Resolvemos el valor por si la variable base también tuviera un var()
        const resolvedValue = resolveVariableValue(value, baseVars); 
        cssString += `  --${name}: ${resolvedValue};\n`;
      }
      
      // 5b. Luego, inyectar las variables resueltas del bloque @theme inline.
      // Esto añade los prefijos de color (--color-primary) y radios calculados (--radius-md).
      // Si hay conflicto (como con las sombras), se sobrescribe con el valor resuelto,
      // que es lo que queremos.
      for (const [name, value] of resolvedThemeVars.entries()) {
        cssString += `  --${name}: ${value};\n`;
      }
      
      cssString += '}';

      // 6. Inyectar en el DOM
      injectStyles(cssString);
      // console.log('Tema inyectado/actualizado:', isDarkMode ? 'Modo Oscuro' : 'Modo Claro');

    } catch (error) {
      console.error('Error al procesar el tema CSS:', error);
    }
  }

  // --- Ejecución ---

  // Almacenar el contenido del CSS para no tener que volver a cargarlo
  let fullCssContent = '';

  // 1. Cargar el archivo CSS
  fetch(CSS_FILE_PATH)
    .then(response => {
      if (!response.ok) {
        throw new Error(`No se pudo cargar ${CSS_FILE_PATH}: ${response.statusText}`);
      }
      return response.text();
    })
    .then(cssText => {
      fullCssContent = cssText;
      // 2. Procesar y aplicar el tema por primera vez
      processAndApplyTheme(fullCssContent);

      // 3. Observar cambios en la clase del <html> (para light/dark mode)
      const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            // La clase ha cambiado, volver a procesar el tema
            processAndApplyTheme(fullCssContent);
            break;
          }
        }
      });

      // Empezar a observar el elemento <html> por cambios en sus atributos
      observer.observe(document.documentElement, { attributes: true });
    })
    .catch(error => {
      console.error('Error fatal al cargar el script de tema:', error);
    });

  // --- INICIO: Lógica del Theme Switcher (integrada) ---

  /**
   * Esta función se ejecuta cuando el DOM está listo.
   * Configura el botón para cambiar de tema.
   */
  function setupThemeSwitcher() {
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    if (!themeToggleButton) return;

    // Función para actualizar el ícono del botón según el tema
    const updateButtonIcon = (isDarkMode) => {
        const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="currentColor" fill-opacity="0"><path d="M15.22 6.03l2.53 -1.94l-3.19 -0.09l-1.06 -3l-1.06 3l-3.19 0.09l2.53 1.94l-0.91 3.06l2.63 -1.81l2.63 1.81l-0.91 -3.06Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.7s" dur="0.4s" values="0;1"/></path><path d="M19.61 12.25l1.64 -1.25l-2.06 -0.05l-0.69 -1.95l-0.69 1.95l-2.06 0.05l1.64 1.25l-0.59 1.98l1.7 -1.17l1.7 1.17l-0.59 -1.98Z"><animate fill="freeze" attributeName="fill-opacity" begin="1.1s" dur="0.4s" values="0;1"/></path></g><path fill="none" stroke="currentColor" stroke-dasharray="56" stroke-dashoffset="56" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 6c0 6.08 4.92 11 11 11c0.53 0 1.05 -0.04 1.56 -0.11c-1.61 2.47 -4.39 4.11 -7.56 4.11c-4.97 0 -9 -4.03 -9 -9c0 -3.17 1.64 -5.95 4.11 -7.56c-0.07 0.51 -0.11 1.03 -0.11 1.56Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="56;0"/></path></svg>`;
        const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="currentColor"><path d="M12 5V3" opacity="0"><animate fill="freeze" attributeName="opacity" begin="0.5s" dur="0.4s" values="0;1"/></path><path d="M12 5V3" transform="rotate(45 12 12)" opacity="0"><animate fill="freeze" attributeName="opacity" begin="0.5s" dur="0.4s" values="0;1"/></path><path d="M12 5V3" transform="rotate(90 12 12)" opacity="0"><animate fill="freeze" attributeName="opacity" begin="0.5s" dur="0.4s" values="0;1"/></path><path d="M12 5V3" transform="rotate(135 12 12)" opacity="0"><animate fill="freeze" attributeName="opacity" begin="0.5s" dur="0.4s" values="0;1"/></path><path d="M12 5V3" transform="rotate(180 12 12)" opacity="0"><animate fill="freeze" attributeName="opacity" begin="0.5s" dur="0.4s" values="0;1"/></path><path d="M12 5V3" transform="rotate(225 12 12)" opacity="0"><animate fill="freeze" attributeName="opacity" begin="0.5s" dur="0.4s" values="0;1"/></path><path d="M12 5V3" transform="rotate(270 12 12)" opacity="0"><animate fill="freeze" attributeName="opacity" begin="0.5s" dur="0.4s" values="0;1"/></path><path d="M12 5V3" transform="rotate(315 12 12)" opacity="0"><animate fill="freeze" attributeName="opacity" begin="0.5s" dur="0.4s" values="0;1"/></path></g><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="32" stroke-dashoffset="32" d="M12 18a6 6 0 1 0 0-12a6 6 0 0 0 0 12Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="32;0"/></path><path d="M12 5V3M12 21v-2M19.07 19.07l-1.41-1.41M6.34 6.34L4.93 4.93M19.07 4.93l-1.41 1.41M6.34 17.66l-1.41 1.41M21 12h-2M5 12H3" opacity="0"><animate fill="freeze" attributeName="opacity" begin="0.5s" dur="0.4s" values="0;1"/></path></g></svg>`;
        themeToggleButton.innerHTML = isDarkMode ? sunIcon : moonIcon;
        themeToggleButton.title = isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    };

    // 1. Aplicar tema guardado o preferencia del sistema al cargar
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isInitiallyDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    if (isInitiallyDark) {
        document.documentElement.classList.add('dark');
    }
    updateButtonIcon(isInitiallyDark);

    // 2. Añadir el evento de clic para alternar el tema
    themeToggleButton.addEventListener('click', () => {
        const isDarkMode = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        updateButtonIcon(isDarkMode);
        // El MutationObserver en `processAndApplyTheme` se encargará de actualizar los estilos.
    });
  }

  // Ejecutar la configuración del switcher cuando el documento esté listo.
  document.addEventListener('DOMContentLoaded', setupThemeSwitcher);

})();