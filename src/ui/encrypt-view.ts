import { encryptSecret } from '../crypto';
import { generatePassword } from '../password';
import { renderQrSvg } from '../qr';
import { t } from '../i18n';
import { clear, copyToClipboard, el } from './components';

const URL_WARN_LEN = 2000;

export function renderEncryptView(root: HTMLElement): void {
  clear(root);

  const secret = el('textarea', {
    id: 'secret',
    rows: 6,
    placeholder: t('encrypt.secret.placeholder'),
    autocomplete: 'off',
    spellcheck: false,
    class: 'field field-textarea',
  });

  const passwordInput = el('input', {
    id: 'password',
    type: 'text',
    placeholder: t('encrypt.password.placeholder'),
    autocomplete: 'new-password',
    spellcheck: false,
    class: 'field',
  });

  const autoCheckbox = el('input', {
    id: 'auto',
    type: 'checkbox',
    checked: true,
  });

  const refreshAutoState = () => {
    if (autoCheckbox.checked) {
      passwordInput.value = generatePassword(24);
      passwordInput.readOnly = true;
      passwordInput.classList.add('field-readonly');
    } else {
      passwordInput.readOnly = false;
      passwordInput.classList.remove('field-readonly');
      if (passwordInput.value && passwordInput.value.length === 24) passwordInput.value = '';
      passwordInput.focus();
    }
  };
  autoCheckbox.addEventListener('change', refreshAutoState);
  refreshAutoState();

  const submit = el('button', { type: 'submit', class: 'btn btn-primary' }, [t('encrypt.button')]);
  const error = el('div', { class: 'error', role: 'alert' });
  const result = el('div', { class: 'result hidden' });

  const form = el(
    'form',
    {
      class: 'card',
      onSubmit: async (e: SubmitEvent) => {
        e.preventDefault();
        error.textContent = '';
        if (!secret.value.trim()) {
          error.textContent = 'Please enter a secret.';
          return;
        }
        if (!passwordInput.value) {
          error.textContent = 'Please enter or auto-generate a password.';
          return;
        }
        submit.disabled = true;
        submit.textContent = t('encrypt.working');
        try {
          const fragment = await encryptSecret(secret.value, passwordInput.value);
          const link = `${window.location.origin}${window.location.pathname}#${fragment}`;
          renderResult(result, link, passwordInput.value);
        } catch (err) {
          error.textContent = err instanceof Error ? err.message : 'Encryption failed.';
        } finally {
          submit.disabled = false;
          submit.textContent = t('encrypt.button');
        }
      },
    },
    [
      el('h1', { class: 'card-title' }, [t('encrypt.title')]),
      el('p', { class: 'card-sub' }, [t('app.tagline')]),
      el('label', { class: 'label', htmlFor: 'secret' }, [t('encrypt.secret.label')]),
      secret,
      el('label', { class: 'label', htmlFor: 'password' }, [t('encrypt.password.label')]),
      passwordInput,
      el('label', { class: 'check' }, [
        autoCheckbox,
        el('span', {}, [t('encrypt.password.auto')]),
      ]),
      submit,
      error,
    ]
  );

  root.appendChild(form);
  root.appendChild(result);
}

function renderResult(container: HTMLElement, link: string, password: string): void {
  clear(container);
  container.classList.remove('hidden');

  const linkInput = el('input', { type: 'text', readonly: true, value: link, class: 'field field-readonly mono' });
  const passInput = el('input', { type: 'text', readonly: true, value: password, class: 'field field-readonly mono' });

  const linkCopyBtn = makeCopyButton(link, t('encrypt.result.copy'), t('encrypt.result.copied'));
  const passCopyBtn = makeCopyButton(password, t('encrypt.result.copy'), t('encrypt.result.copied'));

  const qrHolder = el('div', { class: 'qr-holder hidden' });
  const qrToggle = el('button', { type: 'button', class: 'btn btn-ghost' }, [t('encrypt.result.qr')]);
  let qrShown = false;
  qrToggle.addEventListener('click', () => {
    qrShown = !qrShown;
    qrToggle.textContent = qrShown ? t('encrypt.result.qrHide') : t('encrypt.result.qr');
    if (qrShown) {
      clear(qrHolder);
      try {
        qrHolder.appendChild(renderQrSvg(link, 220));
      } catch {
        qrHolder.appendChild(el('p', { class: 'warn' }, [t('encrypt.result.qrTooLarge')]));
      }
      qrHolder.classList.remove('hidden');
    } else {
      qrHolder.classList.add('hidden');
    }
  });

  const newBtn = el('button', { type: 'button', class: 'btn btn-ghost' }, [t('encrypt.result.new')]);
  newBtn.addEventListener('click', () => {
    window.location.hash = '';
    window.location.reload();
  });

  const warn = link.length > URL_WARN_LEN
    ? el('p', { class: 'warn' }, [t('encrypt.result.warnLong')])
    : null;

  container.appendChild(
    el('div', { class: 'card' }, [
      el('h2', { class: 'card-title' }, [t('encrypt.result.title')]),
      el('div', { class: 'hint' }, [t('encrypt.result.hint')]),
      el('label', { class: 'label' }, [t('encrypt.result.link')]),
      el('div', { class: 'row' }, [linkInput, linkCopyBtn]),
      el('label', { class: 'label' }, [t('encrypt.result.password')]),
      el('div', { class: 'row' }, [passInput, passCopyBtn]),
      ...(warn ? [warn] : []),
      el('div', { class: 'row row-actions' }, [qrToggle, newBtn]),
      qrHolder,
    ])
  );
}

function makeCopyButton(value: string, label: string, copiedLabel: string): HTMLButtonElement {
  const btn = el('button', { type: 'button', class: 'btn btn-secondary' }, [label]);
  btn.addEventListener('click', async () => {
    const ok = await copyToClipboard(value);
    if (ok) {
      btn.textContent = copiedLabel;
      btn.classList.add('btn-success');
      setTimeout(() => {
        btn.textContent = label;
        btn.classList.remove('btn-success');
      }, 1400);
    }
  });
  return btn;
}
