// =====================================================
// JAM TRACKER — Dev Dashboard v1.1 (CORREGIDO)
// =====================================================

// Envolvemos todo para asegurar que el DOM existe
document.addEventListener('DOMContentLoaded', () => {

// NAMESPACE
const JAM = {
    activeColor: '#00ff9d',
    activeColorLabel: 'Verde = En curso',
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth(), // 0-indexed
    selectedDay: null,
    editingJamId: null,
    jamFormVisible: true,
};

// COLOR MAP
const COLOR_MAP = {
    '#00ff9d': 'Verde — En curso',
    '#ff3e6c': 'Rojo — Deadline',
    '#ffd93d': 'Amarillo — Importante',
    '#6c63ff': 'Violeta — Planeado',
    '#00cfff': 'Azul — Reunión',
    '#ff9a3c': 'Naranja — Revisión',
    '#ff69b4': 'Rosa — Personal',
};

// ============ STORAGE HELPERS ============
function loadData(key, fallback = []) {
    try {
        const raw = localStorage.getItem('jamtracker_' + key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        return fallback;
    }
}

function saveData(key, data) {
    try {
        localStorage.setItem('jamtracker_' + key, JSON.stringify(data));
    } catch (e) {
        showToast('Error al guardar datos', true);
    }
}

// ============ TOAST ============
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast show' + (isError ? ' danger' : '');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// ============ CLOCK (CORREGIDO) ============
function updateClock() {
    // Obtener hora actual en zona horaria de Bolivia (UTC-4) de manera fiable
    const optionsDate = { timeZone: 'America/La_Paz', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
    const optionsTime = { timeZone: 'America/La_Paz', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };

    const dateStr = new Date().toLocaleDateString('es-BO', optionsDate).toUpperCase();
    const timeStr = new Date().toLocaleTimeString('es-BO', optionsTime);

    document.getElementById('live-date').textContent = dateStr;
    document.getElementById('live-time').textContent = timeStr;

    // Actualizar countdowns si estamos en la tab de jams
    if (document.getElementById('tab-jams').classList.contains('active')) {
        renderJams();
    }
}

setInterval(updateClock, 1000);
updateClock();

// ============ TABS ============
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const content = document.getElementById('tab-' + tabName);
    if (btn) btn.classList.add('active');
    if (content) content.classList.add('active');

    // Refrescar contenido al cambiar de pestaña
    if (tabName === 'calendar') renderCalendar();
    if (tabName === 'jams') renderJams();
    if (tabName === 'tasks') renderTasks();
    if (tabName === 'notes') renderNotes();
    if (tabName === 'stats') renderStats();
}

// Asignar eventos a los botones de tabs (ya existen en el DOM)
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
    });
});

// ============ COLOR PICKER ============
document.getElementById('color-palette').addEventListener('click', (e) => {
    const btn = e.target.closest('.color-pick-btn');
    if (!btn) return;

    document.querySelectorAll('.color-pick-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    JAM.activeColor = btn.dataset.color;
    JAM.activeColorLabel = COLOR_MAP[btn.dataset.color] || '';
    document.getElementById('color-label').textContent = JAM.activeColorLabel;
    renderCalendar();
});

// ============ CALENDAR ============
function getCalendarEvents() {
    return loadData('events', []);
}

function addCalendarEvent(dateStr, color, label) {
    const events = getCalendarEvents();
    events.push({ id: Date.now(), date: dateStr, color, label });
    saveData('events', events);
    renderCalendar();
    if (JAM.selectedDay === dateStr) {
        showDayEvents(dateStr);
    }
    showToast('Evento añadido al calendario');
}

function removeCalendarEvent(eventId) {
    let events = getCalendarEvents();
    events = events.filter(e => e.id !== eventId);
    saveData('events', events);
    renderCalendar();
    if (JAM.selectedDay) showDayEvents(JAM.selectedDay);
    showToast('Evento eliminado', true);
}

function getEventsForDate(dateStr) {
    return getCalendarEvents().filter(e => e.date === dateStr);
}

function changeMonth(delta) {
    JAM.calendarMonth += delta;
    if (JAM.calendarMonth < 0) {
        JAM.calendarMonth = 11;
        JAM.calendarYear--;
    } else if (JAM.calendarMonth > 11) {
        JAM.calendarMonth = 0;
        JAM.calendarYear++;
    }
    JAM.selectedDay = null;
    document.getElementById('cal-day-events').style.display = 'none';
    renderCalendar();
}

document.getElementById('cal-prev').addEventListener('click', () => changeMonth(-1));
document.getElementById('cal-next').addEventListener('click', () => changeMonth(1));

function renderCalendar() {
    const year = JAM.calendarYear;
    const month = JAM.calendarMonth;

    const monthNames = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                        'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    document.getElementById('cal-month-label').textContent = monthNames[month] + ' ' + year;

    const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    // Usamos la misma zona para comparar (evitamos desfase)
    const todayStr = new Date().toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');

    const events = getCalendarEvents();
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    const dayLabels = ['DOM','LUN','MAR','MIE','JUE','VIE','SAB'];
    dayLabels.forEach(d => {
        const lbl = document.createElement('div');
        lbl.className = 'cal-day-label';
        lbl.textContent = d;
        grid.appendChild(lbl);
    });

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day empty';
        grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'cal-day';
        dayDiv.textContent = d;

        const dateStr = year + '-' + String(month + 1).padStart(2,'0') + '-' + String(d).padStart(2,'0');

        if (dateStr === todayStr) {
            dayDiv.classList.add('today');
        }

        const dayEvents = events.filter(e => e.date === dateStr);
        if (dayEvents.length > 0) {
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'day-dots';
            const uniqueColors = [...new Set(dayEvents.map(e => e.color))];
            uniqueColors.slice(0, 4).forEach(color => {
                const dot = document.createElement('span');
                dot.className = 'day-dot';
                dot.style.backgroundColor = color;
                dotsContainer.appendChild(dot);
            });
            dayDiv.appendChild(dotsContainer);
        }

        dayDiv.addEventListener('click', () => {
            JAM.selectedDay = dateStr;
            showDayEvents(dateStr);
        });

        grid.appendChild(dayDiv);
    }
}

