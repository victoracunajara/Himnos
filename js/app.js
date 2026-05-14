const hymnList = document.getElementById('hymnList');
const hymnDetail = document.getElementById('hymnDetail');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const resultCount = document.getElementById('resultCount');

let hymns = [];
let filteredHymns = [];

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
      }
    }
  } catch (error) {
    hymnDetail.innerHTML = `
      <div class="empty-state">
        Error cargando himnos: ${error.message}
      </div>
    `;
  }
}

function renderList(items) {
  hymnList.innerHTML = '';

  items.forEach(hymn => {
    const button = document.createElement('button');

    button.className = 'hymn-item';
    button.type = 'button';
    button.dataset.id = hymn.id;

    button.innerHTML = `
      <span class="hymn-number">Himno ${hymn.numero}</span>
      <span class="hymn-title">${hymn.titulo}</span>
    `;

    button.addEventListener('click', () => {
      renderHymn(hymn);
      setActive(button);
      history.replaceState(null, '', `#${hymn.id}`);
    });

    hymnList.appendChild(button);
  });
}

function renderHymn(hymn) {
  hymnDetail.classList.remove('empty-state');

  hymnDetail.innerHTML = `
    <div class="hymn-detail-head">
      <div>
        <h2>${hymn.titulo}</h2>
        <p class="hymn-meta">Himno ${hymn.numero}</p>
      </div>

      <a class="back-link" href="#top">Volver</a>
    </div>

    <pre class="hymn-text">${hymn.letra}</pre>

    ${hymn.autor ? `<span class="hymn-author">${hymn.autor}</span>` : ''}
  `;
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
      ${hymn.numero}
      ${hymn.titulo}
      ${hymn.letra}
      ${hymn.autor || ''}
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
