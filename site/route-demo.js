// Keep previously shared prototype URLs working after the project page becomes home.
(() => {
  const query = new URLSearchParams(window.location.search);
  if (['phone', 'demo', 'screen'].some(key => query.has(key))) {
    const target = new URL('./demo/', window.location.href);
    target.search = window.location.search;
    target.hash = window.location.hash;
    window.location.replace(target.href);
  }
})();
