/**
 * @regression legal-urls-coherence
 *
 * Garde-fou de cohérence entre les TROIS sources qui décrivent les URLs
 * légales et d'aide, qu'aucun type ne relie entre elles :
 *
 * 1. `ROUTES.LEGAL` (`shared/constants/urls.ts`) — chemins relatifs, storefront ;
 * 2. `LEGAL_URLS` (`shared/constants/legal-urls.ts`) — URLs absolues, emails
 *    (module volontairement autonome, donc jamais croisé avec `ROUTES`) ;
 * 3. `publicRoutes` de `proxy.ts` — l'allowlist sans laquelle le default-deny
 *    redirige la route vers l'accueil.
 *
 * ## Les bugs que ce test verrouille (audit « Pages légales » 2026-08-01)
 *
 * - `LEGAL_URLS.CONTACT` pointait vers `https://synclune.fr/contact`, une route
 *   qui n'a jamais existé : le lien « Nous contacter » du pied de TOUS les
 *   emails transactionnels redirigeait vers l'accueil (default-deny).
 * - `/aide` était liée depuis le footer, le sitemap et un JSON-LD `FAQPage`,
 *   mais absente de `publicRoutes` : toute la FAQ (livraison, retours) était
 *   inatteignable — le proxy renvoyait l'accueil. La page a depuis été absorbée
 *   par la landing (2026-08-05) ; l'URL survit en redirection 308, et c'est
 *   TOUJOURS `publicRoutes` qui décide si elle atteint son ancre.
 *
 * Dans les deux cas, chaque source était plausible isolément ; seule la
 * confrontation des trois révèle le trou. C'est le même motif que
 * `vat-mention-ssot` pour la mention TVA, appliqué aux URLs.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LEGAL_URLS, EMAIL_LOGO_URL } from "../legal-urls";
import { ROUTES } from "../urls";

const REPO_ROOT = join(__dirname, "..", "..", "..");

const LEGAL_PATHS = Object.values(ROUTES.LEGAL);

/**
 * Extrait l'allowlist `publicRoutes` de `proxy.ts` sans l'importer : le module
 * tire `next/server` et `better-auth/cookies`, inutilisables dans ce runner.
 */
function readProxyPublicRoutes(): string[] {
	const source = readFileSync(join(REPO_ROOT, "proxy.ts"), "utf-8");
	const block = source.match(/const publicRoutes = \[([\s\S]*?)\];/)?.[1];
	if (!block) return [];
	return [...block.matchAll(/"([^"]+)"/g)].flatMap((m) => (m[1] ? [m[1]] : []));
}

describe("@regression legal-urls-coherence", () => {
	const publicRoutes = readProxyPublicRoutes();

	it("extrait une allowlist plausible de proxy.ts", () => {
		// Sanity check : si le pattern d'extraction casse (renommage, reformatage),
		// les assertions suivantes passeraient à vide — vert pour la mauvaise raison.
		expect(publicRoutes.length).toBeGreaterThanOrEqual(8);
		expect(publicRoutes).toContain("/");
	});

	it("chaque route de ROUTES.LEGAL a sa page sur le disque", () => {
		const missing = LEGAL_PATHS.filter(
			(path) => !existsSync(join(REPO_ROOT, "app", "(legal)", path.slice(1), "page.tsx")),
		);
		expect(
			missing,
			`Route(s) de ROUTES.LEGAL sans page app/(legal)/<segment>/page.tsx : ${missing.join(", ")}. ` +
				"Un lien légal (footer, checkout, emails) pointerait dans le vide.",
		).toEqual([]);
	});

	it("chaque URL de LEGAL_URLS correspond à une route légale réelle", () => {
		// C'est la garde qui aurait attrapé `LEGAL_URLS.CONTACT` → `/contact`
		// (route inexistante, lien mort dans le pied de tous les emails).
		const offenders = Object.entries(LEGAL_URLS).filter(([, url]) => {
			if (!url.startsWith("https://synclune.fr/")) return true;
			const path = new URL(url).pathname;
			return !LEGAL_PATHS.includes(path as (typeof LEGAL_PATHS)[number]);
		});
		expect(
			offenders.map(([key, url]) => `${key} → ${url}`),
			"Entrée de LEGAL_URLS (emails) sans route correspondante dans ROUTES.LEGAL. " +
				"Les deux SSOT doivent rester alignées : une URL d'email ne se vérifie jamais en dev.",
		).toEqual([]);
	});

	it("chaque route légale est dans l'allowlist publicRoutes du proxy", () => {
		const missing = LEGAL_PATHS.filter((path) => !publicRoutes.includes(path));
		expect(
			missing,
			`Route(s) publique(s) absente(s) de publicRoutes (proxy.ts) : ${missing.join(", ")}. ` +
				"Le default-deny du proxy les redirige vers l'accueil.",
		).toEqual([]);
	});

	/**
	 * `/aide` n'est plus une page : la FAQ a rejoint la landing le 2026-08-05.
	 * L'URL était indexée (sitemap, canonical, JSON-LD `FAQPage`), donc elle
	 * redirige — et il faut LES DEUX moitiés du montage pour que la redirection
	 * arrive à destination :
	 *
	 * - la règle 308 dans `next.config.ts`, sinon l'URL tombe en 404 ;
	 * - `/aide` dans `publicRoutes`, sinon le default-deny du proxy la renvoie
	 *   vers `/` — donc en haut de la page, SANS l'ancre `#faq`. C'est la même
	 *   moitié manquante que le bug d'origine, avec un symptôme plus discret :
	 *   la page s'ouvre, juste pas au bon endroit.
	 *
	 * Et l'ancre elle-même doit exister : un fragment inconnu ne produit aucune
	 * erreur, le navigateur reste simplement en haut.
	 */
	it("l'ancienne URL /aide redirige vers l'ancre de la FAQ, et le proxy la laisse passer", () => {
		expect(publicRoutes).toContain("/aide");

		const nextConfig = readFileSync(join(REPO_ROOT, "next.config.ts"), "utf-8");
		expect(nextConfig).toContain('source: "/aide", destination: "/#faq", permanent: true');

		// La SSOT de lien du storefront pointe la même ancre que la redirection.
		expect(ROUTES.SHOP.HELP).toBe("/#faq");

		// …et la section qui porte cette ancre existe, avec cet `id`.
		const faqSection = readFileSync(
			join(REPO_ROOT, "app", "(shop)", "(home)", "_components", "faq", "faq-section.tsx"),
			"utf-8",
		);
		expect(faqSection).toContain('FAQ_SECTION_ID = "faq"');
		expect(faqSection).toContain("id={FAQ_SECTION_ID}");
	});

	it("le logo email existe dans public/", () => {
		const logoPath = new URL(EMAIL_LOGO_URL).pathname;
		expect(existsSync(join(REPO_ROOT, "public", logoPath.slice(1)))).toBe(true);
	});
});
