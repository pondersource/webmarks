# Webmarks

Webmarks is a bookmarking app, which lets you choose your server or provider
for storing all data. It is a user-first, open-source alternative to
proprietary, hosted bookmarking services like e.g. Delicious, Pinboard, et
cetera. [Learn more](https://webmarks.5apps.com/about).

Every contribution and all feedback are much appreciated and will be responded
to timely. The rest of this README concerns only developers and potential
contributors. For general support requests, please [open an
issue](https://github.com/skddc/webmarks/issues).

## Translations

The app is currently available in the following languages:

* English
* German
* French

Webmarks will use your browser language settings to determine which language is
shown.

Translating the app to a new language is simple:

1. Copy a language folder in `app/locales/` to a new one, using the two-letter
   ISO code of the language
2. Edit `app/locales/[language]/translations.js`.
3. If you want to test the translations, run the app locally (see below for
   instructions) and open it in a browser that is set to the language you
   added.

## Development

### Prerequisites

You will need the following things properly installed on your computer.

* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/) (with npm)
* [Ember CLI](https://ember-cli.com/)
* [Google Chrome](https://google.com/chrome/)

### Installation

* `git clone <repository-url>` this repository
* change into the new directory
* `npm install`

### Running / Development

* `npm start`
* Visit the app at [http://localhost:4200](http://localhost:4200).
* Visit the tests at [http://localhost:4200/tests](http://localhost:4200/tests).

#### Code Generators

Make use of the many generators for code, try `ember help generate` for more details

#### Running Tests

* `npm test`
* `ember test --server` (recommended)

#### Linting

* `npm run lint:hbs`
* `npm run lint:js`
* `npm run lint:js -- --fix`

#### Building

* `npm run build` (development)
* `npm run build-prod` (production)

### Deploying

Build production branch and deploy to [staging](https://webmarks-dev.5apps.com):

    npm run deploy

Deploy current production branch to [production](https://webmarks-dev.5apps.com):

    npm run deploy-prod

### Further Reading / Useful Links

* [remoteStorage](https://remotestorage.io/)
* [remoteStorage.js API docs](https://remotestoragejs.readthedocs.io/)
* [ember.js](http://emberjs.com/)
* [ember-cli](http://ember-cli.com/)
* Development Browser Extensions
  * [ember inspector for chrome](https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi)
  * [ember inspector for firefox](https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/)
* [Material UI icons](https://material.io/tools/icons/)

## remoteStorage acceptance test

With Node.js 22, run:

```sh
npm ci
npm ci --prefix acceptance
npx --prefix acceptance playwright install chromium
npm --prefix acceptance test
```

Playwright starts Webmarks and a local Armadietto server with disposable
accounts. The test signs in through the widget, saves a two-tag bookmark,
checks the private archive over HTTP, and retrieves it in a fresh browser
context. It requires no external provider account.

### Bookmark data shape

The two-tag acceptance fixture uses the archive shape documented in the
[PDS Interop bookmark convention](https://pdsinterop.org/conventions/bookmark/).
Webmarks passes the form values to the remoteStorage bookmarks module. The
module stores a JSON object in `/bookmarks/archive/`, keyed by a hash of the
target URL.

| Webmarks field | Solid bookmark representation | Vanilla Solid module |
| --- | --- | --- |
| `url` | `bookmark:recalls` with an IRI target | Reads and writes it as `link` |
| `title` | `rdfs:label` preferred by the convention | Writes `dcterms:title` and reads either predicate |
| `tags` | `bookmark:hasTopic`, preferably with topic IRIs | Accepts one `topic` and writes either an IRI or literal, but returns only an IRI |
| Private archive | Access controlled by the pod | Consults private and public type indexes. Verify access to the chosen write destination with an anonymous read |

The [vanilla Solid module source](https://github.com/solid-contrib/data-modules/blob/4602b8aee3737f06248ef08d45d771525cbba0a3/bookmarks/vanilla/src/modules/Bookmark.ts)
shows why this fixture cannot round-trip through its current API without
losing a tag. A literal topic also disappears on read. Preserving both tags
requires a representation for multiple topics and a read path that handles
the chosen representation. The Playwright test exercises the remoteStorage
side of this comparison.
