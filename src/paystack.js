let scriptPromise;

function loadPaystack() {
  if (window.PaystackPop) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      let script = document.querySelector('script[data-fabricnow-paystack="true"]');
      const created = !script;
      const cleanup = () => {
        clearTimeout(timeout);
        script.removeEventListener('load', onLoad);
        script.removeEventListener('error', onError);
      };
      const onLoad = () => {
        cleanup();
        if (window.PaystackPop) resolve();
        else onError(new Error('Paystack checkout did not initialize.'));
      };
      const onError = () => {
        cleanup();
        scriptPromise = null;
        reject(new Error('Could not load secure Paystack checkout.'));
      };
      const timeout = setTimeout(onError, 15000);
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://js.paystack.co/v2/inline.js';
        script.async = true;
        script.dataset.fabricnowPaystack = 'true';
      }
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      if (created) document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

function redirectToPaystack(url) {
  if (!url) return false;
  try {
    const checkout = new URL(url);
    if (checkout.protocol !== 'https:' || !/(^|\.)paystack\.com$/i.test(checkout.hostname)) return false;
    window.location.assign(checkout.href);
    return true;
  } catch {
    return false;
  }
}

export async function openPaystackInline(accessCode, authorizationUrl, onError) {
  if (!accessCode) {
    if (redirectToPaystack(authorizationUrl)) return;
    throw new Error('Paystack did not return a checkout code or a valid checkout link.');
  }
  try {
    await loadPaystack();
  } catch (error) {
    if (redirectToPaystack(authorizationUrl)) return;
    throw error;
  }
  if (!window.PaystackPop) throw new Error('Paystack checkout is unavailable. Please refresh and try again.');
  try {
    new window.PaystackPop().resumeTransaction(accessCode, {
      onError: (error) => {
        if (!redirectToPaystack(authorizationUrl)) {
          onError?.(new Error(error?.message || 'Paystack could not open the inline checkout.'));
        }
      },
    });
  } catch (error) {
    if (redirectToPaystack(authorizationUrl)) return;
    throw error;
  }
}
