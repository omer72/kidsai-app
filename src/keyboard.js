// With windowSoftInputMode="adjustNothing" (Android) and Keyboard.resize=None
// (iOS) the OS keyboard overlays the WebView and the page never resizes or
// pans — that keeps the app frame stable, but a focused field near the bottom
// would sit behind the keyboard. This guard adds scroll clearance below the
// active scroll container (html.kb-open CSS in index.html) and brings the
// focused field into the visible upper part of the screen.

const isEditable = (el) =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

export function initKeyboardGuard() {
  let revealTimer = null;

  const reveal = (el) => {
    clearTimeout(revealTimer);
    // Let the keyboard animation finish and the clearance padding apply first.
    revealTimer = setTimeout(() => {
      const scroller = el.closest('[data-kb-scroll]');
      if (scroller) {
        // Park the field's top at ~18% of the viewport — comfortably above
        // any keyboard (which covers roughly the bottom 40-50%).
        const delta = el.getBoundingClientRect().top - window.innerHeight * 0.18;
        scroller.scrollBy({ top: delta, behavior: 'smooth' });
      } else {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 250);
  };

  document.addEventListener('focusin', (e) => {
    if (!isEditable(e.target)) return;
    document.documentElement.classList.add('kb-open');
    reveal(e.target);
  });

  document.addEventListener('focusout', () => {
    clearTimeout(revealTimer);
    // Defer past a full tap (pointerdown→click ≈ 100-300ms): a tap on a button
    // blurs the field first, and removing the clearance mid-tap shifts the
    // layout under the finger so the click never lands on the button.
    setTimeout(() => {
      if (!isEditable(document.activeElement)) {
        document.documentElement.classList.remove('kb-open');
      }
    }, 400);
  });
}
