import { decryptSecret, getFragment } from '../crypto';
import { t } from '../i18n';
import { clear, copyToClipboard, el } from './components';

export function renderDecryptView(root: HTMLElement): void {
  clear(root);

  const fragment = getFragment();
  const password = el('input', {
    id: 'password',
    type: 'password',
    placeholder: t('decrypt.password.placeholder'),
    autocomplete: 'off',
    spellcheck: false,
    class: 'field',
  });

  const togglePw = el(
    'button',
    {
      type: 'button',
      class: 'toggle-pw',
      title: t('decrypt.password.show'),
      'aria-label': t('decrypt.password.show'),
    },
    ['👁']
  );
  togglePw.addEventListener('click', () => {
    const showing = password.type === 'text';
    password.type = showing ? 'password' : 'text';
    const label = showing ? t('decrypt.password.show') : t('decrypt.password.hide');
    togglePw.title = label;
    togglePw.setAttribute('aria-label', label);
    togglePw.textContent = showing ? '👁' : '🚫';
    password.focus();
  });
  const passwordRow = el('div', { class: 'row row-tight' }, [password, togglePw]);

  const submit = el('button', { type: 'submit', class: 'btn btn-primary' }, [t('decrypt.button')]);
  const error = el('div', { class: 'error', role: 'alert' });
  const result = el('div', { class: 'result hidden' });

  const form = el(
    'form',
    {
      class: 'card',
      onSubmit: async (e: SubmitEvent) => {
        e.preventDefault();
        error.textContent = '';
        if (!password.value) {
          error.textContent = 'Please enter the password.';
          return;
        }
        submit.disabled = true;
        submit.textContent = t('decrypt.working');
        try {
          const plaintext = await decryptSecret(fragment, password.value);
          renderResult(result, plaintext);
          form.classList.add('hidden');
        } catch (err) {
          if (err instanceof Error && err.message.startsWith('invalid payload')) {
            error.textContent = t('decrypt.error.format');
          } else if (err instanceof Error && err.message.startsWith('unsupported version')) {
            error.textContent = err.message;
          } else {
            error.textContent = t('decrypt.error');
          }
        } finally {
          submit.disabled = false;
          submit.textContent = t('decrypt.button');
        }
      },
    },
    [
      el('h1', { class: 'card-title' }, [t('decrypt.title')]),
      el('p', { class: 'card-sub' }, [t('decrypt.subtitle')]),
      el('label', { class: 'label', htmlFor: 'password' }, [t('decrypt.password.label')]),
      passwordRow,
      submit,
      error,
    ]
  );

  password.focus();
  root.appendChild(form);
  root.appendChild(result);
}

function renderResult(container: HTMLElement, plaintext: string): void {
  clear(container);
  container.classList.remove('hidden');

  const out = el('textarea', {
    readonly: true,
    rows: 6,
    class: 'field field-textarea field-readonly',
    value: plaintext,
  });
  out.value = plaintext;

  const copyBtn = el('button', { type: 'button', class: 'btn btn-secondary' }, [t('decrypt.result.copy')]);
  copyBtn.addEventListener('click', async () => {
    const ok = await copyToClipboard(plaintext);
    if (ok) {
      copyBtn.textContent = t('decrypt.result.copied');
      copyBtn.classList.add('btn-success');
      setTimeout(() => {
        copyBtn.textContent = t('decrypt.result.copy');
        copyBtn.classList.remove('btn-success');
      }, 1400);
    }
  });

  const newBtn = el('a', { class: 'btn btn-ghost', href: window.location.pathname }, [t('decrypt.new')]);

  container.appendChild(
    el('div', { class: 'card' }, [
      el('h2', { class: 'card-title' }, [t('decrypt.result.title')]),
      out,
      el('div', { class: 'row row-actions' }, [copyBtn, newBtn]),
      el('p', { class: 'warn' }, [t('decrypt.result.warn')]),
    ])
  );
}
