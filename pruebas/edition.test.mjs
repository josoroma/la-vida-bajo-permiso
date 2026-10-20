import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { figures } from '../datos/figures.mjs';

// Pruebas del contrato editorial y de la salida pública, sin importar el generador.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.resolve(ROOT, process.env.OUTPUT_DIR || 'publicacion');
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/+$/, '');
const ORIGIN = 'https://edition.invalid';
const mount = route => BASE_PATH + route;
const publicJson = relative => JSON.parse(fs.readFileSync(path.join(PUBLIC, relative), 'utf8'));
const DEDICATION = 'A la persona más increíble de mi vida, mi hija: Isa Orozco Gros-Desormeaux.';
const CORPUS_FILES = ['01', '02', '03', '04', '06', '07', '08', '09', '10', '11', '12'].map(n => `${n}.pdf`);
const pad = n => String(n).padStart(2, '0');
const json = relative => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
const manuscript = () => fs.readdirSync(path.join(ROOT, 'manuscrito')).filter(n => n.endsWith('.json')).map(n => ({ filename: n, ...json(`manuscrito/${n}`) }));
const chapterIds = Array.from({ length: 16 }, (_, i) => pad(i + 1));
const readingRoutes = [
  ...Array.from({ length: 5 }, (_, i) => `/prologo/${pad(i + 1)}/`),
  ...Array.from({ length: 3 }, (_, i) => `/introduccion/${pad(i + 1)}/`),
  ...chapterIds.flatMap(id => Array.from({ length: 4 }, (_, i) => `/capitulo-${id}/${pad(i + 1)}/`)),
  ...Array.from({ length: 3 }, (_, i) => `/epilogo/${pad(i + 1)}/`),
];

function walk(folder) {
  assert.ok(fs.existsSync(folder), `Falta ${path.relative(ROOT, folder)}`);
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(folder, entry.name);
    assert.ok(!entry.isSymbolicLink(), `Enlace simbólico público inesperado: ${filename}`);
    return entry.isDirectory() ? walk(filename) : [filename];
  });
}

