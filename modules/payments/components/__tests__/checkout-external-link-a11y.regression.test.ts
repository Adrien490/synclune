import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression checkout-external-link-a11y-2026-07-26
 *
 * Un `aria-label` posé sur une icône lucide est INERTE : lucide-react rend un
 * `<svg>` sans `role="img"`, donc en `role=graphics-*` / générique selon l'AT —
 * un rôle qui interdit le nommage par l'auteur. Les 4 liens externes du tunnel
 * de paiement portaient `<ExternalLink aria-label="(nouvelle fenêtre)" />` :
 * l'utilisateur de lecteur d'écran n'était donc PAS averti que « CGV », « Politique
 * de retour », « conditions générales de vente » et « politique de confidentialité »
 * ouvrent un nouvel onglet (WCAG 3.2.5).
 *
 * Le repo avait déjà tranché ce point sur la page de confirmation
 * (`receipt-button.tsx`, verrouillé par `checkout-confirmation-a11y.regression.test.ts`) :
 * l'icône est `aria-hidden` et le texte part dans un `<span className="sr-only">`.
 * Ce test étend le même verrou au tunnel.
 *
 * Audit UI/UX paiement 2026-07-26, F8.
 */

const REPO_ROOT = process.cwd();

const SCANNED_DIRS = ["modules/payments/components", "app/paiement"];

/** Récupère récursivement les .tsx d'un dossier (hors __tests__). */
function collectTsxFiles(relativeDir: string): string[] {
	const absolute = join(REPO_ROOT, relativeDir);
	const found: string[] = [];

	for (const entry of readdirSync(absolute, { withFileTypes: true })) {
		if (entry.name === "__tests__" || entry.name === "node_modules") continue;
		const relativePath = join(relativeDir, entry.name);
		if (entry.isDirectory()) {
			found.push(...collectTsxFiles(relativePath));
		} else if (entry.name.endsWith(".tsx")) {
			found.push(relativePath);
		}
	}

	return found;
}

/** Retire commentaires de bloc, JSX et ligne — un commentaire ne doit pas faire échouer. */
function stripComments(source: string): string {
	return source
		.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*$/gm, "");
}

const FILES = SCANNED_DIRS.flatMap(collectTsxFiles);

describe("Checkout — liens externes annoncés aux lecteurs d'écran", () => {
	it("le scan couvre bien les fichiers attendus (garde-fou du garde-fou)", () => {
		// Sans cette assertion, une erreur de chemin rendrait tout le fichier vert
		// en n'inspectant rien.
		expect(FILES.length).toBeGreaterThanOrEqual(10);
		expect(FILES).toContain(join("modules/payments/components", "checkout-summary.tsx"));
		expect(FILES).toContain(join("modules/payments/components", "checkout-stripe-section.tsx"));
	});

	it("aucun aria-label n'est posé sur une icône ExternalLink", () => {
		const offenders = FILES.filter((file) => {
			const stripped = stripComments(readFileSync(join(REPO_ROOT, file), "utf-8"));
			return /<ExternalLink[^>]*aria-label=/.test(stripped);
		});

		expect(offenders).toEqual([]);
	});

	it("chaque ExternalLink est aria-hidden et suivi du texte sr-only", () => {
		for (const file of FILES) {
			const stripped = stripComments(readFileSync(join(REPO_ROOT, file), "utf-8"));
			const icons = stripped.match(/<ExternalLink[^>]*\/>/g) ?? [];

			for (const icon of icons) {
				expect(icon, `${file} — ExternalLink doit être aria-hidden`).toMatch(
					/aria-hidden=\{?["']?true["']?\}?/,
				);
			}

			if (icons.length > 0) {
				const srOnlyNotices =
					stripped.match(/<span className="sr-only">\(ouvre dans un nouvel onglet\)<\/span>/g) ??
					[];
				expect(
					srOnlyNotices.length,
					`${file} — un texte sr-only « (ouvre dans un nouvel onglet) » par ExternalLink`,
				).toBe(icons.length);
			}
		}
	});
});
