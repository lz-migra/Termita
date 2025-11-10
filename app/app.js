/**
 * @file app.js
 * @description Lógica principal de la aplicación, estado y orquestación.
 */

// Objeto global para exponer funciones y estado a otros módulos y al HTML.
const Termita = {
    // Estado de la aplicación
    state: {
        globalHeaders: [],
        inventoryData: [],
        currentPage: 1,
        rowsPerPage: 10,
        fixedHeaders: ['sku', 'id', 'nombre', 'descripcion', 'cantidad', 'unidad', 'precio', 'categoria'],
    },
    // Módulo de UI
    ui: UIManager,
    // Lógica de la aplicación
    logic: {
        async fetchInventory(showAll = false) {
            let query = '';
            const filterKey = Termita.ui.filterKeySelect.value;
            const filterValue = document.getElementById('filterValue').value.trim();
            const matchMode = document.getElementById('matchMode').value;

            if (!showAll && filterKey && filterValue) {
                query = `${encodeURIComponent(filterKey)}=${encodeURIComponent(filterValue)}&match=${encodeURIComponent(matchMode)}`;
            } else if (!showAll) {
                Termita.ui.displayMessage("Por favor, selecciona un filtro o presiona 'Mostrar Todo'", false);
                return;
            }

            Termita.ui.inventoryBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Cargando...</td></tr>';
            Termita.ui.noResultsMessage.style.display = 'none';
            Termita.ui.inventoryTable.style.display = 'table';

            const data = await apiRequest(query);

            if (data && data.data) {
                Termita.state.inventoryData = data.data;

                if (Termita.state.inventoryData.length > 0 && Termita.state.globalHeaders.length === 0) {
                    Termita.state.globalHeaders = Object.keys(Termita.state.inventoryData[0]);
                    Termita.ui.renderTableHeader();

                    Termita.ui.filterKeySelect.innerHTML = '<option value="">-- Seleccionar Columna --</option>';
                    Termita.state.globalHeaders.forEach(headerKey => {
                        const option = document.createElement('option');
                        option.value = headerKey;
                        option.textContent = Termita.ui.formatHeader(headerKey);
                        Termita.ui.filterKeySelect.appendChild(option);
                    });

                    Termita.ui.generateAdvancedFields(Termita.state.globalHeaders);
                }

                Termita.state.currentPage = 1;
                Termita.ui.renderTablePage();
                Termita.ui.updatePaginationButtons();

                if (Termita.state.inventoryData.length > 0) {
                    Termita.ui.displayMessage(data.message || `Se encontraron ${Termita.state.inventoryData.length} productos.`, true);
                }

            } else {
                Termita.state.inventoryData = [];
                Termita.ui.inventoryBody.innerHTML = '';
                Termita.ui.noResultsMessage.textContent = data ? data.message : "No se encontraron productos.";
                Termita.ui.noResultsMessage.style.display = 'block';
                Termita.ui.inventoryTable.style.display = 'none';
                Termita.ui.updatePaginationButtons();
            }
        },

        async handleFormSubmit(e) {
            e.preventDefault();
            Termita.ui.submitBtn.disabled = true;
            Termita.ui.submitBtn.textContent = 'Guardando...';

            const isEditing = document.getElementById('originalSku').value !== '';
            const productData = {};

            Termita.state.fixedHeaders.forEach(header => {
                const value = document.getElementById(header)?.value;
                if (value !== undefined && value !== null && String(value).trim() !== '') {
                    productData[header.toUpperCase()] = value;
                }
            });

            Termita.ui.advancedFieldsContainer.querySelectorAll('input').forEach(input => {
                if (input.value.trim() !== '') {
                    productData[input.name.toUpperCase()] = input.value;
                }
            });

            let query = 'ADD=1';
            for (const key in productData) {
                query += `&${encodeURIComponent(key)}=${encodeURIComponent(productData[key])}`;
            }

            const data = await apiRequest(query);

            if (data && data.success) {
                Termita.ui.displayMessage(data.message, true);
                Termita.ui.resetForm();
                await Termita.logic.fetchInventory(true);
            } else {
                Termita.ui.displayMessage(data ? data.message : 'Error desconocido al guardar.', false);
            }

            Termita.ui.submitBtn.disabled = false;
            Termita.ui.submitBtn.textContent = isEditing ? 'Actualizar Producto' : 'Agregar Producto';
        },

        editProduct(skuToEdit) {
            const product = Termita.state.inventoryData.find(p => (p.sku || p.id || p.nombre) === skuToEdit);
            if (!product) {
                Termita.ui.displayMessage(`No se pudo encontrar el producto con SKU: ${skuToEdit}`, false);
                return;
            }

            Termita.ui.generateAdvancedFields(Termita.state.globalHeaders, product);

            Termita.state.fixedHeaders.forEach(header => {
                const element = document.getElementById(header);
                if (element) {
                    element.value = product[header] !== undefined ? product[header] : '';
                }
            });

            document.getElementById('cantidad').value = product.cantidad || 1;
            document.getElementById('precio').value = parseFloat(product.precio || 0).toFixed(2);
            document.getElementById('originalSku').value = skuToEdit;

            Termita.ui.addEditTitle.innerHTML = `
                <span class="icon-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m16.475 5.408l2.117 2.117m-.756-3.982L12.109 9.27a2.1 2.1 0 0 0-.58 1.082L11 13l2.648-.53c.41-.082.786-.283 1.082-.579l5.727-5.727a1.853 1.853 0 1 0-2.621-2.621"/><path d="M19 15v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3"/></g></svg>
                </span>
                Modificar Producto
            `;
            Termita.ui.submitBtn.textContent = 'Actualizar Producto';
            Termita.ui.submitBtn.classList.add('btn-editing');
            Termita.ui.cancelBtn.style.display = 'inline-block';

            window.scrollTo(0, 0);
        },

        async deleteProduct(skuToDelete) {
            if (!confirm(`¿Estás seguro de que quieres ELIMINAR el producto con identificador: ${skuToDelete}?`)) {
                return;
            }

            const url = `DELETE=1&sku=${encodeURIComponent(skuToDelete)}`;
            const data = await apiRequest(url);

            if (data && data.success) {
                Termita.ui.displayMessage(data.message, data.success);
                Termita.state.inventoryData = Termita.state.inventoryData.filter(p => (p.sku || p.id || p.nombre) !== skuToDelete);
                Termita.ui.renderTablePage();
                Termita.ui.updatePaginationButtons();
            } else {
                Termita.ui.displayMessage(data ? data.message : 'Error al eliminar.', false);
            }
        },

        init() {
            // Carga inicial
            Termita.logic.fetchInventory(true);

            // Event Listeners
            Termita.ui.productForm.addEventListener('submit', Termita.logic.handleFormSubmit);

            Termita.ui.prevPageBtn.addEventListener('click', () => {
                if (Termita.state.currentPage > 1) {
                    Termita.state.currentPage--;
                    Termita.ui.renderTablePage();
                    Termita.ui.updatePaginationButtons();
                }
            });

            Termita.ui.nextPageBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(Termita.state.inventoryData.length / Termita.state.rowsPerPage);
                if (Termita.state.currentPage < totalPages) {
                    Termita.state.currentPage++;
                    Termita.ui.renderTablePage();
                    Termita.ui.updatePaginationButtons();
                }
            });

            Termita.ui.advancedToggleBtn.addEventListener('click', () => {
                const isVisible = Termita.ui.advancedFieldsContainer.style.display !== 'none';
                Termita.ui.advancedFieldsContainer.style.display = isVisible ? 'none' : 'block';
            });

            document.addEventListener('click', () => {
                document.querySelectorAll('.action-dropdown-menu.show').forEach(menu => menu.classList.remove('show'));
            });
        }
    }
};

// Inicializar la aplicación cuando el DOM esté listo.
document.addEventListener('DOMContentLoaded', Termita.logic.init);