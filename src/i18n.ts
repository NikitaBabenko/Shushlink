type Lang = 'en';

const dict: Record<Lang, Record<string, string>> = {
  en: {
    'app.tagline': 'Zero-knowledge secret sharing. The server never sees your secret.',
    'encrypt.title': 'Create an encrypted link',
    'encrypt.secret.label': 'Secret',
    'encrypt.secret.placeholder': 'Type or paste the secret you want to share…',
    'encrypt.password.label': 'Password',
    'encrypt.password.placeholder': 'Password',
    'encrypt.password.auto': 'Auto-generate a strong password',
    'encrypt.button': 'Create link',
    'encrypt.working': 'Encrypting…',
    'encrypt.result.title': 'Your encrypted link is ready',
    'encrypt.result.link': 'Link',
    'encrypt.result.password': 'Password',
    'encrypt.result.hint': 'Send the link and the password through different channels (e.g. link via email, password via Signal).',
    'encrypt.result.qr': 'Show QR',
    'encrypt.result.qrHide': 'Hide QR',
    'encrypt.result.copy': 'Copy',
    'encrypt.result.copied': 'Copied',
    'encrypt.result.new': 'New secret',
    'encrypt.result.warnLong': 'Warning: this URL is longer than ~2000 chars and may not work in every browser or messenger.',
    'encrypt.result.qrTooLarge': 'This link is too long to encode as a QR code. Share the link via copy/paste instead.',
    'decrypt.title': 'Encrypted secret detected',
    'decrypt.subtitle': 'Enter the password to decrypt this link locally in your browser.',
    'decrypt.password.label': 'Password',
    'decrypt.password.placeholder': 'Password',
    'decrypt.button': 'Decrypt',
    'decrypt.working': 'Decrypting…',
    'decrypt.result.title': 'Decrypted secret',
    'decrypt.result.copy': 'Copy',
    'decrypt.result.copied': 'Copied',
    'decrypt.result.warn': 'This window is the only place this secret exists right now. Close the tab when you are done.',
    'decrypt.error': 'Wrong password or corrupted link.',
    'decrypt.error.format': 'This link is not a valid Shushlink payload.',
    'decrypt.new': 'Create your own',
    'footer.poweredBy': 'Powered by',
    'footer.builtWith': 'built with',
    'footer.source': 'source',
  },
};

const current: Lang = 'en';

export function t(key: string): string {
  return dict[current][key] ?? key;
}