function showDayEvents(dateStr) {
    const section = document.getElementById('cal-day-events');
    const title = document.getElementById('cal-day-title');
    const list = document.getElementById('cal-day-events-list');

    section.style.display = 'block';
    const [y, m, d] = dateStr.split('-');
    title.textContent = `EVENTOS DEL ${d}/${m}/${y}`;

    const events = getEventsForDate(dateStr);
    list.innerHTML = '';

    if (events.length === 0) {
        list.innerHTML = '<p style="color:var(--text2);font-size:12px;">Sin eventos este día.</p>';
    } else {
        events.forEach(ev => {
            const item = document.createElement('div');
            item.style.cssText = `
                display:flex;align-items:center;justify-content:space-between;
                padding:8px;margin-bottom:4px;background:var(--bg2);
                border-left:3px solid ${ev.color};font-size:12px;
            `;
            item.innerHTML = `
                <span><span style="display:inline-block;width:8px;height:8px;background:${ev.color};margin-right:8px;border-radius:50%;"></span>${ev.label || 'Evento'}</span>
                <button class="btn btn-danger btn-sm" data-event-id="${ev.id}" style="font-size:6px;padding:2px 6px;">X</button>
            `;
            item.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                removeCalendarEvent(ev.id);
            });
            list.appendChild(item);
        });
    }

    const addDiv = document.createElement('div');
    addDiv.style.cssText = 'margin-top:12px;display:flex;gap:8px;';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Nombre del evento...';
    input.style.cssText = 'flex:1;font-size:12px;';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary btn-sm';
    addBtn.textContent = '+ AÑADIR';
    addBtn.addEventListener('click', () => {
        const label = input.value.trim();
        if (!label) { showToast('Escribe un nombre para el evento', true); return; }
        addCalendarEvent(dateStr, JAM.activeColor, label);
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addBtn.click();
    });
    addDiv.appendChild(input);
    addDiv.appendChild(addBtn);
    list.appendChild(addDiv);
}

// ============ JAMS ============
function getJams() {
    return loadData('jams', []);
}

function saveJams(jams) {
    saveData('jams', jams);
    syncJamEventsToCalendar(jams);
}

function syncJamEventsToCalendar(jams) {
    let events = getCalendarEvents();
    events = events.filter(e => !String(e.id).startsWith('jam_'));
    jams.forEach(jam => {
        if (jam.start) {
            events.push({
                id: 'jam_start_' + jam.id,
                date: jam.start,
                color: '#6c63ff',
                label: '🚀 Inicio: ' + jam.name
            });
        }
        if (jam.end) {
            events.push({
                id: 'jam_dead_' + jam.id,
                date: jam.end,
                color: '#ff3e6c',
                label: '⏰ Deadline: ' + jam.name
            });
        }
    });
    saveData('events', events);
}

