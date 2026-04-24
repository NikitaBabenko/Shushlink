import './styles.css';
import { hasFragmentPayload } from './crypto';
import { renderEncryptView } from './ui/encrypt-view';
import { renderDecryptView } from './ui/decrypt-view';
import { t } from './i18n';
import { el } from './ui/components';

function renderFooter(root: HTMLElement): void {
  const link = (href: string, label: string) =>
    el('a', { href, target: '_blank', rel: 'noopener noreferrer' }, [label]);

  root.appendChild(
    el('div', { class: 'footer-inner' }, [
      document.createTextNode(`${t('footer.poweredBy')} `),
      link('https://vibenest.net/', 'VibeNest'),
      document.createTextNode(` · ${t('footer.builtWith')} `),
      link('https://sc.vibenest.net/', 'SynthCabal'),
      document.createTextNode(' · '),
      link('https://github.com/nikitosgames/shushlink', t('footer.source')),
    ])
  );
}

function bustFrame(): boolean {
  if (window.top !== window.self) {
    document.body.textContent = '';
    try {
      if (window.top) window.top.location.href = window.self.location.href;
    } catch {
      /* cross-origin top — at least we already cleared the body */
    }
    return true;
  }
  return false;
}

function bootstrap(): void {
  if (bustFrame()) return;

  const app = document.getElementById('app');
  const footer = document.getElementById('footer');
  if (!app || !footer) throw new Error('missing root nodes');

  if (hasFragmentPayload()) renderDecryptView(app);
  else renderEncryptView(app);

  renderFooter(footer);
}

bootstrap();