function decodeEntities(value) {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (all, code) => {
    if (code[0] === '#') return String.fromCodePoint(Number.parseInt(code.slice(/^#x/i.test(code) ? 2 : 1), /^#x/i.test(code) ? 16 : 10));
    return named[code.toLowerCase()] ?? all;
  });
}

// Analizador léxico de etiquetas. Omite cuerpos raw-text y comentarios para no
// confundir JavaScript o CSS con HTML; no intenta sustituir el parser del navegador.
function tags(html) {
  const cleaned = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b([^>]*)>[\s\S]*?<\/\1\s*>/gi, '<$1$2></$1>');
  const result = [];
  for (const match of cleaned.matchAll(/<([a-z][\w:-]*)\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/gi)) {
    const attrs = {};
    for (const attr of match[2].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      attrs[attr[1].toLowerCase()] = decodeEntities(attr[2] ?? attr[3] ?? attr[4] ?? '');
    }
    result.push({ name: match[1].toLowerCase(), attrs });
  }
  return result;
}
function stripMarkup(html) {
  return decodeEntities(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function prose(value) {
  return String(value).replace(/\[\[[^\]]+\]\]/g, '').replace(/\*\*|^##\s*/gm, '').replace(/\s+/g, ' ').trim();
}
function wordCount(value) {
  // Segmentación lingüística independiente del contador empleado en el build.
  return [...new Intl.Segmenter('es', { granularity: 'word' }).segment(prose(value))].filter(x => x.isWordLike).length;
}
function routeToFile(route) {
  const decoded = decodeURIComponent(new URL(route, ORIGIN).pathname);
  assert.ok(!BASE_PATH || decoded.startsWith(BASE_PATH + '/'), `Ruta fuera del montaje ${BASE_PATH}: ${route}`);
  let candidate = path.resolve(PUBLIC, `.${decoded.slice(BASE_PATH.length)}`);
  assert.ok(candidate === PUBLIC || candidate.startsWith(PUBLIC + path.sep), `Ruta fuera de la publicación: ${route}`);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) candidate = path.join(candidate, 'index.html');
  return candidate;
}
function routeForFile(filename) {
  let route = '/' + path.relative(PUBLIC, filename).split(path.sep).join('/');
  if (route.endsWith('/index.html')) route = route.slice(0, -10);
  return mount(route);
}
function htmlAt(route) {
  const filename = routeToFile(mount(route));
  assert.ok(fs.existsSync(filename), `No existe la página ${route}`);
  return fs.readFileSync(filename, 'utf8');
}
function unique(values, message) { assert.equal(new Set(values).size, values.length, message); }
function aggregate(errors, title) {
  assert.equal(errors.length, 0, `${title}: ${errors.length} incidencia(s)\n${errors.slice(0, 35).join('\n')}${errors.length > 35 ? '\n…' : ''}`);
}


test('manuscrito completo: 16 capítulos, cuatro partes y 75 páginas de lectura', () => {
  const docs = manuscript();
  const chapters = docs.filter(d => d.number !== undefined).sort((a, b) => a.number - b.number);
  assert.deepEqual(chapters.map(d => d.number), Array.from({ length: 16 }, (_, i) => i + 1));
  assert.deepEqual(chapters.map(d => d.id), chapterIds);
  unique(docs.map(d => d.id), 'Identificadores editoriales repetidos');
  assert.equal(docs.length, 19, 'Deben existir 16 capítulos, prólogo, introducción y epílogo');
  for (const d of chapters) {
    assert.equal(d.part, Math.ceil(d.number / 4), `${d.filename}: parte incorrecta`);
    assert.equal(d.pages.length, 4, `${d.filename}: requiere cuatro páginas`);
  }
  for (const [id, expected] of [['prologo', 5], ['introduccion', 3], ['epilogo', 3]]) {
    const d = docs.find(d => d.id === id);
    assert.ok(d, `Falta ${id}`);
    assert.equal(d.pages.length, expected, `${id}: número incorrecto de páginas`);
  }
  for (const d of docs) {
    assert.ok(d.title?.trim() && d.deck?.trim(), `${d.filename}: título o entradilla vacíos`);
    for (const [i, p] of d.pages.entries()) {
      assert.ok(p.title?.trim(), `${d.filename}/${i + 1}: falta título`);
      assert.ok(Array.isArray(p.paragraphs) && p.paragraphs.length > 1, `${d.filename}/${i + 1}: falta contenido`);
      assert.ok(p.paragraphs.every(p => typeof p === 'string' && p.trim()), `${d.filename}/${i + 1}: párrafo vacío`);
    }
  }
  assert.equal(docs.reduce((n, d) => n + d.pages.length, 0), 75);
  const book = json('datos/book.json');
  assert.equal(book.parts.length, 4);
  assert.equal(book.chapters.length, 16);
  assert.deepEqual(book.parts.flatMap(p => p.chapters), chapters.map(d => d.number));
});

test('extensión editorial entre 50.000 y 65.000 palabras con notas', t => {
  const docs = manuscript();
  const body = docs.reduce((n, d) => n + d.pages.reduce((s, p) => s + wordCount(p.paragraphs.join(' ')), 0), 0);
  const notes = docs.reduce((n, d) => n + (d.sources || []).reduce((s, source) => s + wordCount(source.note || ''), 0), 0);
  t.diagnostic(`Cuerpo: ${body}; notas documentales: ${notes}; total editorial: ${body + notes}. No se cuentan URLs, navegación ni texto duplicado de la búsqueda.`);
  assert.ok(body + notes >= 50_000, `Manuscrito por debajo de 50.000 palabras: ${body + notes}`);
  assert.ok(body + notes <= 65_000, `Manuscrito por encima de 65.000 palabras: ${body + notes}`);
});

test('todas las llamadas documentales resuelven una fuente identificable', () => {
  for (const d of manuscript()) {
    assert.ok(Array.isArray(d.sources), `${d.filename}: falta matriz de fuentes`);
    unique(d.sources.map(s => s.id), `${d.filename}: IDs de fuentes repetidos`);
    const sources = new Map(d.sources.map(s => [s.id, s]));
    for (const source of d.sources) {
      assert.match(source.id, /^[A-Za-z0-9_-]+$/, `${d.filename}: ID de fuente inválido`);
      assert.ok(source.title?.trim() && source.institution?.trim() && source.note?.trim(), `${d.filename}/${source.id}: referencia incompleta`);
      assert.match(source.url || '', /^(https?:\/\/|\/(?!\/))/, `${d.filename}/${source.id}: falta URL verificable`);
    }
    for (const p of d.pages) for (const paragraph of p.paragraphs) {
      for (const ref of paragraph.matchAll(/\[\[([^\]]+)\]\]/g)) assert.ok(sources.has(ref[1]), `${d.filename}: fuente inexistente [[${ref[1]}]]`);
      assert.ok(!paragraph.replace(/\[\[[A-Za-z0-9_-]+\]\]/g, '').includes('[['), `${d.filename}: llamada de nota mal formada`);
    }
  }
});

test('HTML generado: todos los href/src locales y fragmentos resuelven', t => {
  const files = walk(PUBLIC);
  const htmlFiles = files.filter(f => f.endsWith('.html'));
  assert.ok(htmlFiles.length > 75, 'La edición debe contener lectura y aparatos complementarios');
  const targetIds = new Map();
  const errors = [];
  let checked = 0;
  for (const file of htmlFiles) {
    const from = new URL(routeForFile(file), ORIGIN);
    for (const tag of tags(fs.readFileSync(file, 'utf8'))) for (const attr of ['href', 'src', 'xlink:href']) {
      if (!(attr in tag.attrs)) continue;
      const value = tag.attrs[attr];
      if (/^(data:|blob:|mailto:|tel:)/i.test(value)) continue;
      let target;
      try { target = new URL(value, from); } catch { errors.push(`${routeForFile(file)}: URL inválida ${value}`); continue; }
      if (target.origin !== ORIGIN) continue;
      checked++;
      let destination;
      try { destination = routeToFile(target.href); } catch (error) { errors.push(`${routeForFile(file)} → ${value}: ${error.message}`); continue; }
      if (!fs.existsSync(destination) || !fs.statSync(destination).isFile()) { errors.push(`${routeForFile(file)} → ${value}: archivo ausente`); continue; }
      if (target.hash) {
        const fragment = decodeURIComponent(target.hash.slice(1).split(':~:')[0]);
        if (!fragment) continue;
        if (!/\.(html|svg)$/.test(destination)) { errors.push(`${value}: fragmento en recurso no comprobable`); continue; }
        if (!targetIds.has(destination)) targetIds.set(destination, new Set(tags(fs.readFileSync(destination, 'utf8')).flatMap(t => [t.attrs.id, t.name === 'a' ? t.attrs.name : undefined].filter(Boolean))));
        if (!targetIds.get(destination).has(fragment)) errors.push(`${routeForFile(file)} → ${value}: fragmento ausente`);
      }
    }
  }
  t.diagnostic(`${htmlFiles.length} documentos HTML; ${checked} referencias locales comprobadas.`);
  aggregate(errors, 'Enlaces o recursos locales rotos');
});

test('cada página declara su montaje y todos los recursos CSS resuelven dentro de él', () => {
  const errors = [];
  for (const file of walk(PUBLIC)) {
    if (file.endsWith('.html')) {
      const metadata = tags(fs.readFileSync(file, 'utf8')).filter(t => t.name === 'meta' && t.attrs.name === 'book-base');
      assert.equal(metadata.length, 1, `${routeForFile(file)}: falta el montaje para los enlaces dinámicos`);
      assert.equal(metadata[0].attrs.content, BASE_PATH, `${routeForFile(file)}: montaje incorrecto`);
    }
    if (!file.endsWith('.css')) continue;
    const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const references = [
      ...[...css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)].map(match => match[1]),
      ...[...css.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map(match => match[1]),
    ];
    for (const value of references) {
      if (/^data:/i.test(value)) continue;
      try {
        const target = new URL(value, new URL(routeForFile(file), ORIGIN));
        assert.equal(target.origin, ORIGIN, 'La edición debe conservar las fuentes y estilos en el sitio');
        const destination = routeToFile(target.href);
        assert.ok(fs.existsSync(destination) && fs.statSync(destination).isFile(), 'Recurso ausente');
      } catch (error) { errors.push(`${routeForFile(file)} → ${value}: ${error.message}`); }
    }
  }
  aggregate(errors, 'Recursos CSS fuera del sitio o rotos');
});

test('HTML y SVG: IDs únicos y referencias accesibles internas existentes', () => {
  const errors = [];
  for (const file of walk(PUBLIC).filter(f => /\.(html|svg)$/.test(f))) {
    const elements = tags(fs.readFileSync(file, 'utf8'));
    const ids = elements.map(t => t.attrs.id).filter(Boolean);
    const seen = new Set();
    for (const id of ids) { if (seen.has(id)) errors.push(`${path.relative(PUBLIC, file)}: ID duplicado ${id}`); seen.add(id); }
    for (const el of elements) for (const attr of ['aria-labelledby', 'aria-describedby', 'for']) {
      for (const id of (el.attrs[attr] || '').split(/\s+/).filter(Boolean)) if (!seen.has(id)) errors.push(`${path.relative(PUBLIC, file)}: ${attr} apunta a ${id} inexistente`);
    }
  }
  aggregate(errors, 'Integridad de identificadores');
});

test('secuencia anterior/siguiente completa, continua y bidireccional', () => {
  assert.equal(readingRoutes.length, 75);
  for (const [index, route] of readingRoutes.entries()) {
    const links = tags(htmlAt(route)).filter(t => t.name === 'a');
    for (const [rel, expected] of [['prev', readingRoutes[index - 1] || '/indice/'], ['next', readingRoutes[index + 1] || '/creditos/corpus/']]) {
      const candidates = links.filter(t => (t.attrs.rel || '').split(/\s+/).includes(rel));
      assert.equal(candidates.length, 1, `${route}: se requiere un enlace rel=${rel}`);
      assert.equal(new URL(candidates[0].attrs.href, ORIGIN + mount(route)).pathname, mount(expected), `${route}: continuación ${rel} incorrecta`);
    }
  }
});

test('manifiesto y búsqueda incluyen las 75 páginas, una sola vez y con texto', () => {
  const manifest = publicJson('assets/manifest.json');
  assert.equal(manifest.chapters, 16);
  assert.deepEqual(manifest.pages.map(p => p.url), readingRoutes, 'El manifiesto no coincide con el orden editorial completo');
  const index = publicJson('assets/search.json');
  assert.ok(Array.isArray(index));
  unique(index.map(p => p.url), 'URL duplicada en búsqueda');
  assert.deepEqual(index.map(p => p.url).sort(), [...readingRoutes].sort());
  const entries = new Map(index.map(p => [p.url, p]));
  for (const d of manuscript()) for (const [i, page] of d.pages.entries()) {
    const route = `/${d.number ? `capitulo-${pad(d.number)}` : d.id}/${pad(i + 1)}/`;
    const entry = entries.get(route);
    assert.ok(entry, `${route}: no indexada`);
    assert.equal(entry.title, page.title, `${route}: título de búsqueda desactualizado`);
    assert.equal(entry.chapter, d.title, `${route}: sección de búsqueda desactualizada`);
    assert.ok(wordCount(entry.text) >= 400, `${route}: índice de búsqueda vacío o truncado`);
    const source = page.paragraphs.filter(p => !p.startsWith('##'));
    for (const sample of [source[0], source[Math.floor(source.length / 2)], source.at(-1)]) {
      const phrase = prose(sample).split(' ').slice(0, 14).join(' ');
      assert.ok(prose(entry.text).includes(phrase), `${route}: búsqueda no contiene un pasaje del manuscrito`);
      assert.ok(stripMarkup(htmlAt(route)).includes(phrase), `${route}: contenido esencial ausente del HTML sin JavaScript`);
    }
  }
});

// The public repository excludes the private research corpus. If any original
// is restored locally, audit the entire set rather than accepting a partial set.
const privateInventoryPath = path.join(ROOT, 'investigacion/inventario.json');
const privateInventory = fs.existsSync(privateInventoryPath) ? json('investigacion/inventario.json') : null;
const hasPrivateOriginals = CORPUS_FILES.some(file => fs.existsSync(path.join(ROOT, file)));
test('auditoría local: SHA-256, páginas y procedencias del corpus original', {
  skip: !hasPrivateOriginals && 'El corpus privado no se distribuye con el repositorio.',
}, () => {
  const inventory = json('investigacion/inventario.json');
  assert.deepEqual(inventory.documentos.map(d => d.archivo).sort(), CORPUS_FILES);
  assert.equal(inventory.ausente, '05.pdf');
  assert.ok(!fs.existsSync(path.join(ROOT, '05.pdf')), 'Apareció 05.pdf: revisar explícitamente el inventario');
  assert.equal(inventory.documentos.reduce((n, d) => n + d.paginas, 0), 190);
  for (const document of inventory.documentos) {
    const actual = createHash('sha256').update(fs.readFileSync(path.join(ROOT, document.archivo))).digest('hex');
    assert.equal(actual, document.sha256, `${document.archivo}: el original cambió`);
  }
  assert.equal(inventory.documentos.find(d => d.id === '11').grupo, 'C11/C12');
  assert.equal(inventory.documentos.find(d => d.id === '12').grupo, 'C11/C12');
  assert.equal(new Set(inventory.documentos.map(d => d.grupo)).size, 10);
});

test('la carpeta pública no contiene corpus, transcripciones ni dossier', () => {
  const originals = new Set((privateInventory?.documentos || []).map(d => d.sha256));
  for (const file of walk(PUBLIC)) {
    const relative = path.relative(PUBLIC, file).split(path.sep).join('/');
    assert.ok(!/(^|\/)(investigacion|transcripciones|manuscrito|plan\.md)(\/|$)/i.test(relative), `Material interno publicado: ${relative}`);
    assert.ok(!/\.pdf$/i.test(file), `PDF publicado sin autorización: ${relative}`);
    const buffer = fs.readFileSync(file);
    assert.ok(!buffer.subarray(0, 5).equals(Buffer.from('%PDF-')), `PDF renombrado publicado: ${relative}`);
    assert.ok(!originals.has(createHash('sha256').update(buffer).digest('hex')), `Original publicado con otro nombre: ${relative}`);
  }
});

test('17 figuras: nodos, aristas, vínculo editorial y SVG íntegros', () => {
  assert.equal(figures.length, 17);
  unique(figures.map(f => f.id), 'ID de figura duplicado');
  assert.deepEqual(figures.map(f => f.chapter).sort(), ['prologo', ...chapterIds].sort());
  const references = manuscript().flatMap(d => d.pages.filter(p => p.figure).map(p => ({ id: p.figure, chapter: d.id })));
  assert.equal(references.length, 17, 'Debe haber una figura en el prólogo y una por capítulo');
  unique(references.map(f => f.id), 'Una figura está asignada a varias páginas de lectura');
  for (const figure of figures) {
    assert.match(figure.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(figure.title?.trim() && figure.kind?.trim() && figure.question?.trim(), `${figure.id}: contrato incompleto`);
    assert.ok(Array.isArray(figure.nodes) && figure.nodes.length >= 2, `${figure.id}: faltan nodos`);
    unique(figure.nodes.map(n => n.id), `${figure.id}: nodos duplicados`);
    const nodes = new Set(figure.nodes.map(n => n.id));
    for (const node of figure.nodes) {
      assert.ok(node.id && node.label?.trim() && node.description?.trim(), `${figure.id}: nodo sin identificación o descripción`);
      assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y), `${figure.id}/${node.id}: posición inválida`);
    }
    assert.ok(Array.isArray(figure.edges) && figure.edges.length > 0, `${figure.id}: relaciones ausentes`);
    for (const edge of figure.edges) {
      assert.ok(nodes.has(edge.from) && nodes.has(edge.to), `${figure.id}: arista apunta a un nodo inexistente`);
      assert.ok(edge.label?.trim(), `${figure.id}: relación sin rótulo`);
    }
    assert.deepEqual(references.filter(f => f.id === figure.id).map(f => f.chapter), [figure.chapter], `${figure.id}: asignación editorial incorrecta`);
    const svg = fs.readFileSync(path.join(PUBLIC, 'arte', `${figure.id}.svg`), 'utf8');
    assert.match(svg, /<svg\b/); assert.match(svg, /<title\b/); assert.match(svg, /<desc\b/);
    assert.ok(!/NaN|undefined/.test(svg), `${figure.id}: exportación SVG inválida`);
    assert.ok(htmlAt('/atlas/').includes(`/arte/${figure.id}.svg`), `${figure.id}: no se ofrece su SVG en el atlas`);
  }
});

