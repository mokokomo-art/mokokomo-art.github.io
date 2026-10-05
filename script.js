// ===== shared fade timing =====
// --fade-duration (set on :root in style.css) is the single source of truth for how
// long the page fade takes. Read it once here as a number of milliseconds, so the
// fade-out's setTimeout (below) always matches whatever the CSS says, instead of a
// separately hand-typed number that could drift out of sync with it. (art-display.html's
// own gallery cross-dissolve when switching categories in place uses this same length too.)
function readFadeMs() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--fade-duration').trim();
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return 500; // fallback if the variable is ever missing
  return raw.endsWith('ms') ? value : value * 1000;
}
const FADE_MS = readFadeMs();

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
// Each row: Name / Action / Value / Intro (Intro is only used on art-display.html;
// harmless elsewhere; page background colors live in each page's own CSS file). Action meanings:
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

        // the "home" link gets a second line in smaller text (.drawer-small in style.css):
        // "you are here" on the homepage, "you can go there again" everywhere else
        const onHomePage = /(^|\/)(index\.html)?$/.test(window.location.pathname);
        if (name === 'home') {
          const secondLine = onHomePage ? '(you are here)' : '(you can go there again)';
          a.innerHTML = `home<span class="drawer-small">${secondLine}</span>`;
        }
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
            // body's own CSS transition (see style.css) already covers this direction
            // too, so no need to set it again here -- just change the opacity.
            document.body.style.opacity = '0';
            // going to the nothing page (white): also fade this page's background
            // color to white during the fade-out, so it doesn't jump from this
            // page's color straight to white when nothing.html appears
            if (href === 'nothing.html') {
              document.body.style.transition =
                `opacity ${FADE_MS}ms ease, background-color ${FADE_MS}ms ease`;
              document.body.style.backgroundColor = '#fff';
            }
            setTimeout(() => { window.location.href = href; }, FADE_MS);
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

// ===== room for pop-ups: the info pop-ups hang down from their button and don't make
// the page taller, so one near the bottom could run off the end. After any click, if a
// pop-up is open and reaches past the bottom of the page, the page grows just enough to
// show all of it plus --bottom-space (style.css). When it closes, the extra goes away. =====
function makeRoomForPopup() {
  document.body.style.paddingBottom = '';
  const popup = document.querySelector('.info.open p');
  if (!popup) return;
  const space = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bottom-space')) || 0;
  const needed = popup.getBoundingClientRect().bottom + window.scrollY + space;
  const pageHeight = document.documentElement.scrollHeight;
  if (needed > pageHeight) document.body.style.paddingBottom = (needed - pageHeight) + 'px';
}
// requestAnimationFrame waits until the page's own click code has opened or closed the pop-up
document.addEventListener('click', () => requestAnimationFrame(makeRoomForPopup));
document.addEventListener('pointerdown', () => requestAnimationFrame(makeRoomForPopup));
