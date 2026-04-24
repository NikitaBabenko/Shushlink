# Security Policy

## Reporting a vulnerability

If you believe you have found a security issue in Shushlink, **please do not open a public GitHub issue**.

Instead, report it privately via one of:

- GitHub Security Advisories: <https://github.com/nikitosgames/shushlink/security/advisories/new>
- Email: `security@shushlink.app` (PGP key on request)

Please include:

- A clear description of the issue
- Steps to reproduce (or a proof of concept)
- The version / commit SHA you tested against
- Your suggested severity, and any disclosure constraints

We aim to acknowledge reports within **72 hours** and to ship a fix or mitigation within **90 days** of acknowledgement (coordinated disclosure). If you need to publish sooner, tell us in the report and we will coordinate.

## Scope

**In scope:**
- The contents of this repository (HTML, TS/JS, CSS, build configuration)
- The deployed application at `shushlink.app` and any official mirrors

**Out of scope (do not report):**
- Weak passwords chosen by users — use the auto-generated 24-character default
- Compromised endpoints (malicious browser extensions, OS keyloggers, screen recorders) — Shushlink cannot defend against arbitrary code running on the user's device
- Third-party hosting providers (VibeNest, Cloudflare, etc.) — report those to the provider
- Denial of service against a hosting provider — Shushlink is a static page; rate-limiting is a hosting concern
- Social engineering of recipients
- Self-XSS achieved by pasting attacker-controlled JavaScript into the secret field

## What we will not do

- We will not silently fix and not credit reporters who follow this policy
- We will not pursue legal action against good-faith research that does not violate user privacy or service availability
- We will not introduce a backend, telemetry, or any server-side state that could undermine the zero-knowledge property
