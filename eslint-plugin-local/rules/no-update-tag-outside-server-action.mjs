/**
 * Rule: no-update-tag-outside-server-action
 *
 * `updateTag` (next/cache) ne peut être appelé QUE depuis une Server Action.
 * Partout ailleurs — route handler, cron, webhook, callback `after()`, hook
 * Better Auth — Next 16 **throw** :
 *
 *   node_modules/next/dist/server/web/spec-extension/revalidate.js:53
 *   if (!workStore || workStore.page.endsWith('/route')) { throw ... } // E872
 *
 * Le test porte sur la ROUTE en cours d'exécution, pas sur le module où l'appel
 * est écrit : déléguer à un `services/` ne protège de rien. Un service invoqué
 * depuis `app/api/cron/<job>/route.ts` verra `page` finir par `/route`.
 *
 * Cette règle approxime « est-ce une Server Action ? » par la présence de la
 * directive `"use server"` en tête de fichier — c'est la seule forme utilisée
 * dans ce repo (aucune Server Action inline `"use server"` en corps de fonction).
 * Un fichier sans cette directive ne peut PAS garantir le contexte d'appel :
 * il doit utiliser `revalidateTagsInBackground` (`@/shared/lib/cache`).
 *
 * Historique : audit « usage correct du cache Next.js » 2026-07-31. La migration
 * intégrale `revalidateTag` → `updateTag` (audit 2026-07-06) avait emporté 14
 * fichiers non-`"use server"` ; conséquence, plus AUCUNE invalidation ne
 * s'exécutait après un paiement Stripe ni dans les crons. Invisible en test :
 * 247 fichiers `vi.mock("next/cache")` remplacent `updateTag` par un `vi.fn()`
 * qui ne throw jamais.
 */

const NEXT_CACHE_MODULE = "next/cache";
const FORBIDDEN_IMPORT = "updateTag";
const REPLACEMENT = "revalidateTagsInBackground";

/** `"use server"` en tête de fichier (Program.body directives). */
function hasUseServerDirective(program) {
	for (const statement of program.body) {
		if (statement.type !== "ExpressionStatement") break;
		const expr = statement.expression;
		if (expr.type !== "Literal" || typeof expr.value !== "string") break;
		if (expr.value === "use server") return true;
	}
	return false;
}

export default {
	meta: {
		type: "problem",
		docs: {
			description:
				"Forbids importing updateTag from next/cache outside a 'use server' file — it throws (E872) in route handlers, crons and webhooks",
		},
		messages: {
			updateTagOutsideServerAction:
				'`updateTag` throw hors Server Action (E872 — Next teste la route en cours, pas le module). Ce fichier n\'a pas de directive "use server" : il peut être atteint depuis un route handler (cron, webhook, `after()`). Utilise `{{replacement}}` de `@/shared/lib/cache`.',
		},
		schema: [],
	},
	create(context) {
		const sourceCode = context.sourceCode ?? context.getSourceCode();
		let fileIsServerAction = false;

		function report(node) {
			if (fileIsServerAction) return;
			context.report({
				node,
				messageId: "updateTagOutsideServerAction",
				data: { replacement: REPLACEMENT },
			});
		}

		return {
			Program(node) {
				fileIsServerAction = hasUseServerDirective(node);
			},

			// import { updateTag } from "next/cache"
			ImportDeclaration(node) {
				if (node.source.value !== NEXT_CACHE_MODULE) return;
				for (const specifier of node.specifiers) {
					if (
						specifier.type === "ImportSpecifier" &&
						specifier.imported.name === FORBIDDEN_IMPORT
					) {
						report(specifier);
					}
				}
			},

			// const { updateTag } = await import("next/cache")
			// Le repo utilise cette forme pour casser des cycles de dépendances
			// (post-login-merge) — elle échappe à ImportDeclaration.
			ImportExpression(node) {
				if (node.source.type !== "Literal" || node.source.value !== NEXT_CACHE_MODULE) return;

				// Remonte jusqu'au VariableDeclarator qui déstructure le module.
				let current = node.parent;
				while (
					current &&
					current.type !== "VariableDeclarator" &&
					current.type !== "ExpressionStatement"
				) {
					current = current.parent;
				}
				if (!current || current.type !== "VariableDeclarator") return;
				if (current.id.type !== "ObjectPattern") return;

				for (const property of current.id.properties) {
					if (
						property.type === "Property" &&
						property.key.type === "Identifier" &&
						property.key.name === FORBIDDEN_IMPORT
					) {
						report(property);
					}
				}
			},

			// Filet : appel nu `updateTag(...)` sans import visible (ré-export, global).
			CallExpression(node) {
				if (node.callee.type !== "Identifier") return;
				if (node.callee.name !== FORBIDDEN_IMPORT) return;
				// Ne rapporte que si l'identifiant n'est pas déjà signalé à l'import,
				// c.-à-d. s'il n'est lié à aucune déclaration du fichier.
				const scope = sourceCode.getScope ? sourceCode.getScope(node) : context.getScope();
				const variable = scope.references.find((ref) => ref.identifier === node.callee)?.resolved;
				if (variable) return;
				report(node);
			},
		};
	},
};
