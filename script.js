document.addEventListener('DOMContentLoaded', () => {
    
    // === ELEMEN DOM ===
    const board = document.getElementById('kanban-board');
    const fab = document.getElementById('fab');
    const cardModal = document.getElementById('card-modal');
    const confirmModal = document.getElementById('confirm-modal');
    const cardForm = document.getElementById('card-form');
    const modalTitle = document.getElementById('modal-title');
    const deleteCardBtn = document.getElementById('delete-card-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const colorPalette = document.getElementById('color-palette');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('sidebar');
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');
    const addColumnBtn = document.getElementById('add-column-btn');
    const addProjectBtn = document.getElementById('add-project-btn');
    const projectList = document.getElementById('project-list');
    const projectTitle = document.getElementById('project-title');


    // === STATE APLIKASI ===
    let state = {
        projects: [],
        currentProjectId: null,
    };
    
    let draggedCard = null;
    let sourceColumnId = null;
    let cardToConfirmDelete = { columnId: null, cardId: null };

    // === FUNGSI UTAMA ===

    function loadData() {
        const savedData = localStorage.getItem('kanbanData');
        if (savedData) {
            state = JSON.parse(savedData);
            if (!state.currentProjectId || !state.projects.find(p => p.id === state.currentProjectId)) {
                state.currentProjectId = state.projects[0]?.id || null;
            }
        } else {
            const defaultProject = {
                id: genId(),
                name: 'Project Utama',
                columns: [
                    { id: genId(), title: 'To Do', cards: [] },
                    { id: genId(), title: 'Doing', cards: [] },
                    { id: genId(), title: 'Done', cards: [] }
                ]
            };
            state = {
                projects: [defaultProject],
                currentProjectId: defaultProject.id
            };
        }
        renderApp();
    }

    function saveData() {
        localStorage.setItem('kanbanData', JSON.stringify(state));
    }

    function getCurrentProject() {
        if (!state.currentProjectId) return null;
        return state.projects.find(p => p.id === state.currentProjectId);
    }

    function renderApp() {
        if (!getCurrentProject() && state.projects.length > 0) {
            state.currentProjectId = state.projects[0].id;
        }
        renderSidebarNav();
        renderHeader();
        renderBoard();
    }

    function renderHeader() {
        const project = getCurrentProject();
        projectTitle.textContent = project ? project.name : 'mynote'; // Judul default
    }

    function renderSidebarNav() {
        projectList.innerHTML = ''; 
        state.projects.forEach(project => {
            const li = document.createElement('li');
            li.className = 'project-list-item';
            li.dataset.projectId = project.id;
            if (project.id === state.currentProjectId) {
                li.classList.add('active');
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'project-name';
            nameSpan.textContent = project.name;
            nameSpan.addEventListener('click', () => switchProject(project.id));
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-project-btn';
            editBtn.innerHTML = '<i class="ph ph-pencil-simple"></i>';
            editBtn.title = 'Edit nama project';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                editProjectName(project.id);
            });

            li.appendChild(nameSpan);
            li.appendChild(editBtn);
            projectList.appendChild(li);
        });
    }

    function renderBoard() {
        board.querySelectorAll('.kanban-column').forEach(col => col.remove());
        
        const project = getCurrentProject();
        if (!project) {
            board.insertBefore(addColumnBtn, null); 
            return;
        }

        project.columns.forEach(column => {
            const columnEl = createColumnElement(column);
            board.insertBefore(columnEl, addColumnBtn); 
        });

        attachColumnListeners();
        attachCardListeners();
    }

    function createColumnElement(column) {
        const columnEl = document.createElement('div');
        columnEl.className = 'kanban-column';
        columnEl.dataset.columnId = column.id;

        const sortedCards = [...column.cards].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const cardsHtml = sortedCards.map(card => createCardElement(card).outerHTML).join('');

        columnEl.innerHTML = `
            <h2 class="column-title" contenteditable="true" data-column-id="${column.id}">${column.title}</h2>
            <div class="card-list" data-column-id="${column.id}">
                ${cardsHtml}
            </div>
            <button class="add-card-btn" data-column-id="${column.id}">+ Tambah Kartu</button>
        `;
        return columnEl;
    }

    function createCardElement(card) {
        const cardEl = document.createElement('div');
        cardEl.className = `kanban-card ${card.isPinned ? 'pinned' : ''}`;
        cardEl.dataset.cardId = card.id;
        cardEl.dataset.color = card.color || 'default';
        cardEl.draggable = true;

        const tagsHtml = (card.tags || []).map(tag => `<span class="card-tag">${tag}</span>`).join('');
        const date = new Date(card.updatedAt || card.createdAt).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        cardEl.innerHTML = `
            <div class="card-header">
                <h4 class="card-title">${card.title}</h4>
                <button class="pin-btn" data-card-id="${card.id}" title="Pin kartu">
                    <i class="ph ${card.isPinned ? 'ph-fill' : 'ph'} ph-push-pin"></i>
                </button>
            </div>
            <p class="card-desc">${card.description}</p>
            <div class="card-footer">
                <div class="card-tags">${tagsHtml}</div>
                <span class="card-date">${date}</span>
            </div>
        `;
        return cardEl;
    }

    // === MANAJEMEN PROJECT ===

    function addProject() {
        const name = prompt('Masukkan nama project baru:', 'Project Baru');
        if (name) {
            const newProject = {
                id: genId(),
                name: name,
                columns: [ 
                    { id: genId(), title: 'To Do', cards: [] },
                    { id: genId(), title: 'Doing', cards: [] },
                    { id: genId(), title: 'Done', cards: [] }
                ]
            };
            state.projects.push(newProject);
            switchProject(newProject.id); 
        }
    }

    function switchProject(projectId) {
        state.currentProjectId = projectId;
        saveData();
        renderApp();
        sidebar.classList.remove('open'); 
    }

    function editProjectName(projectId) {
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const newName = prompt('Masukkan nama project baru:', project.name);

        if (newName && newName.trim() !== '' && newName !== project.name) {
            project.name = newName.trim();
            saveData();
            renderApp(); 
        }
    }


    // === MANAJEMEN KOLOM ===

    function addColumn() {
        const project = getCurrentProject();
        if (!project) return;

        const newTitle = prompt('Masukkan nama kolom baru:', 'Kolom Baru');
        if (newTitle) {
            const newColumn = {
                id: genId(),
                title: newTitle,
                cards: []
            };
            project.columns.push(newColumn);
            saveData();
            renderBoard();
        }
    }

    function updateColumnTitle(columnId, newTitle) {
        const project = getCurrentProject();
        if (!project) return;

        const column = project.columns.find(col => col.id === columnId);
        if (column && column.title !== newTitle) {
            column.title = newTitle;
            saveData();
        }
    }

    // === MANAJEMEN KARTU (MODAL) ===

    /**
     * Membuka modal (DIPERBARUI)
     */
    function openCardModal(mode = 'new', columnId = null, cardId = null) {
        const project = getCurrentProject();
        if (!project) return; 

        cardForm.reset();
        
        // === PERUBAHAN DI SINI ===
        // Dapatkan elemen modal content
        const modalContentEl = cardModal.querySelector('.modal-content');
        // === AKHIR PERUBAHAN ===

        // Reset pilihan warna
        document.querySelectorAll('.color-option.selected').forEach(el => el.classList.remove('selected'));
        colorPalette.querySelector('.color-option[data-color="default"]').classList.add('selected');

        if (mode === 'edit') {
            const { card, column } = findCard(cardId);
            if (!card) return;

            modalTitle.textContent = 'Edit Kartu';
            deleteCardBtn.style.display = 'block';
            document.getElementById('card-id-input').value = card.id;
            document.getElementById('column-id-input').value = column.id;
            document.getElementById('card-title').value = card.title;
            document.getElementById('card-desc').value = card.description;
            document.getElementById('card-tags').value = (card.tags || []).join(', ');
            
            const color = card.color || 'default';
            document.getElementById('card-color-input').value = color;
            colorPalette.querySelector(`.color-option[data-color="${color}"]`).classList.add('selected');

            // === PERUBAHAN DI SINI ===
            // Atur warna modal sesuai warna kartu yang diedit
            modalContentEl.dataset.color = color; 
            // === AKHIR PERUBAHAN ===

        } else { // mode 'new'
            modalTitle.textContent = 'Buat Kartu Baru';
            deleteCardBtn.style.display = 'none';
            document.getElementById('column-id-input').value = columnId || project.columns[0]?.id;
            document.getElementById('card-id-input').value = '';

            // === PERUBAHAN DI SINI ===
            // Atur warna modal ke default (putih)
            modalContentEl.dataset.color = 'default'; 
            // === AKHIR PERUBAHAN ===
        }
        cardModal.classList.add('open');
    }

    function closeCardModal() {
        cardModal.classList.remove('open');
    }

    function handleCardFormSubmit(e) {
        e.preventDefault();
        const project = getCurrentProject();
        if (!project) return;

        const cardId = document.getElementById('card-id-input').value;
        const columnId = document.getElementById('column-id-input').value;
        const cardData = {
            title: document.getElementById('card-title').value,
            description: document.getElementById('card-desc').value,
            tags: document.getElementById('card-tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
            color: document.getElementById('card-color-input').value,
            updatedAt: new Date().toISOString()
        };

        if (cardId) {
            // Edit kartu
            const { card } = findCard(cardId);
            if (card) {
                Object.assign(card, cardData);
            }
        } else {
            // Buat kartu baru
            const newCard = {
                ...cardData,
                id: genId(),
                createdAt: new Date().toISOString(),
                isPinned: false
            };
            const column = project.columns.find(col => col.id === columnId);
            if (column) {
                column.cards.push(newCard);
            }
        }

        saveData();
        renderBoard();
        closeCardModal();
    }

    function deleteCard() {
        const cardId = document.getElementById('card-id-input').value;
        const { column } = findCard(cardId);
        
        if (column) {
            cardToConfirmDelete = { columnId: column.id, cardId: cardId };
            showConfirmModal('Apakah Anda yakin ingin menghapus kartu ini?');
        }
    }

    function togglePinCard(cardId) {
        const { card } = findCard(cardId);
        if (card) {
            card.isPinned = !card.isPinned;
            card.updatedAt = new Date().toISOString();
            saveData();
            renderBoard();
        }
    }

    // === MODAL KONFIRMASI ===

    function showConfirmModal(message) {
        document.getElementById('confirm-text').textContent = message;
        confirmModal.classList.add('open');
    }

    function closeConfirmModal() {
        confirmModal.classList.remove('open');
        cardToConfirmDelete = { columnId: null, cardId: null };
    }

    function handleConfirmDelete() {
        const project = getCurrentProject();
        if (!project) return;

        const { columnId, cardId } = cardToConfirmDelete;
        if (columnId && cardId) {
            const column = project.columns.find(col => col.id === columnId);
            if (column) {
                column.cards = column.cards.filter(card => card.id !== cardId);
                saveData();
                renderBoard();
                closeCardModal();
            }
        }
        closeConfirmModal();
    }

    // === DRAG & DROP ===

    function handleDragStart(e) {
        if (e.target.classList.contains('kanban-card')) {
            draggedCard = e.target;
            sourceColumnId = e.target.closest('.kanban-column').dataset.columnId;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedCard.dataset.cardId);
            setTimeout(() => {
                draggedCard.classList.add('dragging');
            }, 0);
        }
    }

    function handleDragEnd(e) {
        if (draggedCard) {
            draggedCard.classList.remove('dragging');
            draggedCard = null;
            sourceColumnId = null;
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDrop(e) {
        e.preventDefault();
        const project = getCurrentProject();
        if (!project) return;

        const cardId = e.dataTransfer.getData('text/plain');
        const targetColumnEl = e.target.closest('.kanban-column');
        
        if (!targetColumnEl || !cardId || !sourceColumnId) return;

        const targetColumnId = targetColumnEl.dataset.columnId;
        if (sourceColumnId === targetColumnId) return;

        const sourceColumn = project.columns.find(col => col.id === sourceColumnId);
        const targetColumn = project.columns.find(col => col.id === targetColumnId);
        
        if (sourceColumn && targetColumn) {
            let cardToMove = null;
            const cardIndex = sourceColumn.cards.findIndex(card => card.id === cardId);
            if (cardIndex > -1) {
                cardToMove = sourceColumn.cards.splice(cardIndex, 1)[0];
            }

            if (cardToMove) {
                cardToMove.updatedAt = new Date().toISOString();
                targetColumn.cards.push(cardToMove);
                saveData();
                renderBoard();
            }
        }
    }
    
    // === EXPORT / IMPORT ===

    function exportData() {
        const dataStr = JSON.stringify(state, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mynote-backup-${new Date().toISOString().split('T')[0]}.json`; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedState = JSON.parse(event.target.result);
                if (importedState && Array.isArray(importedState.projects)) {
                    state = importedState;
                    if (!state.currentProjectId || !state.projects.find(p => p.id === state.currentProjectId)) {
                        state.currentProjectId = state.projects[0]?.id || null;
                    }
                    saveData();
                    renderApp(); 
                    alert('Data berhasil diimpor!');
                } else {
                    alert('Format file tidak valid.');
                }
            } catch (error) {
                alert('Gagal membaca file: ' + error.message);
            }
            e.target.value = null; 
        };
        reader.readText(file);
    }


    // === HELPER FUNCTIONS ===

    function genId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    function findCard(cardId) {
        const project = getCurrentProject();
        if (!project) return { card: null, column: null, project: null };

        for (const column of project.columns) {
            const card = column.cards.find(c => c.id === cardId);
            if (card) {
                return { card, column, project };
            }
        }
        return { card: null, column: null, project: null };
    }
    
    // === ATTACH EVENT LISTENERS ===

    function attachColumnListeners() {
        board.querySelectorAll('.column-title').forEach(title => {
            title.addEventListener('blur', (e) => {
                const columnId = e.target.dataset.columnId;
                const newTitle = e.target.textContent.trim();
                if (newTitle) {
                    updateColumnTitle(columnId, newTitle);
                } else {
                    const project = getCurrentProject();
                    e.target.textContent = project.columns.find(c => c.id === columnId).title;
                }
            });
            title.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });

        board.querySelectorAll('.add-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const columnId = e.target.dataset.columnId;
                openCardModal('new', columnId);
            });
        });
        
        board.querySelectorAll('.kanban-column').forEach(col => {
            col.addEventListener('dragover', handleDragOver);
            col.addEventListener('drop', handleDrop);
        });
    }

    function attachCardListeners() {
        board.querySelectorAll('.kanban-card').forEach(card => {
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);

            card.addEventListener('click', (e) => {
                if (!e.target.closest('.pin-btn')) {
                    const cardId = e.currentTarget.dataset.cardId;
                    openCardModal('edit', null, cardId);
                }
            });

            card.querySelector('.pin-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const cardId = e.currentTarget.dataset.cardId;
                togglePinCard(cardId);
            });
        });
    }

    // Listener Statis
    fab.addEventListener('click', () => openCardModal('new'));
    addColumnBtn.addEventListener('click', addColumn);
    addProjectBtn.addEventListener('click', addProject);
    
    // Modal
    cardForm.addEventListener('submit', handleCardFormSubmit);
    cancelBtn.addEventListener('click', closeCardModal);
    deleteCardBtn.addEventListener('click', deleteCard);
    
    // === PERUBAHAN DI SINI ===
    // Event listener untuk palet warna
    colorPalette.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-option')) {
            // Hapus 'selected' dari semua
            colorPalette.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
            // Tambah 'selected' ke yang diklik
            e.target.classList.add('selected');
            
            // Dapatkan warna yang dipilih
            const selectedColor = e.target.dataset.color;
            
            // Update input tersembunyi
            document.getElementById('card-color-input').value = selectedColor;

            // Update warna background modal content secara real-time
            const modalContent = cardModal.querySelector('.modal-content');
            modalContent.dataset.color = selectedColor;
        }
    });
    // === AKHIR PERUBAHAN ===

    // Modal Konfirmasi
    confirmOkBtn.addEventListener('click', handleConfirmDelete);
    confirmCancelBtn.addEventListener('click', closeConfirmModal);

    // Sidebar
    sidebarToggle.addEventListener('click', () => sidebar.classList.add('open'));
    closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    
    // Import / Export
    exportBtn.addEventListener('click', exportData);
    document.querySelector('.sidebar-btn input[type="file"]').closest('button').addEventListener('click', () => {
        importFile.click();
    });
    importFile.addEventListener('change', importData);


    // === INISIALISASI ===
    loadData(); 
});