test('créditos públicos completos y procedencias no duplicadas', () => {
  const entries = json('datos/credits.json').entries;
  unique(entries.map(e => e.id), 'Créditos con ID repetido');
  assert.deepEqual(entries.map(entry => entry.id).sort(), ['c01', 'c02', 'c03', 'c04', 'c06', 'c07', 'c08', 'c09', 'c10', 'c12', 'obras-originales']);
  const conference = entries.find(entry => entry.id === 'c12');
  assert.match(`${conference.role} ${conference.note}`, /misma conferencia|sola procedencia/i);
  assert.equal(entries.filter(entry => /\bRaico\b/i.test(entry.name)).length, 1, 'Raico debe conservar una sola entrada');
  const creditsHtml = htmlAt('/creditos/corpus/');
  const cards = [...creditsHtml.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/gi)]
    .map(match => ({ html: match[0], attrs: tags(match[0])[0].attrs }))
    .filter(card => (card.attrs.class || '').split(/\s+/).includes('credit-entry'));
  assert.deepEqual(cards.map(card => card.attrs.id).sort(), entries.map(entry => entry.id).sort(), 'Cada procedencia debe tener una sola ficha pública');
  const publicCredits = stripMarkup(creditsHtml);
  for (const filename of CORPUS_FILES) assert.ok(!publicCredits.includes(filename), `Nombre interno visible en créditos: ${filename}`);
  for (const entry of entries) {
    assert.ok(entry.name?.trim() && entry.role?.trim() && entry.title?.trim() && entry.contribution?.trim(), `${entry.id}: crédito incompleto`);
    assert.ok(publicCredits.includes(entry.name), `${entry.id}: autor o incertidumbre no visibles en créditos`);
    assert.ok(publicCredits.includes(entry.title), `${entry.id}: obra ausente de créditos`);
    const card = cards.find(card => card.attrs.id === entry.id).html;
    const metadata = stripMarkup(card.split(/<p\b[^>]*class="credit-note"/i)[0]);
    assert.doesNotMatch(metadata, /\b(?:1[5-9]\d{2}|20\d{2})\b|\b(?:sin fecha|fecha no comprobada)\b/i, `${entry.id}: fecha de ficha visible`);
    if (entry.date?.trim()) assert.ok(!stripMarkup(card).includes(entry.date.trim()), `${entry.id}: se publicó el campo de fecha`);
    if (entry.url) {
      assert.ok(entry.linkLabel?.trim(), `${entry.id}: falta una etiqueta de enlace`);
      assert.match(entry.linkLabel, /\p{L}/u, `${entry.id}: etiqueta sin palabras`);
      assert.doesNotMatch(entry.linkLabel.trim(), /^(?:https?:\/\/\S+|aquí|ver|abrir|enlace|más|fuente)$/i, `${entry.id}: etiqueta de enlace ambigua`);
      const expectedHref = entry.url.startsWith('/') && !entry.url.startsWith('//') ? mount(entry.url) : entry.url;
      const links = [...card.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].map(match => ({ href: tags(match[0])[0].attrs.href, label: stripMarkup(match[0]) }));
      assert.ok(links.some(link => link.href === expectedHref && link.label === entry.linkLabel.trim()), `${entry.id}: el enlace público no muestra su etiqueta o destino`);
    }
  }
  for (const file of walk(PUBLIC).filter(file => /\.(html|json)$/i.test(file))) {
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(content, /\b(?:youtube(?:-nocookie)?\.com|youtu\.be)\b/i, `${path.relative(PUBLIC, file)}: dominio de video publicado`);
  }
});

