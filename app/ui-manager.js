/**
 * @file ui-manager.js
 * @description Módulo para gestionar todas las interacciones con la interfaz de usuario (DOM).
 */

const UIManager = {
    // --- Elementos del DOM ---
    inventoryTable: document.getElementById('inventoryTable'),
    inventoryBody: document.getElementById('inventoryBody'),
    inventoryHeader: document.getElementById('inventoryHeader'),
    messageDiv: document.getElementById('message'),
    productForm: document.getElementById('productForm'),
    submitBtn: document.getElementById('submitBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    addEditTitle: document.getElementById('addEditTitle'),
    filterKeySelect: document.getElementById('filterKey'),
    advancedFieldsContainer: document.getElementById('advancedFieldsContainer'),
    advancedToggleBtn: document.getElementById('advancedToggleBtn'),
    noResultsMessage: document.getElementById('no-results-message'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),

    // --- Métodos de UI ---

    displayMessage(text, isSuccess) {
        this.messageDiv.textContent = text;
        this.messageDiv.className = 'message ' + (isSuccess ? 'success' : 'error');
        this.messageDiv.style.display = 'block';
        setTimeout(() => {
            this.messageDiv.style.display = 'none';
        }, 5000);
    },

    formatHeader(key) {
        if (!key) return '';
        return key.toUpperCase().replace(/_/g, ' ');
    },

    generateAdvancedFields(allHeaders, productData = {}) {
        this.advancedFieldsContainer.innerHTML = '<h4>Campos Adicionales:</h4>';
        const dynamicHeaders = allHeaders.filter(header =>
            !Termita.state.fixedHeaders.includes(header.toLowerCase()) && header.toLowerCase() !== 'nro_item'
        );

        if (dynamicHeaders.length === 0) {
            this.advancedToggleBtn.style.display = 'none';
            return;
        }

        this.advancedToggleBtn.style.display = 'inline-block';

        dynamicHeaders.forEach(headerKey => {
            const idKey = headerKey.toLowerCase();
            const labelText = this.formatHeader(headerKey);
            const value = productData[headerKey] !== undefined ? productData[headerKey] : '';

            const div = document.createElement('div');
            div.className = 'input-group';
            div.innerHTML = `
                <label for="adv_${idKey}">${labelText}:</label>
                <input type="text" id="adv_${idKey}" name="${headerKey}" value="${value}" 
                       placeholder="Valor para ${labelText}">
            `;
            this.advancedFieldsContainer.appendChild(div);
        });
    },

    renderTableHeader() {
        this.inventoryHeader.innerHTML = '';
        if (Termita.state.globalHeaders.length === 0) return;

        const headerRow = this.inventoryHeader.insertRow();
        headerRow.innerHTML = '<th></th>'; // Celda de acciones

        Termita.state.globalHeaders.forEach(headerKey => {
            if (headerKey.toLowerCase() === 'nro_item') return;
            const th = document.createElement('th');
            th.textContent = this.formatHeader(headerKey);
            headerRow.appendChild(th);
        });
    },

    renderTablePage() {
        this.inventoryBody.innerHTML = '';
        const { inventoryData, globalHeaders, currentPage, rowsPerPage } = Termita.state;

        if (inventoryData.length === 0 || globalHeaders.length === 0) {
            this.noResultsMessage.textContent = "No hay productos para mostrar.";
            this.noResultsMessage.style.display = 'block';
            this.inventoryTable.style.display = 'none';
            return;
        }

        this.noResultsMessage.style.display = 'none';
        this.inventoryTable.style.display = 'table';

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedData = inventoryData.slice(startIndex, endIndex);

        paginatedData.forEach(product => {
            const row = this.inventoryBody.insertRow();
            const sku = product.sku || product.id || product.nombre;

            const cellAction = row.insertCell();
            cellAction.className = 'action-cell';
            cellAction.innerHTML = `
                <div class="action-dropdown">
                    <button class="action-dropdown-btn" data-sku="${sku}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m16.475 5.408l2.117 2.117m-.756-3.982L12.109 9.27a2.1 2.1 0 0 0-.58 1.082L11 13l2.648-.53c.41-.082.786-.283 1.082-.579l5.727-5.727a1.853 1.853 0 1 0-2.621-2.621"/><path d="M19 15v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3"/></g></svg>
                    </button>
                    <div class="action-dropdown-menu">
                        <button class="edit-btn" data-sku="${sku}">Editar</button>
                        <button class="delete-btn" data-sku="${sku}">Eliminar</button>
                    </div>
                </div>
            `;

            globalHeaders.forEach(headerKey => {
                if (headerKey.toLowerCase() === 'nro_item') return;
                const cell = row.insertCell();
                let content = product[headerKey] !== undefined ? product[headerKey] : '';

                if (headerKey.toLowerCase() === 'cantidad') {
                    let qtyText = content !== '' ? content : 'N/A';
                    if (product.unidad) qtyText += ` (${product.unidad})`;
                    content = qtyText;
                } else if (headerKey.toLowerCase() === 'precio') {
                    let price = parseFloat(content || 0);
                    content = !isNaN(price) ? `$${price.toFixed(2)}` : 'N/A';
                }
                cell.textContent = content;
            });
        });

        this.addTableEventListeners();
    },

    addTableEventListeners() {
        document.querySelectorAll('.action-dropdown-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = e.currentTarget.nextElementSibling;
                document.querySelectorAll('.action-dropdown-menu.show').forEach(m => {
                    if (m !== menu) m.classList.remove('show');
                });
                menu.classList.toggle('show');
            });
        });

        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                Termita.logic.editProduct(e.target.dataset.sku);
                e.target.closest('.action-dropdown-menu').classList.remove('show');
            });
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                Termita.logic.deleteProduct(e.target.dataset.sku);
                e.target.closest('.action-dropdown-menu').classList.remove('show');
            });
        });
    },

    updatePaginationButtons() {
        const totalPages = Math.ceil(Termita.state.inventoryData.length / Termita.state.rowsPerPage);
        this.prevPageBtn.disabled = (Termita.state.currentPage === 1);
        this.nextPageBtn.disabled = (Termita.state.currentPage === totalPages || totalPages === 0);
    },

    resetForm() {
        this.productForm.reset();
        this.addEditTitle.innerHTML = `
            <span class="icon-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m11 12l8.073-4.625M11 12L6.963 9.688M11 12v2.281m8.073-6.906a3.17 3.17 0 0 0-1.165-1.156L15.25 4.696m3.823 2.679c.275.472.427 1.015.427 1.58v1.608M2.926 7.374a3.14 3.14 0 0 0-.426 1.58v6.09c0 1.13.607 2.172 1.592 2.736l5.316 3.046A3.2 3.2 0 0 0 11 21.25M2.926 7.375a3.17 3.17 0 0 1 1.166-1.156l5.316-3.046a3.2 3.2 0 0 1 3.184 0l2.658 1.523M2.926 7.375l4.037 2.313m0 0l8.287-4.992"/><path fill="currentColor" fill-rule="evenodd" d="M17.5 23a5.5 5.5 0 1 0 0-11a5.5 5.5 0 0 0 0 11m0-8.993a.5.5 0 0 1 .5.5V17h2.493a.5.5 0 1 1 0 1H18v2.493a.5.5 0 1 1-1 0V18h-2.493a.5.5 0 1 1 0-1H17v-2.493a.5.5 0 0 1 .5-.5" clip-rule="evenodd"/></g></svg>
            </span>
            Agregar Nuevo Producto
        `;
        this.submitBtn.textContent = 'Agregar Producto';
        this.submitBtn.classList.remove('btn-editing');
        this.cancelBtn.style.display = 'none';
        document.getElementById('originalSku').value = '';

        this.advancedFieldsContainer.style.display = 'none';
        this.advancedToggleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M8.73 21.499c1.293-2.223 4.252-2.485 5.937-.786c.377.38.566.57.733.592s1.215-.578 1.587-.792c.38-.217 1.432-.82 1.498-.979c.066-.157-.003-.427-.142-.965c-.503-1.957.718-4.017 2.668-4.548c.522-.142.783-.213.886-.349S22 12.341 22 11.904s0-1.633-.103-1.769s-.364-.207-.886-.349c-1.95-.531-3.172-2.59-2.67-4.548c.14-.538.208-.807.142-.965s-1.118-.761-1.497-.979c-.372-.213-1.42-.815-1.588-.792c-.167.023-.355.213-.732.592a3.775 3.775 0 0 1-5.333 0c-.377-.38-.566-.57-.733-.592s-1.215.579-1.587.792c-.38.218-1.432.821-1.498.979s.003.427.142.965c.503 1.957-.718 4.017-2.668-4.548c.522-.142-.783.213-.886-.35C2 10.27 2 11.465 2 11.903s0 1.632.103 1.768s.364.207.886.35q.009 0 .018.004"/><path d="M2.489 18.183c1.08-1.08 4.752-4.714 5.112-5.134c.38-.444.072-1.044.256-2.903c.088-.9.282-1.573.836-2.075c.66-.624 1.2-.624 3.06-.666c1.62.042 1.812-.138 1.98.282c.12.3-.24.48-.672.96c-.96.96-1.524 1.44-1.578 1.74c-.39 1.319 1.146 2.098 1.986 1.258c.318-.317 1.788-1.799 1.932-1.919c.108-.096.366-.091.492.06c.108.106.12.12.108.6c-.011.444-.006 1.082-.005 1.74c.002.851-.043 1.799-.403 2.278c-.72 1.08-1.92 1.14-3 1.188c-1.02.06-1.86-.048-2.124.144c-.216.108-1.356 1.307-2.736 2.687l-2.46 2.459c-2.04 1.62-4.284-.9-2.784-2.7Z"/></g></svg>
            Opciones Avanzadas
        `;
        if (Termita.state.globalHeaders.length > 0) {
            this.generateAdvancedFields(Termita.state.globalHeaders, {});
        }
    }
};