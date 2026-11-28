(function () {
  const sdk = new URL('atomic-sdk/index.mjs', document.currentScript.src);
  window.loadPonderSourceAtomicSDK = () => import(sdk.href);
})();