function addJam() {
    const name = document.getElementById('jam-name').value.trim();
    const start = document.getElementById('jam-start').value;
    const end = document.getElementById('jam-end').value;
    const link = document.getElementById('jam-link').value.trim();
    const theme = document.getElementById('jam-theme').value.trim();
    const notes = document.getElementById('jam-notes').value.trim();

    if (!name) { showToast('El nombre de la jam es obligatorio', true); return; }
    if (!start || !end) { showToast('Fechas de inicio y fin obligatorias', true); return; }
    if (new Date(end) < new Date(start)) { showToast('La fecha de fin debe ser posterior al inicio', true); return; }

    const jams = getJams();

    if (JAM.editingJamId) {
        const idx = jams.findIndex(j => j.id === JAM.editingJamId);
        if (idx >= 0) {
            jams[idx] = { ...jams[idx], name, start, end, link, theme, notes };
        }
        JAM.editingJamId = null;
        document.getElementById('btn-add-jam').textContent = '+ AGREGAR JAM';
        showToast('Jam actualizada');
    } else {
        const jam = {
            id: Date.now(),
            name, start, end, link, theme, notes,
            createdAt: new Date().toISOString()
        };
        jams.push(jam);
        showToast('Jam agregada');
    }

    saveJams(jams);
    clearJamForm();
    renderJams();
    renderCalendar();
}

function clearJamForm() {
    document.getElementById('jam-name').value = '';
    document.getElementById('jam-start').value = '';
    document.getElementById('jam-end').value = '';
    document.getElementById('jam-link').value = '';
    document.getElementById('jam-theme').value = '';
    document.getElementById('jam-notes').value = '';
    JAM.editingJamId = null;
    document.getElementById('btn-add-jam').textContent = '+ AGREGAR JAM';
}

function editJam(jamId) {
    const jams = getJams();
    const jam = jams.find(j => j.id === jamId);
    if (!jam) return;

    document.getElementById('jam-name').value = jam.name;
    document.getElementById('jam-start').value = jam.start;
    document.getElementById('jam-end').value = jam.end;
    document.getElementById('jam-link').value = jam.link || '';
    document.getElementById('jam-theme').value = jam.theme || '';
    document.getElementById('jam-notes').value = jam.notes || '';
    JAM.editingJamId = jamId;
    document.getElementById('btn-add-jam').textContent = '✎ ACTUALIZAR JAM';

    if (!JAM.jamFormVisible) toggleJamForm();
    document.getElementById('jam-name').focus();
}

function deleteJam(jamId) {
    if (!confirm('¿Eliminar esta jam? Esta acción no se puede deshacer.')) return;
    let jams = getJams();
    jams = jams.filter(j => j.id !== jamId);
    saveJams(jams);
    renderJams();
    renderCalendar();
    showToast('Jam eliminada', true);
}

function toggleJamForm() {
    JAM.jamFormVisible = !JAM.jamFormVisible;
    const wrapper = document.getElementById('jam-form-wrapper');
    const btn = document.getElementById('btn-toggle-jam-form');
    if (JAM.jamFormVisible) {
        wrapper.style.display = 'block';
        btn.textContent = '▲ CERRAR';
    } else {
        wrapper.style.display = 'none';
        btn.textContent = '▼ ABRIR';
    }
}

document.getElementById('btn-toggle-jam-form').addEventListener('click', toggleJamForm);
document.getElementById('btn-add-jam').addEventListener('click', addJam);

function getJamStatus(start, end) {
    // Usamos fechas en zona Bolivia para comparar correctamente
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
    const startDate = new Date(start + 'T00:00:00-04:00');
    const endDate = new Date(end + 'T00:00:00-04:00');

    if (now > endDate) return 'done';
    const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 'urgent';
    if (diffDays <= 3) return 'warning';
    if (now >= startDate && now <= endDate) return 'active';
    if (now < startDate) return 'upcoming';
    return 'done';
}

function getCountdownText(start, end) {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
    const startDate = new Date(start + 'T00:00:00-04:00');
    const endDate = new Date(end + 'T00:00:00-04:00');

    if (now > endDate) {
        return 'FINALIZADA';
    }
    if (now < startDate) {
        const diff = startDate - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `EMPIEZA EN: ${days}D ${hours}H`;
    }
    const diff = endDate - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `⏳ ${days}D ${hours}H ${mins}MIN RESTANTES`;
}

