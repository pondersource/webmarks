const core = 'https://atomicdata.dev/properties/';
const parent = core + 'parent';
const isA = core + 'isA';
const name = core + 'name';
const description = core + 'description';
const prefix = 'webmarks-bookmark/v1:';

function element(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function httpUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Enter an HTTP or HTTPS URL without credentials.');
  }
  return url.href;
}

async function bookmarkTable(store) {
  const {table, rowClass} = await store.getData();
  if (!table || !rowClass) throw new Error('Webmarks needs a bookmarks table.');

  function read(row) {
    if (row.error) throw new Error('Atomic could not read a bookmark.');
    if (row.get(parent) !== table || !row.get(isA)?.includes(rowClass)) return;
    const data = row.get(description);
    if (typeof data !== 'string' || !data.startsWith(prefix)) return;
    const bookmark = JSON.parse(data.slice(prefix.length));
    return {...bookmark, title: row.get(name), subject: row.subject};
  }

  return {
    async list() {
      const subjects = await store.query({property: parent, value: table});
      if (subjects.length >= 500) throw new Error('This version supports fewer than 500 rows.');
      const bookmarks = [];
      for (let offset = 0; offset < subjects.length; offset += 100) {
        const rows = await store.getMany(subjects.slice(offset, offset + 100));
        bookmarks.push(...rows.map(read).filter(Boolean));
      }
      return bookmarks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async save({title, subject, ...data}) {
      const propVals = {[name]: title, [description]: prefix + JSON.stringify(data)};
      if (!subject) {
        await store.newResource({parent: table, isA: [rowClass], propVals});
      } else {
        const row = await store.getResource(subject);
        if (!read(row)) throw new Error('This bookmark is outside the Webmarks table.');
        for (const [property, value] of Object.entries(propVals)) row.set(property, value);
        await row.save();
      }
    },
    async remove(subject) {
      const row = await store.getResource(subject);
      if (!read(row)) throw new Error('This bookmark is outside the Webmarks table.');
      await row.destroy();
    }
  };
}

export async function view({root, store}) {
  const table = await bookmarkTable(store);
  const style = element('style', `
    .webmarks { max-width: 56rem; margin: auto; padding: 1.25rem; font: 1rem system-ui; }
    .webmarks form, .webmarks ul { display: grid; gap: .65rem; }
    .webmarks ul { padding: 0; list-style: none; }
    .webmarks li { border-block-start: 1px solid #8886; padding-block: .7rem; }
    .webmarks label, .webmarks input, .webmarks textarea { display: block; width: 100%; box-sizing: border-box; }
    .webmarks input, .webmarks textarea, .webmarks button { font: inherit; padding: .4rem; }
    .webmarks button { margin: .25rem .5rem .25rem 0; }
    .webmarks h2 { margin: 0 0 .5rem; font-size: 1.1rem; }
    .webmarks p { overflow-wrap: anywhere; }
  `);
  const main = element('main');
  main.className = 'webmarks';
  const form = element('form');
  const fields = element('fieldset');
  fields.append(element('legend', 'Bookmark'));
  form.append(fields);
  const inputs = {};
  for (const [key, label, tag] of [
    ['title', 'Title', 'input'], ['url', 'URL', 'input'],
    ['description', 'Notes', 'textarea'], ['tags', 'Tags (comma-separated)', 'input']
  ]) {
    const wrapper = element('label', label);
    inputs[key] = element(tag);
    wrapper.append(inputs[key]);
    fields.append(wrapper);
  }
  inputs.title.required = true;
  inputs.url.required = true;
  inputs.url.type = 'url';
  const save = element('button', 'Add bookmark');
  const cancel = element('button', 'Cancel edit');
  cancel.type = 'button';
  fields.append(save, cancel);

  const filterLabel = element('label', 'Filter bookmarks');
  const filter = element('input');
  filter.type = 'search';
  filterLabel.append(filter);
  const list = element('ul');
  const status = element('p');
  status.setAttribute('role', 'status');
  main.append(element('h1', 'Webmarks'), form, status, filterLabel, list);
  root.replaceChildren(style, main);

  let bookmarks = [];
  let editing;
  let busy = false;

  function edit(bookmark) {
    editing = bookmark;
    form.reset();
    cancel.hidden = !bookmark;
    save.textContent = bookmark ? 'Save bookmark' : 'Add bookmark';
    if (bookmark) {
      for (const key of ['title', 'url', 'description']) inputs[key].value = bookmark[key] || '';
      inputs.tags.value = bookmark.tags.join(', ');
      inputs.title.focus();
    }
  }

  function render() {
    const needle = filter.value.trim().toLocaleLowerCase();
    list.replaceChildren();
    for (const bookmark of bookmarks) {
      const {title, url, description: notes, tags, subject} = bookmark;
      if (![title, url, notes, ...tags].join(' ').toLocaleLowerCase().includes(needle)) continue;
      const item = element('li');
      const urlField = element('input');
      urlField.readOnly = true;
      urlField.value = url;
      urlField.setAttribute('aria-label', 'Saved URL for ' + title);
      urlField.addEventListener('focus', () => urlField.select());
      const change = element('button', 'Edit');
      change.addEventListener('click', () => { if (!busy) edit(bookmark); });
      const remove = element('button', 'Delete');
      remove.addEventListener('click', () => {
        if (busy || !window.confirm('Delete this bookmark?')) return;
        run(async () => {
          await table.remove(subject);
          if (editing?.subject === subject) edit();
        }, 'Bookmark deleted.');
      });
      item.append(element('h2', title), urlField);
      if (notes) item.append(element('p', notes));
      if (tags.length) item.append(element('p', tags.join(', ')));
      item.append(change, remove);
      list.append(item);
    }
    if (!list.children.length) list.append(element('li', 'No matching bookmarks.'));
  }

  async function run(operation, message) {
    if (busy) return;
    busy = true;
    fields.disabled = true;
    status.textContent = '';
    try {
      await operation();
      bookmarks = await table.list();
      render();
      status.textContent = message;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      busy = false;
      fields.disabled = false;
    }
  }

  cancel.addEventListener('click', () => edit());
  filter.addEventListener('input', render);
  form.addEventListener('submit', event => {
    event.preventDefault();
    run(async () => {
      const title = inputs.title.value.trim();
      if (!title) throw new Error('Enter a title.');
      await table.save({
        subject: editing?.subject,
        title,
        url: httpUrl(inputs.url.value),
        description: inputs.description.value,
        tags: [...new Set(inputs.tags.value.split(',').map(tag => tag.trim()).filter(Boolean))],
        createdAt: editing?.createdAt || new Date().toISOString()
      });
      edit();
    }, 'Bookmark saved.');
  });

  edit();
  await run(async () => {}, '');
}
