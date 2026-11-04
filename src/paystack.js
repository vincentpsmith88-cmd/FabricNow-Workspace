let scriptPromise;

function loadPaystack() {
  if (window.PaystackPop) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      let script = document.querySelector('script[data-fabricnow-paystack="true"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://js.paystack.co/v2/inline.js';
        script.async = true;
        script.dataset.fabricnowPaystack = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => { scriptPromise = null; reject(new Error('Could not load secure Paystack checkout.')); }, { once: true });
    });
  }
  return scriptPromise;
}

export async function openPaystackInline(accessCode) {
  if (!accessCode) throw new Error('The server did not return a Paystack checkout code.');
  await loadPaystack();
  if (!window.PaystackPop) throw new Error('Paystack checkout is unavailable. Please refresh and try again.');
  new window.PaystackPop().resumeTransaction(accessCode);
}
