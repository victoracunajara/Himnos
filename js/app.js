const hymnList = document.getElementById('hymnList');
const hymnDetail = document.getElementById('hymnDetail');
const hymnDetailPanel = document.getElementById('hymnDetailPanel');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const themeToggleIndex = document.getElementById('themeToggleIndex');

const TODAY_HYMNS_KEY = 'todayHymns';
const todayHymnsSection = document.getElementById('todayHymnsSection');
const todayHymnsList = document.getElementById('todayHymnsList');

let hymns = [];
let filteredHymns = [];
let currentHymn = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function applyTheme(theme) {
  document.body.classList.toggle('dark-theme', theme === 'dark');
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const darkMode = document.body.classList.contains('dark-theme');
  applyTheme(darkMode ? 'light' : 'dark');

  requestAnimationFrame(fitCurrentHymnText);
}

function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme) {
    applyTheme(savedTheme);
    return;
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

function getReference(hymn) {
  return hymn.referencia || hymn.numero || '';
}

function getCategoriesText(hymn) {
  return (hymn.categorias || []).join(', ');
}

function getLongestLine(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .sort((a, b) => b.length - a.length)[0] || '';
}

function getTodayHymns() {
  try {
    const stored = JSON.parse(localStorage.getItem(TODAY_HYMNS_KEY));

    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveTodayHymns(ids) {
  localStorage.setItem(TODAY_HYMNS_KEY, JSON.stringify(ids));
}

function isTodayHymn(id) {
  return getTodayHymns().includes(id);
}

function toggleTodayHymn(id) {
  const ids = getTodayHymns();
  const exists = ids.includes(id);

  const nextIds = exists
    ? ids.filter(item => item !== id)
    : [id, ...ids.filter(item => item !== id)].slice(0, 12);

  saveTodayHymns(nextIds);

  renderTodayHymns();
  renderList(filteredHymns);
}

function getMaxFontSize() {
  const width = window.innerWidth;

  if (width >= 1400) {
    return 18;
  }

  if (width >= 900) {
    return 20;
  }

  if (width >= 600) {
    return 24;
  }

  return 42;
}

function fitCurrentHymnText() {
  const hymnText = document.querySelector('.hymn-stanzas');

  if (!hymnText || !currentHymn) {
    return;
  }

  const longestLine = getLongestLine(currentHymn.letra);

  if (!longestLine) {
    return;
  }

  const containerWidth = hymnText.clientWidth;

  if (!containerWidth) {
    return;
  }

  const computed = window.getComputedStyle(hymnText);
  const fontFamily = computed.fontFamily;
  const fontWeight = computed.fontWeight;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  let min = 16;
  let max = getMaxFontSize();
  let best = 16;

  while (min <= max) {
    const size = Math.floor((min + max) / 2);

    context.font = `${fontWeight} ${size}px ${fontFamily}`;

    const width = context.measureText(longestLine).width;

    if (width <= containerWidth) {
      best = size;
      min = size + 1;
    } else {
      max = size - 1;
    }
  }

  hymnText.style.fontSize = `${best}px`;
}

async function loadHymns() {

  const cacheBust = `v=${Date.now()}`;

  try {

    const indexResponse = await fetch(
      `data/index.json?${cacheBust}`,
      {
        cache: 'no-store'
      }
    );

    if (!indexResponse.ok) {
      throw new Error(`HTTP ${indexResponse.status}`);
    }

    const files = await indexResponse.json();

    const loadedHymns = [];
    const failedFiles = [];

    for (const file of files) {

      try {

        const response = await fetch(
          `data/himnos/${file}?${cacheBust}`,
          {
            cache: 'no-store'
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const hymn = await response.json();

        loadedHymns.push(hymn);

      } catch (err) {

        failedFiles.push(file);
      }
    }

    hymns = loadedHymns;
    filteredHymns = hymns;

    renderList(filteredHymns);

    updateClearButton();

    renderTodayHymns();

    const hash = window.location.hash.replace('#', '');

    if (hash) {

      const hymn = hymns.find(item => item.id === hash);

      if (hymn) {

        renderHymn(hymn);

        enterHymnView();
      }
    }

    if (failedFiles.length > 0) {

      hymnDetailPanel.classList.remove('hidden');

      hymnDetail.innerHTML = `
        <div style="color: red;">
          Error cargando los siguientes himnos:<br>
          ${failedFiles.map(f => `<div>${f}</div>`).join('')}
        </div>
      `;
    }

  } catch (error) {

    hymnDetailPanel.classList.remove('hidden');

    hymnDetail.innerHTML = `
      <div>
        Error cargando himnos: ${error.message}
      </div>
    `;
  }
}

function renderList(items) {
  hymnList.innerHTML = '';

  items.forEach(hymn => {
    const button = document.createElement('button');
    const reference = getReference(hymn);
    const categories = getCategoriesText(hymn);

    button.className = 'hymn-item';
    button.type = 'button';
    button.dataset.id = hymn.id;

    button.innerHTML = `
      <div class="hymn-item-main">
        <span class="hymn-number">${escapeHtml(reference)}${categories ? ` · ${escapeHtml(categories)}` : ''}</span>
        <span class="hymn-title">${escapeHtml(hymn.titulo)}</span>
      </div>

      <button
        class="today-toggle ${isTodayHymn(hymn.id) ? 'active' : ''}"
        type="button"
        data-today-toggle="${hymn.id}"
        aria-label="Agregar a Himnos de Hoy"
      >
        ${isTodayHymn(hymn.id) ? '★' : '☆'}
      </button>
    `;

    const todayToggle = button.querySelector('[data-today-toggle]');

    if (todayToggle) {
      todayToggle.addEventListener('click', event => {
        event.stopPropagation();

        toggleTodayHymn(hymn.id);
      });
    }

    button.addEventListener('click', () => {
      renderHymn(hymn);
      setActive(button);
      enterHymnView();

      history.replaceState(null, '', `#${hymn.id}`);
    });

    hymnList.appendChild(button);
  });
}

function renderTodayHymns() {
  const ids = getTodayHymns();

  if (!ids.length) {
    todayHymnsSection.classList.add('hidden');
    todayHymnsList.innerHTML = '';

    return;
  }

  const selected = ids
    .map(id => hymns.find(hymn => hymn.id === id))
    .filter(Boolean);

  todayHymnsSection.classList.remove('hidden');
  todayHymnsList.innerHTML = '';

  selected.forEach(hymn => {
    const button = document.createElement('button');
    const reference = getReference(hymn);
    const categories = getCategoriesText(hymn);

    button.className = 'hymn-item';
    button.type = 'button';
    button.dataset.id = hymn.id;

    button.innerHTML = `
      <div class="hymn-item-main">
        <span class="hymn-number">${escapeHtml(reference)}${categories ? ` · ${escapeHtml(categories)}` : ''}</span>
        <span class="hymn-title">${escapeHtml(hymn.titulo)}</span>
      </div>

      <button
        class="today-toggle active"
        type="button"
        data-today-toggle="${hymn.id}"
        aria-label="Quitar de Himnos de Hoy"
      >
        ★
      </button>
    `;

    const todayToggle = button.querySelector('[data-today-toggle]');

    if (todayToggle) {
      todayToggle.addEventListener('click', event => {
        event.stopPropagation();

        toggleTodayHymn(hymn.id);
      });
    }

    button.addEventListener('click', () => {
      renderHymn(hymn);
      setActive(button);
      enterHymnView();

      history.replaceState(null, '', `#${hymn.id}`);
    });

    todayHymnsList.appendChild(button);
  });
}

function renderHymn(hymn) {
  currentHymn = hymn;

  hymnDetailPanel.classList.remove('hidden');

  const reference = getReference(hymn);
  const categories = (hymn.categorias || [])
    .map(category => `<span class="hymn-meta">${escapeHtml(category)}</span>`)
    .join('');

  const stanzas = hymn.letra
    .split(/\n\s*\n/)
    .map(stanza => stanza.trim())
    .filter(Boolean)
    .map(stanza => `<div class="hymn-stanza">${escapeHtml(stanza)}</div>`)
    .join('');

  hymnDetail.innerHTML = `
    <div class="hymn-detail-head">
      <div>
        <h2>${escapeHtml(hymn.titulo)}</h2>

        <div class="hymn-meta-group">
          ${reference ? `<span class="hymn-meta">${escapeHtml(reference)}</span>` : ''}
          ${categories}
          ${hymn.tonalidad ? `<span class="hymn-meta">${escapeHtml(hymn.tonalidad)}</span>` : ''}
          ${hymn.tempo ? `<span class="hymn-meta">${escapeHtml(`${hymn.tempo} BPM`)}</span>` : ''}
        </div>
      </div>

      <div class="header-actions">
        <button id="themeToggle" class="theme-toggle" type="button" aria-label="Cambiar tema">
          ◐
        </button>

        <button id="backToIndex" class="back-link" type="button">
          Volver
        </button>
      </div>
    </div>

    <div class="hymn-text hymn-stanzas">${stanzas}</div>

    ${hymn.autor ? `<span class="hymn-author">${escapeHtml(hymn.autor)}</span>` : ''}
  `;

  const backButton = document.getElementById('backToIndex');
  const themeButton = document.getElementById('themeToggle');

  if (backButton) {
    backButton.addEventListener('click', exitHymnView);
  }

  if (themeButton) {
    themeButton.addEventListener('click', toggleTheme);
  }

  requestAnimationFrame(fitCurrentHymnText);
}

function enterHymnView() {
  document.body.classList.add('view-hymn');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function exitHymnView() {
  currentHymn = null;

  document.body.classList.remove('view-hymn');

  hymnDetailPanel.classList.add('hidden');
  hymnDetail.innerHTML = '';

  document.querySelectorAll('.hymn-item').forEach(button => {
    button.classList.remove('active');
  });

  history.replaceState(null, '', ' ');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function setActive(activeButton) {
  document.querySelectorAll('.hymn-item').forEach(button => {
    button.classList.remove('active');
  });

  activeButton.classList.add('active');
}

function updateClearButton() {
  const hasValue = searchInput.value.trim().length > 0;

  clearSearch.classList.toggle('visible', hasValue);
}

function filterHymns() {
  const value = searchInput.value.trim().toLowerCase();

  filteredHymns = hymns.filter(hymn => {
    const content = `
      ${getReference(hymn)}
      ${hymn.titulo}
      ${hymn.letra}
      ${hymn.autor || ''}
      ${(hymn.categorias || []).join(' ')}
      ${hymn.tonalidad || ''}
      ${hymn.tempo ?? ''}
    `.toLowerCase();

    return content.includes(value);
  });

  renderList(filteredHymns);
  updateClearButton();
  renderTodayHymns();
}

function clearFilter() {
  searchInput.value = '';
  filteredHymns = hymns;

  renderList(filteredHymns);
  updateClearButton();
  renderTodayHymns();

  searchInput.focus();
}

window.addEventListener('resize', () => {
  requestAnimationFrame(fitCurrentHymnText);
});

window.addEventListener('orientationchange', () => {
  requestAnimationFrame(fitCurrentHymnText);
});

searchInput.addEventListener('input', filterHymns);
clearSearch.addEventListener('click', clearFilter);

themeToggleIndex.addEventListener('click', toggleTheme);

initializeTheme();
loadHymns();
