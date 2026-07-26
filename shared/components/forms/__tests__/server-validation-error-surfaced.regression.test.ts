/**
 * @regression server-validation-error-surfaced — un échec de validation serveur
 * n'est jamais muet.
 *
 * Bug corrigé (audit formulaires 2026-07-26) : `createToastCallbacks` supprime
 * délibérément le toast quand `status === VALIDATION_ERROR`
 * (`shared/utils/create-toast-callbacks.ts`, « already shown inline by form
 * fields ») et `withCallbacks` dismisse le toast `loading` dans `onEnd`. Sur un
 * formulaire qui ne rend pas l'état serveur, l'utilisateur voyait donc
 * « Enregistrement… » disparaître SANS aucun message : il croyait avoir
 * enregistré. ~20 formulaires étaient dans ce cas, dont la création de
 * remboursement (opération monétaire), la mise à jour du suivi de commande et le
 * bandeau d'annonce (aucun validateur client ⇒ le serveur était le seul filet).
 *
 * Ce garde-fou scanne les composants de formulaire et échoue si l'un d'eux
 * déclenche une Server Action passée par `createToastCallbacks` sans rendre au
 * moins une surface d'erreur serveur :
 *   - `useServerFieldErrors` + `FormServerErrorAlert` (voie recommandée), ou
 *   - une lecture explicite de `state.message` / `state?.message`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

const SCAN_DIRS = ["app", "modules", "shared"];
const SKIP_DIRS = new Set(["node_modules", "__tests__", "generated", ".next"]);

/**
 * Composants qui déclenchent une action SANS saisie utilisateur (confirmations,
 * bascules de statut) : leur payload est un id construit par le code, une
 * VALIDATION_ERROR y est donc un bug serveur, pas une saisie à corriger. Le toast
 * d'erreur générique suffit.
 *
 * Toute addition ici exige une justification explicite.
 */
const ALLOWLIST = new Map<string, string>([
	[
		"modules/reviews/components/admin/review-response-actions.tsx",
		"Menu d'actions (publier/masquer) — aucun champ saisi.",
	],
]);

/** Le composant rend un `<form>`. */
const RENDERS_FORM = /<form[\s>]/;

/**
 * Le formulaire contient un champ que l'utilisateur remplit — c'est ce qui rend
 * une VALIDATION_ERROR actionnable. Un `<form>` qui n'emballe qu'un bouton de
 * confirmation (supprimer, marquer comme expédiée…) soumet un id construit par le
 * code : une erreur de validation y est un bug serveur, le toast générique suffit.
 */
const HAS_USER_INPUT =
	/<form\.AppField|form\.AppField|<Input\b|<Textarea\b|<NativeSelect\b|<SelectTrigger\b|<RatingField\b|field\.[A-Z]\w*Field\b/;

/** Le composant est branché sur une action passée par le pipeline toast. */
const USES_TOAST_PIPELINE = /createToastCallbacks|useActionState|action=\{/;

/** Au moins une surface d'erreur serveur est rendue. */
const SURFACES_SERVER_ERROR =
	/useServerFieldErrors|FormServerErrorAlert|state\?\.message|state\.message/;

/**
 * Neutralise les commentaires ligne par ligne (lignes vidées, pas supprimées,
 * pour garder les numéros de ligne exacts). Line-wise volontairement : un
 * stripper naïf sur `/* … *\/` avale du code réel dès qu'un `/*` apparaît dans un
 * commentaire `//`.
 */
function stripComments(source: string): string {
	return source
		.split("\n")
		.map((line) => {
			const trimmed = line.trimStart();
			if (/^(\/\/|\/\*|\*)/.test(trimmed)) return "";
			return line.replace(/(^|[^:])\/\/.*$/, "$1");
		})
		.join("\n");
}

function collectComponentFiles(): string[] {
	const files: string[] = [];

	function walk(absDir: string) {
		for (const entry of readdirSync(absDir)) {
			if (SKIP_DIRS.has(entry)) continue;
			const abs = join(absDir, entry);
			if (statSync(abs).isDirectory()) {
				walk(abs);
				continue;
			}
			if (!entry.endsWith(".tsx") || /\.(test|spec)\.tsx$/.test(entry)) continue;
			files.push(relative(REPO_ROOT, abs).split(sep).join("/"));
		}
	}

	for (const dir of SCAN_DIRS) walk(join(REPO_ROOT, dir));
	return files.sort();
}

describe("@regression server-validation-error-surfaced", () => {
	const files = collectComponentFiles();

	it("scans a meaningful number of components", () => {
		// Sanity check : si le walker casse, le test passerait à vide.
		expect(files.length).toBeGreaterThan(300);
	});

	it("every form wired to a Server Action renders a server-error surface", () => {
		const offenders: string[] = [];

		for (const relativePath of files) {
			if (ALLOWLIST.has(relativePath)) continue;
			const source = stripComments(readFileSync(join(REPO_ROOT, relativePath), "utf-8"));
			if (!RENDERS_FORM.test(source)) continue;
			if (!HAS_USER_INPUT.test(source)) continue;
			if (!USES_TOAST_PIPELINE.test(source)) continue;
			if (SURFACES_SERVER_ERROR.test(source)) continue;
			offenders.push(relativePath);
		}

		expect(
			offenders,
			`Ces formulaires avalent les VALIDATION_ERROR serveur : ` +
				`\`createToastCallbacks\` les retire du toast en supposant un affichage inline, ` +
				`et rien ne les rend ici — l'échec est donc totalement silencieux.\n` +
				`Câbler \`useServerFieldErrors({ state })\` + \`<FormServerErrorAlert errors={serverErrors} />\` ` +
				`(cf. modules/skus/components/admin/create-sku-form.tsx).\n` +
				`Si le formulaire n'a aucune saisie utilisateur, l'ajouter à ALLOWLIST avec justification.\n` +
				`Fautifs : ${offenders.join(", ")}`,
		).toEqual([]);
	});
});
