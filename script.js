// ===== shared across every page: fade in on arrival =====
// Pairs with the generic fade-out-then-navigate below (and with any page-specific
// override of that behavior, e.g. art-display.html's in-place category switch).
// Double rAF makes sure the browser has painted the initial opacity:0 state before
// the transition to 1 starts.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.body.style.opacity = '1';
  });
});

// ===== shared: hamburger open/close =====
const menuToggle = document.getElementById('menu-toggle');
const menuDrawer = document.getElementById('drawer');

if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    document.body.classList.toggle('menu-open');
  });
}

document.addEventListener('pointerdown', e => {
  if (!e.target.closest('#drawer') && !e.target.closest('#menu-toggle')) {
    document.body.classList.remove('menu-open');
  }
});

// ===== shared: drawer, built from arrays/menu-array.txt =====
// Each row: Name / Action / Value / Intro (Intro is only meaningful on art-display.html;
// harmless elsewhere). Action meanings:
//   goto  -> Value is a page to link straight to (home, about, nothing, coming-soon)
//   union -> art-display.html filtered to one or more categories, OR'd together (Value is
//            a comma-separated list of category IDs from arrays/category-array.txt)
//   chron -> art-display.html's fixed chronological view (categories 1+2, newest first)
//
// GENERIC DEFAULT for every link: fade the page out, then navigate to its href. A page
// can override this per-link by defining window.drawerLinkOverride({name, action, value,
// intro, href}) BEFORE this fetch resolves (i.e. anywhere in its own inline script,
// regardless of tag order -- fetch is always async) -- return a click handler to use
// instead, or a falsy value to keep the generic behavior. art-display.html uses this to
// swap its own category links to an in-place gallery update instead of a full navigation.
function parseMenu(text) {
  return text.trim().split(/\r?\n/).slice(1).map(line => {
    const [name, action, value, intro] = line.split('\t');
    return { name, action, value: value || '', intro: intro || '' };
  });
}

function buildDrawerHref(action, value) {
  if (action === 'union') return `art-display.html?category=${value}`;
  if (action === 'chron') return `art-display.html?category=chron`;
  return value; // goto
}

window.menuReady = fetch('arrays/menu-array.txt')
  .then(r => r.text())
  .then(parseMenu)
  .then(items => {
    if (menuDrawer) {
      items.forEach(item => {
        const { name, action, value } = item;
        const a = document.createElement('a');
        a.innerHTML = name; // menu-array.txt names can include plain HTML, e.g. <br>
        const href = buildDrawerHref(action, value);
        a.href = href;

        const override = typeof window.drawerLinkOverride === 'function'
          ? window.drawerLinkOverride({ ...item, href })
          : null;

        if (override) {
          a.addEventListener('click', override);
        } else {
          a.addEventListener('click', e => {
            e.preventDefault();
            document.body.style.transition = 'opacity 0.5s ease';
            document.body.style.opacity = '0';
            setTimeout(() => { window.location.href = href; }, 500);
          });
        }

        a.addEventListener('click', () => document.body.classList.remove('menu-open'));
        menuDrawer.appendChild(a);
      });
    }
    return items;
  })
  .catch(err => {
    console.error('menu-array.txt failed to load', err);
    return [];
  });
