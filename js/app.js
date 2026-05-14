const hymnList = document.getElementById('hymnList');
const hymnDetail = document.getElementById('hymnDetail');
const hymnDetailPanel = document.getElementById('hymnDetailPanel');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const resultCount = document.getElementById('resultCount');

let hymns = [];
let filteredHymns = [];

function getReference(hymn) {
  return hymn.referencia || hymn.numero || '';
}

async function loadHymns() {
  try {
    const response = await fetch('data/himnos.json');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    hymns = await response.json();
    filteredHymns = hymns;

    renderList(filteredHymns);
    updateCount(filteredHymns.length);
    updateClearButton();

    const hash = window.location.hash.replace('#', '');

    if (hash) {
      const hymn = hymns.find(item => item.id === hash);

      if (hymn) {
        renderHymn(hymn);
        enterHymnView();
      }
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

    button.className = 'hymn-item';
    button.type = 'button';
    button.dataset.id = hymn.id;

    button.innerHTML = `
      <span class="hymn-number">Himno ${reference}</span>
      <span class="hymn-title">${hymn.titulo}</span>
    `;

    button.addEventListener('click', () => {
      renderHymn(hymn);
      setActive(button);
      enterHymnView();

      history.replaceState(null, '', `#${hymn.id}`);
    });

    hymnList.appendChild(button);
  });
}

function renderHymn(hymn) {
  hymnDetailPanel.classList.remove('hidden');

  const reference = getReference(hymn);

  hymnDetail.innerHTML = `
    <div class="hymn-detail-head">
      <div>
        <h2>${hymn.titulo}</h2>
        <p class="hymn-meta">Himno ${reference}</p>
      </div>

      <button id="backToIndex" class="back-link" type="button">
        Volver
      </button>
    </div>

    <pre class="hymn-text">${hymn.letra}</pre>

    ${hymn.autor ? `<span class="hymn-author">${hymn.autor}</span>` : ''}
  `;

  const backButton = document.getElementById('backToIndex');

  if (backButton) {
    backButton.addEventListener('click', exitHymnView);
  }
}

function enterHymnView() {
  document.body.classList.add('view-hymn');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function exitHymnView() {
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

function updateCount(total) {
  resultCount.textContent = `${total} himnos encontrados`;
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
  updateCount(filteredHymns.length);
  updateClearButton();
}

function clearFilter() {
  searchInput.value = '';
  filteredHymns = hymns;

  renderList(filteredHymns);
  updateCount(filteredHymns.length);
  updateClearButton();

  searchInput.focus();
}

searchInput.addEventListener('input', filterHymns);
clearSearch.addEventListener('click', clearFilter);

loadHymns();
