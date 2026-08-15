/**
 * URLs légales absolues utilisées dans les emails (contexte hors Next.js).
 *
 * Les emails sont rendus en HTML stateless et ouvertsdepuis n'importe quel
 * client (Gmail Web, Outlook, Apple Mail) : les URLs doivent être absolues
 * et pointer vers le domaine de production.
 *
 * Module autonome volontairement : pas d'import depuis `./urls` pour éviter
 * les cascades de mocks dans les tests qui rendent des composants d'email.
 */
const PROD_URL = "https://synclune.fr";

export const LEGAL_URLS = {
	CGV: `${PROD_URL}/cgv`,
	PRIVACY: `${PROD_URL}/confidentialite`,
	WITHDRAWAL: `${PROD_URL}/retractation`,
	LEGAL_NOTICE: `${PROD_URL}/mentions-legales`,
} as const;

/**
 * Logo hébergé accessible depuis les clients email (URL absolue requise).
 * `logo.png` est le rendu 512 px du mark vectoriel, généré par
 * `scripts/generate-brand-icons.ts` — PNG et non WebP : Outlook desktop
 * (moteur Word) ne décode pas le WebP.
 */
export const EMAIL_LOGO_URL = `${PROD_URL}/logo.png`;
