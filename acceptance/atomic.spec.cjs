const { readFileSync } = require('node:fs');
const { test, expect } = require('@playwright/test');

function run(source) {
    const core = 'https://atomicdata.dev/properties/';
    const table = 'https://example.test/bookmarks';
    const rowClass = table + '/bookmark';
    const rows = new Map();
    let next = 0;
    function resource(subject) {
        const values = {...rows.get(subject)};
        return {
            subject,
            get: property => values[property],
            set: (property, value) => { values[property] = value; },
            save: async () => { rows.set(subject, values); },
            destroy: async () => { rows.delete(subject); },
        };
    }
    const store = {
        getData: async () => ({table, rowClass}),
        query: async ({property, value}) => [...rows].filter(([, row]) => row[property] === value).map(([key]) => key),
        getResource: async subject => resource(subject),
        getMany: async subjects => subjects.map(resource),
        newResource: async ({parent, isA, propVals}) => {
            rows.set(table + '/' + ++next, {...propVals, [core + 'parent']: parent, [core + 'isA']: isA});
        },
    };

    window.addEventListener('message', async ({data}) => {
        if (data === 'snapshot') {
            window.parent.postMessage([...rows], '*');
        } else if (Array.isArray(data)) {
            for (const [key, value] of data) rows.set(key, value);
            next = rows.size;
            const url = URL.createObjectURL(new Blob([source], {type: 'text/javascript'}));
            const {view} = await import(url);
            URL.revokeObjectURL(url);
            await view({root: document.getElementById('root'), store});
        }
    });
}

test('Webmarks saves and edits tagged bookmarks in Atomic’s sandbox', async ({ page }) => {
    const source = readFileSync('../atomic/webmarks-0.1.0.js', 'utf8');
    const payload = JSON.stringify(source).replace(/</g, '\\u003c');
    const document = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-demo' blob:; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'">
<div id="root"></div><script type="module" nonce="demo">(${run})(${payload})</script>`;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<iframe id="app" width="1000" height="640" sandbox="allow-scripts allow-modals"></iframe>');
    const iframe = page.locator('#app');
    const frame = page.frameLocator('#app');

    async function open(rows) {
        await iframe.evaluate((element, {document, rows}) => new Promise(resolve => {
            element.addEventListener('load', () => {
                element.contentWindow.postMessage(rows, '*');
                resolve();
            }, {once: true});
            element.srcdoc = document;
        }), {document, rows});
        await expect(frame.getByRole('heading', {name: 'Webmarks'})).toBeVisible();
    }

    await open([]);
    await frame.getByLabel('Title', {exact: true}).fill('Atomic docs');
    await frame.getByLabel('URL', {exact: true}).fill('https://docs.atomicdata.dev');
    await frame.getByLabel('Tags (comma-separated)').fill('docs, atomic, docs');
    await frame.getByRole('button', {name: 'Add bookmark'}).click();
    await expect(frame.getByRole('heading', {name: 'Atomic docs'})).toBeVisible();
    await frame.getByRole('button', {name: 'Edit', exact: true}).click();
    await frame.getByLabel('Title', {exact: true}).fill('Atomic documentation');
    await frame.getByRole('button', {name: 'Save bookmark'}).click();
    await expect(frame.getByRole('heading', {name: 'Atomic documentation'})).toBeVisible();
    const rows = await iframe.evaluate(element => new Promise(resolve => {
        window.addEventListener('message', event => resolve(event.data), {once: true});
        element.contentWindow.postMessage('snapshot', '*');
    }));
    expect(rows).toHaveLength(1);
    await open(rows);
    await frame.getByLabel('Filter bookmarks').fill('atomic');
    await expect(frame.getByRole('heading', {name: 'Atomic documentation'})).toBeVisible();
    await frame.getByLabel('Filter bookmarks').fill('other');
    await expect(frame.getByRole('heading', {name: 'Atomic documentation'})).toHaveCount(0);
    expect(errors).toEqual([]);
});
