Google Drive repair build
=========================

Source: https://github.com/remotestorage/remotestorage.js/commit/90f87f75388a8da54a15256ba824095cccc37579
Upstream review: https://github.com/remotestorage/remotestorage.js/pull/1436

Built with npm ci, npm run build:js and npm run build:release. The archive contains the production release bundle and declarations, MIT license, README and package metadata. Version 2.0.0-beta.10-pondersource.1 identifies this pinned deployment build; no npm registry release is implied.

Fixes Google upload completion, missing-file reads, folder changes, pagination and stale path caches. Upstream validation: 521 Mocha tests plus legacy suites; live provider tests run against PonderSource deployments.