function getProgressPercent(start, end) {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
    const startDate = new Date(start + 'T00:00:00-04:00');
    const endDate = new Date(end + 'T00:00:00-04:00');
    if (now < startDate) return 0;
    if (now > endDate) return 100;
    const total = endDate - startDate;
    const elapsed = now - startDate;
    return Math.min(100, Math.round((elapsed / total) * 100));
}

function renderJams() {
    const jams = getJams();
    const list = document.getElementById('jam-list');

    if (jams.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="pixel-art">🎮</span>
                <p>NO HAY JAMS REGISTRADAS<br>¡AGREGA TU PRIMERA GAME JAM!</p>
            </div>
        `;
        return;
    }

    const sorted = [...jams].sort((a, b) => {
        const statusOrder = { active: 0, urgent: 0, warning: 1, upcoming: 2, done: 3 };
        const sa = getJamStatus(a.start, a.end);
        const sb = getJamStatus(b.start, b.end);
        return (statusOrder[sa] || 0) - (statusOrder[sb] || 0);
    });

    list.innerHTML = sorted.map(jam => {
        const status = getJamStatus(jam.start, jam.end);
        const countdown = getCountdownText(jam.start, jam.end);
        const progress = getProgressPercent(jam.start, jam.end);
        const tags = [];
        if (jam.link) tags.push('🔗 LINK');
        if (jam.theme) tags.push('🎯 ' + jam.theme.toUpperCase());

        let badgeClass = 'badge-active';
        let badgeText = 'ACTIVA';
        if (status === 'done') { badgeClass = 'badge-done'; badgeText = 'FINALIZADA'; }
        if (status === 'urgent') { badgeClass = 'badge-urgent'; badgeText = '¡URGENTE!'; }
        if (status === 'upcoming') { badgeClass = 'badge'; badgeText = 'PRÓXIMA'; }

        return `
            <div class="jam-card ${status === 'urgent' ? 'urgent' : ''} ${status === 'warning' ? 'warning' : ''} ${status === 'done' ? 'done' : ''}">
                <div class="jam-card-header">
                    <div class="jam-name">${escapeHTML(jam.name)}</div>
                    <div class="jam-actions">
                        <button class="btn btn-ghost btn-sm" onclick="editJam(${jam.id})" title="Editar">✎</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteJam(${jam.id})" title="Eliminar">✕</button>
                    </div>
                </div>
                <div class="jam-meta">
                    📅 ${formatDateShort(jam.start)} → ${formatDateShort(jam.end)} &nbsp; <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
                ${jam.theme ? `<div class="jam-meta">🎯 Tema: <strong>${escapeHTML(jam.theme)}</strong></div>` : ''}
                ${jam.link ? `<div class="jam-meta">🔗 <a href="${escapeHTML(jam.link)}" target="_blank" style="color:var(--accent4);">${escapeHTML(jam.link)}</a></div>` : ''}
                ${jam.notes ? `<div class="jam-notes-preview">💡 ${escapeHTML(jam.notes.substring(0, 80))}${jam.notes.length > 80 ? '...' : ''}</div>` : ''}
                <div class="jam-countdown ${status === 'urgent' ? 'urgent' : ''} ${status === 'warning' ? 'warning' : ''} ${status === 'done' ? 'done' : ''}">${countdown}</div>
                <div class="jam-progress">
                    <div class="jam-progress-bar" style="width:${progress}%;${status === 'urgent' ? 'background:#ff3e6c;' : ''}${status === 'done' ? 'background:#7a7a9a;' : ''}"></div>
                </div>
                ${tags.length > 0 ? `<div class="jam-tags">${tags.map(t => `<span class="jam-tag">${t}</span>`).join('')}</div>` : ''}
            </div>
        `;
    }).join('');
}

function formatDateShort(dateStr) {
    if (!dateStr) return '--';
    const parts = dateStr.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0].slice(2);
}

fun       const label = input.value.trim();
        if (!label) { showToast('Escribe un nombre para el evento', true); return; }
        addCalendarEvent(dateStr, JAM.activeColor, label);
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addBtn.click();
    });
    addDiv.appendChild(input);
    addDiv.appendChild(addBtn);
    list.appendChild(addDiv);
}

// ============ JAMS ============
function getJams() {
    return loadData('jams', []);
}

function saveJams(jams) {
    saveData('jams', jams);
    // También sincronizar eventos de calendario con deadlines de jams
    syncJamEventsToCalendar(jams);
}

function syncJamEventsToCalendar(jams) {
    // Añade/actualiza eventos en el calendario para cada jam (inicio y deadline)
    let events = getCalendarEvents();
    // Eliminar eventos generados por jams (tienen prefijo jam_)
    events = events.filter(e => !String(e.id).startsWith('jam_'));
    // Recrear eventos desde jams
    jams.forEach(jam => {
        if (jam.start) {
            events.push({
                id: 'jam_start_' + jam.id,
                date: jam.start,
                color: '#6c63ff',
                label: '🚀 Inicio: ' + jam.name
            });
        }
        if (jam.end) {
            // Deadline color rojo
            events.push({
                id: 'jam_dead_' + jam.id,
                date: jam.end,
                color: '#ff3e6c',
                label: '⏰ Deadline: ' + jam.name
            });
        }
    });
    saveData('events', events);
}

function addJam() {
    const name = document.getElementById('jam-name').value.trim();
    const start = document.getElementById('jam-start').value;
    const end = document.getElementById('jam-end').value;
    const link = document.getElementById('jam-link').value.trim();
    const theme = document.getElementById('jam-theme').value.trim();
    const notes = document.getElementById('jam-notes').value.trim();

    if (!name) { showToast('El nombre de la jam es obligatorio', true); return; }
    if (!start || !end) { showToast('Fechas de inicio y fin obligatorias', true); return; }
    if (new Date(end) < new Date(start)) { showToast('La fecha de fin debe ser posterior al inicio', true); return; }

    const jams = getJams();

    if (JAM.editingJamId) {
        // Editar jam existente
        const idx = jams.findIndex(j => j.id === JAM.editingJamId);
        if (idx >= 0) {
            jams[idx] = { ...jams[idx], name, start, end, link, theme, notes };
        }
        JAM.editingJamId = null;
        document.getElementById('btn-add-jam').textContent = '+ AGREGAR JAM';
        showToast('Jam actualizada');
    } else {
        const jam = {
            id: Date.now(),
            name, start, end, link, theme, notes,
            createdAt: new Date().toISOString()
        };
        jams.push(jam);
        showToast('Jam agregada');
    }

    saveJams(jams);
    clearJamForm();
    renderJams();
    renderCalendar();
}

function clearJamForm() {
    document.getElementById('jam-name').value = '';
    document.getElementById('jam-start').value = '';
    document.getElementById('jam-end').value = '';
    document.getElementById('jam-link').value = '';
    document.getElementById('jam-theme').value = '';
    document.getElementById('jam-notes').value = '';
    JAM.editingJamId = null;
    document.getElementById('btn-add-jam').textContent = '+ AGREGAR JAM';
}

function editJam(jamId) {
    const jams = getJams();
    const jam = jams.find(j => j.id === jamId);
    if (!jam) return;

    document.getElementById('jam-name').value = jam.name;
    document.getElementById('jam-start').value = jam.start;
    document.getElementById('jam-end').value = jam.end;
    document.getElementById('jam-link').value = jam.link || '';
    document.getElementById('jam-theme').value = jam.theme || '';
    document.getElementById('jam-notes').value = jam.notes || '';
    JAM.editingJamId = jamId;
    document.getElementById('btn-add-jam').textContent = '✎ ACTUALIZAR JAM';

    // Asegurar que el formulario esté visible
    if (!JAM.jamFormVisible) toggleJamForm();
    document.getElementById('jam-name').focus();
}

function deleteJam(jamId) {
    if (!confirm('¿Eliminar esta jam? Esta acción no se puede deshacer.')) return;
    let jams = getJams();
    jams = jams.filter(j => j.id !== jamId);
    saveJams(jams);
    renderJams();
    renderCalendar();
    showToast('Jam eliminada', true);
}

function toggleJamForm() {
    JAM.jamFormVisible = !JAM.jamFormVisible;
    const wrapper = document.getElementById('jam-form-wrapper');
    const btn = document.getElementById('btn-toggle-jam-form');
    if (JAM.jamFormVisible) {
        wrapper.style.display = 'block';
        btn.textContent = '▲ CERRAR';
    } else {
        wrapper.style.display = 'none';
        btn.textContent = '▼ ABRIR';
    }
}

document.getElementById('btn-toggle-jam-form').addEventListener('click', toggleJamForm);
document.getElementById('btn-add-jam').addEventListener('click', addJam);

function getJamStatus(start, end) {
    const now = new Date();
    const startDate = new Date(start + 'T00:00:00-04:00');
    const endDate = new Date(end + 'T00:00:00-04:00');

    if (now > endDate) return 'done';
    const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 'urgent';
    if (diffDays <= 3) return 'warning';
    if (now >= startDate && now <= endDate) return 'active';
    if (now < startDate) return 'upcoming';
    return 'done';
}

function getCountdownText(start, end) {
    const now = new Date();
    const startDate = new Date(start + 'T00:00:00-04:00');
    const endDate = new Date(end + 'T00:00:00-04:00');

    if (now > endDate) {
        return 'FINALIZADA';
    }
    if (now < startDate) {
        const diff = startDate - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `EMPIEZA EN: ${days}D ${hours}H`;
    }
    // En curso
    const diff = endDate - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `⏳ ${days}D ${hours}H ${mins}MIN RESTANTES`;
}

function getProgressPercent(start, end) {
    const now = new Date();
    const startDate = new Date(start + 'T00:00:00-04:00');
    const endDate = new Date(end + 'T00:00:00-04:00');
    if (now < startDate) return 0;
    if (now > endDate) return 100;
    const total = endDate - startDate;
    const elapsed = now - startDate;
    return Math.min(100, Math.round((elapsed / total) * 100));
}

function renderJams() {
    const jams = getJams();
    const list = document.getElementById('jam-list');

    if (jams.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="pixel-art">🎮</span>
                <p>NO HAY JAMS REGISTRADAS<br>¡AGREGA TU PRIMERA GAME JAM!</p>
            </div>
        `;
        return;
    }

    // Ordenar: activas primero, luego próximas, luego finalizadas
    const sorted = [...jams].sort((a, b) => {
        const statusOrder = { active: 0, urgent: 0, warning: 1, upcoming: 2, done: 3 };
        const sa = getJamStatus(a.start, a.end);
        const sb = getJamStatus(b.start, b.end);
        return (statusOrder[sa] || 0) - (statusOrder[sb] || 0);
    });

    list.innerHTML = sorted.map(jam => {
        const status = getJamStatus(jam.start, jam.end);
        const countdown = getCountdownText(jam.start, jam.end);
        const progress = getProgressPercent(jam.start, jam.end);
        const tags = [];
        if (jam.link) tags.push('🔗 LINK');
        if (jam.theme) tags.push('🎯 ' + jam.theme.toUpperCase());

        let badgeClass = 'badge-active';
        let badgeText = 'ACTIVA';
        if (status === 'done') { badgeClass = 'badge-done'; badgeText = 'FINALIZADA'; }
        if (status === 'urgent') { badgeClass = 'badge-urgent'; badgeText = '¡URGENTE!'; }
        if (status === 'upcoming') { badgeClass = 'badge'; badgeText = 'PRÓXIMA'; }

        return `
            <div class="jam-card ${status === 'urgent' ? 'urgent' : ''} ${status === 'warning' ? 'warning' : ''} ${status === 'done' ? 'done' : ''}">
                <div class="jam-card-header">
                    <div class="jam-name">${escapeHTML(jam.name)}</div>
                    <div class="jam-actions">
                        <button class="btn btn-ghost btn-sm" onclick="editJam(${jam.id})" title="Editar">✎</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteJam(${jam.id})" title="Eliminar">✕</button>
                    </div>
                </div>
                <div class="jam-meta">
                    📅 ${formatDateShort(jam.start)} → ${formatDateShort(jam.end)} &nbsp; <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
                ${jam.theme ? `<div class="jam-meta">🎯 Tema: <strong>${escapeHTML(jam.theme)}</strong></div>` : ''}
                ${jam.link ? `<div class="jam-meta">🔗 <a href="${escapeHTML(jam.link)}" target="_blank" style="color:var(--accent4);">${escapeHTML(jam.link)}</a></div>` : ''}
                ${jam.notes ? `<div class="jam-notes-preview">💡 ${escapeHTML(jam.notes.substring(0, 80))}${jam.notes.length > 80 ? '...' : ''}</div>` : ''}
                <div class="jam-countdown ${status === 'urgent' ? 'urgent' : ''} ${status === 'warning' ? 'warning' : ''} ${status === 'done' ? 'done' : ''}">${countdown}</div>
                <div class="jam-progress">
                    <div class="jam-progress-bar" style="width:${progress}%;${status === 'urgent' ? 'background:#ff3e6c;' : ''}${status === 'done' ? 'background:#7a7a9a;' : ''}"></div>
                </div>
                ${tags.length > 0 ? `<div class="jam-tags">${tags.map(t => `<s
