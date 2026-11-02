import Application from '../app';
import config from '../config/environment';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';
// Keep a test entrypoint so ember-auto-import includes the app's npm modules
// when booting the test page (even when every test otherwise uses Ember modules).
import 'remotestoragejs/release/remotestorage.js';

setApplication(Application.create(config.APP));

start();