test('dedicatoria exacta, cubierta y contraportada en ambos temas', () => {
  assert.equal(json('datos/book.json').dedication, DEDICATION);
  for (const route of ['/dedicatoria/', '/contraportada/']) {
    assert.ok(stripMarkup(htmlAt(route)).includes(DEDICATION), `${route}: dedicatoria incompleta o alterada`);
  }
  for (const theme of ['light', 'dark']) for (const cover of ['portada', 'contraportada']) {
    const filename = path.join(PUBLIC, 'arte', `${cover}-${theme}.svg`);
    const svg = fs.readFileSync(filename, 'utf8');
    assert.match(svg, /<svg\b/);
    assert.ok(stripMarkup(svg).includes('La vida bajo permiso'), `${filename}: título ausente`);
    if (cover === 'contraportada') assert.ok(stripMarkup(svg).includes(DEDICATION), `${filename}: dedicatoria alterada`);
  }
});

test('glosario y cronología completos y visibles en sus páginas', () => {
  const data = json('datos/supplemental.json');
  assert.equal(data.glossary.length, 22);
  unique(data.glossary.map(entry => entry.id), 'Término de glosario repetido');
  assert.equal(data.timeline.length, 14);
  const glossary = stripMarkup(htmlAt('/glosario/'));
  const timeline = stripMarkup(htmlAt('/cronologia/'));
  for (const term of data.glossary) {
    assert.ok(term.id && term.term?.trim() && term.definition?.trim());
    assert.ok(glossary.includes(term.term) && glossary.includes(term.definition), `${term.id}: glosario truncado`);
  }
  for (const event of data.timeline) {
    assert.ok(event.date?.trim() && event.title?.trim() && event.text?.trim());
    assert.match(event.url || '', /^https:\/\//, `${event.title}: fuente documental ausente`);
    assert.ok(timeline.includes(event.date) && timeline.includes(event.title) && timeline.includes(event.text), `${event.title}: hito omitido`);
  }
});

// Se inicia el servidor real, con puerto efímero, para comprobar la frontera de
// publicación. Ese servidor ejecuta su build normal; no se usa un servidor de prueba.
test('el servidor real entrega el libro y no sirve originales ni rutas internas', { timeout: 30_000 }, async t => {
  const reservation = createServer();
  await new Promise((resolve, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', resolve); });
  const port = reservation.address().port;
  await new Promise((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
  const child = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) child.kill('SIGTERM'); });
  let output = '';
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error(`El servidor no inició: ${output.slice(-1500)}`)); }, 12_000);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('exit', code => { clearTimeout(timer); reject(new Error(`Servidor terminó (${code}): ${output.slice(-1500)}`)); });
    child.stderr.on('data', data => { output += data; });
    child.stdout.on('data', data => { output += data; if (output.includes(`Local: http://localhost:${port}`)) { clearTimeout(timer); resolve(); } });
  });
  const base = `http://127.0.0.1:${port}`;
  const good = await fetch(base + mount('/prologo/01/'));
  assert.equal(good.status, 200);
  assert.match(good.headers.get('content-type'), /^text\/html/);
  assert.ok((await good.text()).includes('Los destructores del orden espontáneo'));
  for (const resource of [...CORPUS_FILES.map(f => '/' + f), '/investigacion/inventario.json', '/investigacion/transcripciones/01.txt', '/manuscrito/capitulo-01.json', '/plan.md', '/%2e%2e%2f01.pdf']) {
    const response = await fetch(base + mount(resource));
    const buffer = Buffer.from(await response.arrayBuffer());
    assert.ok([400, 403, 404].includes(response.status), `${resource}: servido con estado ${response.status}`);
    assert.ok(!buffer.subarray(0, 5).equals(Buffer.from('%PDF-')), `${resource}: expone un PDF original`);
  }
  const stylesheet = await fetch(base + mount('/assets/style.css'));
  assert.equal(stylesheet.status, 200);
  assert.match(stylesheet.headers.get('content-type'), /^text\/css/);
  const search = await fetch(base + mount('/assets/search.json'));
  assert.equal(search.status, 200);
  assert.equal((await search.json()).length, readingRoutes.length);
  if (BASE_PATH) {
    const redirect = await fetch(base + BASE_PATH + '?origen=prueba', { redirect: 'manual' });
    assert.equal(redirect.status, 308);
    assert.equal(new URL(redirect.headers.get('location'), base).href, base + mount('/') + '?origen=prueba');
    for (const resource of ['/prologo/01/', '/assets/style.css', '/assets/search.json', BASE_PATH + '-otro/']) {
      assert.equal((await fetch(base + resource)).status, 404, `${resource}: el servidor ignoró el montaje`);
    }
  }
});
