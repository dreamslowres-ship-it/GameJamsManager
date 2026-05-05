// =====================================================
// JAM TRACKER — Dev Dashboard v1.2 (GitHub Pages ready)
// =====================================================

(function() {
  "use strict";

  // ---------- NAMESPACE ----------
  const JAM = {
    activeColor: '#00ff9d',
    activeColorLabel: 'Verde — En curso',
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth(), // 0-indexed
    selectedDay: null,
    editingJamId: null,
    jamFormVisible: true
  };

  // ---------- COLOR MAP ----------
  const COLOR_MAP = {
    '#00ff9d': 'Verde — En curso',
    '#ff3e6c': 'Rojo — Deadline',
    '#ffd93d': 'Amarillo — Importante',
    '#6c63ff': 'Violeta — Planeado',
    '#00cfff': 'Azul — Reunión',
    '#ff9a3c': 'Naranja — Revisión',
    '#ff69b4': 'Rosa — Personal'
  };

  // ---------- STORAGE HELPERS ----------
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

  // ---------- TOAST ----------
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

  // ---------- RELOJ (con fallback por si no soporta timeZone) ----------
  function getBoliviaDate() {
    try {
      // Intenta con timeZone (estándar moderno)
      const d = new Date();
      const str = d.toLocaleString('es-BO', { timeZone: 'America/La_Paz', hour12: false });
      return new Date(str);
    } catch (e) {
      // Fallback manual UTC-4
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      return new Date(utc + (3600000 * -4));
    }
  }

  function updateClock() {
    const now = getBoliviaDate();
    const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SAB'];
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

    const dayName = days[now.getDay()];
    const day = String(now.getDate()).padStart(2, '0');
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const time = now.toTimeString().split(' ')[0]; // HH:MM:SS

    document.getElementById('live-date').textContent = `${dayName} ${day}/${month}/${year}`;
    document.getElementById('live-time').textContent = time;

    if (document.getElementById('tab-jams').classList.contains('active')) {
      renderJams();
    }
  }

  setInterval(updateClock, 1000);
  updateClock();

  // ---------- PESTAÑAS ----------
  function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const content = document.getElementById('tab-' + tabName);
    if (btn) btn.classList.add('active');
    if (content) content.classList.add('active');

    if (tabName === 'calendar') renderCalendar();
    if (tabName === 'jams') renderJams();
    if (tabName === 'tasks') renderTasks();
    if (tabName === 'notes') renderNotes();
    if (tabName === 'stats') renderStats();
  }

  // Eventos de botones de tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ---------- COLOR PICKER ----------
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

  // ---------- CALENDARIO ----------
  function getCalendarEvents() {
    return loadData('events', []);
  }

  function addCalendarEvent(dateStr, color, label) {
    const events = getCalendarEvents();
    events.push({ id: Date.now(), date: dateStr, color, label });
    saveData('events', events);
    renderCalendar();
    if (JAM.selectedDay === dateStr) showDayEvents(dateStr);
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

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = getBoliviaDate();
    const todayStr = today.getFullYear() + '-' +
                     String(today.getMonth() + 1).padStart(2,'0') + '-' +
                     String(today.getDate()).padStart(2,'0');

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

      if (dateStr === todayStr) dayDiv.classList.add('today');

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

  // ---------- JAMS ----------
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
      jams.push({
        id: Date.now(),
        name, start, end, link, theme, notes,
        createdAt: new Date().toISOString()
      });
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
    wrapper.style.display = JAM.jamFormVisible ? 'block' : 'none';
    btn.textContent = JAM.jamFormVisible ? '▲ CERRAR' : '▼ ABRIR';
  }

  document.getElementById('btn-toggle-jam-form').addEventListener('click', toggleJamForm);
  document.getElementById('btn-add-jam').addEventListener('click', addJam);

  function getJamStatus(start, end) {
    const now = getBoliviaDate();
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
    const now = getBoliviaDate();
    const startDate = new Date(start + 'T00:00:00-04:00');
    const endDate = new Date(end + 'T00:00:00-04:00');
    if (now > endDate) return 'FINALIZADA';
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
    const now = getBoliviaDate();
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
      list.innerHTML = `<div class="empty-state"><span class="pixel-art">🎮</span><p>NO HAY JAMS REGISTRADAS<br>¡AGREGA TU PRIMERA GAME JAM!</p></div>`;
      return;
    }

    const sorted = [...jams].sort((a, b) => {
      const order = { active:0, urgent:0, warning:1, upcoming:2, done:3 };
      return (order[getJamStatus(a.start, a.end)] || 0) - (order[getJamStatus(b.start, b.end)] || 0);
    });

    list.innerHTML = sorted.map(jam => {
      const status = getJamStatus(jam.start, jam.end);
      const countdown = getCountdownText(jam.start, jam.end);
      const progress = getProgressPercent(jam.start, jam.end);
      const tags = jam.theme ? [`🎯 ${jam.theme.toUpperCase()}`] : [];
      if (jam.link) tags.push('🔗 LINK');

      const badge = status === 'done' ? 'badge-done' : (status === 'urgent' ? 'badge-urgent' : 'badge-active');
      const badgeText = status === 'done' ? 'FINALIZADA' : (status === 'urgent' ? '¡URGENTE!' : (status === 'upcoming' ? 'PRÓXIMA' : 'ACTIVA'));

      return `
        <div class="jam-card ${status}">
          <div class="jam-card-header">
            <div class="jam-name">${escapeHTML(jam.name)}</div>
            <div class="jam-actions">
              <button class="btn btn-ghost btn-sm" onclick="editJam(${jam.id})">✎</button>
              <button class="btn btn-danger btn-sm" onclick="deleteJam(${jam.id})">✕</button>
            </div>
          </div>
          <div class="jam-meta">📅 ${formatDate(jam.start)} → ${formatDate(jam.end)} <span class="badge ${badge}">${badgeText}</span></div>
          ${jam.theme ? `<div class="jam-meta">🎯 Tema: <strong>${escapeHTML(jam.theme)}</strong></div>` : ''}
          ${jam.link ? `<div class="jam-meta">🔗 <a href="${escapeHTML(jam.link)}" target="_blank" style="color:var(--accent4);">${escapeHTML(jam.link)}</a></div>` : ''}
          ${jam.notes ? `<div class="jam-notes-preview">💡 ${escapeHTML(jam.notes.substring(0,80))}${jam.notes.length>80?'...':''}</div>` : ''}
          <div class="jam-countdown ${status}">${countdown}</div>
          <div class="jam-progress"><div class="jam-progress-bar" style="width:${progress}%;${status==='urgent'?'background:#ff3e6c;':''}${status==='done'?'background:#7a7a9a;':''}"></div></div>
          ${tags.length ? `<div class="jam-tags">${tags.map(t=>`<span class="jam-tag">${t}</span>`).join('')}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '--';
    const [y,m,d] = dateStr.split('-');
    return `${d}/${m}/${y.slice(2)}`;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- TASKS ----------
  function getTasks() { return loadData('tasks', []); }
  function saveTasks(tasks) { saveData('tasks', tasks); }

  function addTask() {
    const input = document.getElementById('task-input');
    const text = input.value.trim();
    if (!text) { showToast('Escribe una tarea', true); return; }
    const tasks = getTasks();
    tasks.push({ id: Date.now(), text, done: false, createdAt: new Date().toISOString() });
    saveTasks(tasks);
    input.value = '';
    renderTasks();
    showToast('Tarea añadida');
  }

  function toggleTask(id) {
    const tasks = getTasks();
    const t = tasks.find(t => t.id === id);
    if (t) { t.done = !t.done; saveTasks(tasks); }
    renderTasks();
  }

  function deleteTask(id) {
    let tasks = getTasks();
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(tasks);
    renderTasks();
    showToast('Tarea eliminada', true);
  }

  document.getElementById('btn-add-task').addEventListener('click', addTask);
  document.getElementById('task-input').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

  function renderTasks() {
    const tasks = getTasks();
    const list = document.getElementById('task-list');
    if (!tasks.length) {
      list.innerHTML = `<div class="empty-state"><span class="pixel-art">✅</span><p>NO HAY TAREAS<br>¡AGREGA TAREAS PENDIENTES!</p></div>`;
      return;
    }
    const sorted = [...tasks].sort((a,b) => a.done - b.done);
    list.innerHTML = sorted.map(t => `
      <li class="${t.done ? 'checked-item' : ''}">
        <div class="check-box ${t.done ? 'checked' : ''}" data-task-id="${t.id}"></div>
        <span style="flex:1;">${escapeHTML(t.text)}</span>
        <button class="task-delete-btn" data-task-id="${t.id}">✕</button>
      </li>
    `).join('');

    list.querySelectorAll('.check-box').forEach(box => {
      box.addEventListener('click', () => toggleTask(Number(box.dataset.taskId)));
    });
    list.querySelectorAll('.task-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteTask(Number(btn.dataset.taskId)));
    });
  }

  // ---------- NOTES ----------
  function getNotes() { return loadData('notes', []); }
  function saveNotes(notes) { saveData('notes', notes); }

  function addNote() {
    const input = document.getElementById('note-input');
    const text = input.value.trim();
    if (!text) { showToast('Escribe una nota', true); return; }
    const notes = getNotes();
    notes.unshift({ id: Date.now(), text, createdAt: new Date().toISOString() });
    saveNotes(notes);
    input.value = '';
    renderNotes();
    showToast('Nota guardada');
  }

  function deleteNote(id) {
    let notes = getNotes();
    notes = notes.filter(n => n.id !== id);
    saveNotes(notes);
    renderNotes();
    showToast('Nota eliminada', true);
  }

  document.getElementById('btn-add-note').addEventListener('click', addNote);
  document.getElementById('note-input').addEventListener('keydown', e => { if (e.key === 'Enter') addNote(); });

  function renderNotes() {
    const notes = getNotes();
    const list = document.getElementById('notes-list');
    if (!notes.length) {
      list.innerHTML = `<div class="empty-state"><span class="pixel-art">📝</span><p>NO HAY NOTAS<br>¡ESCRIBE IDEAS RÁPIDAS!</p></div>`;
      return;
    }
    list.innerHTML = notes.map(n => {
      const d = new Date(n.createdAt);
      const ds = d.toLocaleDateString('es-BO', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
      return `<div class="note-card">
        <div class="note-date">📌 ${ds}</div>
        <div class="note-text">${escapeHTML(n.text)}</div>
        <div class="note-actions">
          <button class="btn btn-danger btn-sm" onclick="deleteNote(${n.id})" style="font-size:6px;">ELIMINAR</button>
        </div>
      </div>`;
    }).join('');
  }

  // ---------- STATS ----------
  function renderStats() {
    const jams = getJams();
    const tasks = getTasks();
    const active = jams.filter(j => getJamStatus(j.start, j.end) !== 'done').length;
    const totalJ = jams.length;
    const doneT = tasks.filter(t => t.done).length;
    const totalT = tasks.length;

    document.getElementById('stat-active-jams').textContent = active;
    document.getElementById('stat-total-jams').textContent = totalJ;
    document.getElementById('stat-tasks-done').textContent = doneT;
    document.getElementById('stat-total-tasks').textContent = totalT;

    const upcoming = jams.filter(j => getJamStatus(j.start, j.end) !== 'done')
                         .sort((a,b) => new Date(a.end) - new Date(b.end))
                         .slice(0,5);
    const container = document.getElementById('upcoming-deadlines');
    container.innerHTML = upcoming.length ? upcoming.map(j => {
      const st = getJamStatus(j.start, j.end);
      return `<div class="jam-card ${st}">
        <div class="jam-name" style="font-size:7px;">${escapeHTML(j.name)}</div>
        <div class="jam-countdown ${st}" style="font-size:6px;">${getCountdownText(j.start, j.end)}</div>
      </div>`;
    }).join('') : '<p style="color:var(--text2);font-size:12px;">No hay deadlines pendientes.</p>';
  }

  // ---------- INICIALIZACIÓN ----------
  function init() {
    renderCalendar();
    renderJams();
    renderTasks();
    renderNotes();
    renderStats();
    syncJamEventsToCalendar(getJams());
    renderCalendar();
  }

  // Exponer funciones globales
  window.switchTab = switchTab;
  window.editJam = editJam;
  window.deleteJam = deleteJam;
  window.deleteNote = deleteNote;
  window.toggleJamForm = toggleJamForm;
  window.changeMonth = changeMonth;
  window.addTask = addTask;
  window.addNote = addNote;
  window.addJam = addJam;

  init();
})();
