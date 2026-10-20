import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const client = fs.readFileSync(new URL('../lector/client.js', import.meta.url), 'utf8');

// Ejecuta el cliente completo con un DOM mínimo: se inspeccionan los enlaces
// que realmente crea, no una copia de su función de resolución de rutas.
function element(initial = {}) {
  const listeners = new Map();
  return {
    children: [], dataset: {}, attrs: {}, textContent: '', ...initial,
    addEventListener(name, callback) { listeners.set(name, callback); },
    emit(name, event = {}) { return listeners.get(name)?.({ preventDefault() {}, ...event }); },
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    setAttribute(name, value) { this.attrs[name] = value; },
    getAttribute(name) { return this.attrs[name] ?? this[name] ?? null; },
    focus() {},
  };
}

function loadClient(basePath) {
  const last = { url: '/capitulo-07/01/', title: 'Los privilegios', chapter: 'Acceso' };
  const bookmark = { url: '/prologo/02/', title: 'El permiso', chapter: 'Prólogo' };
  const stored = new Map([
    ['lvp:last', JSON.stringify(last)],
    ['lvp:saved', JSON.stringify([bookmark])],
  ]);
  const resumeLabel = element();
  const resume = element({ href: basePath + '/prologo/01/', querySelector: () => resumeLabel });
  const menu = element();
  const saved = element();
  const dialog = element({ open: false, showModal() { this.open = true; }, close() { this.open = false; } });
  const input = element({ value: '' });
  const results = element();
  const status = element();
  const openSearch = element();
  const searchForm = element();
  const metadata = element({ content: basePath });
  const single = new Map([
    ['meta[name="book-base"]', metadata],
    ['[data-menu]', menu], ['[data-saved-list]', saved],
    ['#search-dialog', dialog], ['#book-search', input],
    ['#search-results', results], ['#search-status', status],
    ['.search-field', searchForm],
  ]);
  const document = {
    querySelector: selector => single.get(selector) || null,
    querySelectorAll: selector => selector === '[data-resume]' ? [resume] : selector === '[data-search-open]' ? [openSearch] : [],
    documentElement: { classList: { contains: () => false } },
    createElement: () => element(),
    addEventListener() {}, activeElement: null,
  };
  const requested = [];
  const location = { href: 'https://edition.invalid' + basePath + '/' };
  const context = vm.createContext({
    document, location,
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
    fetch: async url => {
      requested.push(url);
      return { ok: true, json: async () => [{ url: '/capitulo-06/03/', title: 'Orden espontáneo', chapter: 'Propiedad', text: 'Cooperación y orden espontáneo.' }] };
    },
    setTimeout, clearTimeout,
  });
  vm.runInContext(client, context, { timeout: 1000, filename: 'lector/client.js' });
  return { resume, saved, menu, location, requested, input, results, status, openSearch, searchForm, stored };
}

for (const basePath of ['', '/la-vida-bajo-permiso']) {
  test(`cliente: continuar, guardados, menú y búsqueda funcionan en ${basePath || '/'}`, async () => {
    const app = loadClient(basePath);
    assert.equal(app.resume.href, basePath + '/capitulo-07/01/');
    assert.equal(app.saved.children.length, 1);
    assert.equal(app.saved.children[0].children[0].href, basePath + '/prologo/02/');
    app.menu.emit('click');
    assert.equal(app.location.href, basePath + '/indice/');

    await app.openSearch.emit('click');
    assert.deepEqual(app.requested, [basePath + '/assets/search.json']);
    app.input.value = 'espontaneo';
    await app.searchForm.emit('submit');
    assert.equal(app.results.children.length, 1);
    assert.equal(app.results.children[0].children[0].href, basePath + '/capitulo-06/03/');
    assert.match(app.status.textContent, /1 página encontrada/);
    assert.equal(JSON.parse(app.stored.get('lvp:last')).url, '/capitulo-07/01/', 'La ubicación recordada conserva su identidad editorial');
    assert.equal(JSON.parse(app.stored.get('lvp:saved'))[0].url, '/prologo/02/', 'Los marcadores siguen siendo transportables entre montajes');
  });
}
