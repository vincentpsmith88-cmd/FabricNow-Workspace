// Loads Stripe.js straight from Stripe (required for PCI compliance — never bundle or self-host it).
// No npm package needed.
let scriptPromise = null;
const instances = new Map();

function loadScript() {
  if (window.Stripe) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { scriptPromise = null; s.remove(); reject(new Error('Could not load the secure card form from Stripe. Check your connection and try again.')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export async function getStripe(publishableKey) {
  await loadScript();
  if (!instances.has(publishableKey)) instances.set(publishableKey, window.Stripe(publishableKey));
  return instances.get(publishableKey);
}
