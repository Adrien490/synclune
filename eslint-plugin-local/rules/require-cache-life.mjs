/**
 * Rule: require-cache-life
 *
 * Toute fonction contenant la directive `"use cache"` ou `"use cache: private"`
 * doit appeler `cacheLife(...)` ou un helper respectant la convention `cacheXxx(...)`
 * (ex: cacheDashboard, cacheProducts, cacheProductDetail) pour définir un profil TTL.
 *
 * Sans cacheLife, Next.js 16 applique des defaults implicites (15s → 1an) et le
 * comportement devient imprévisible — on perd le contrôle de la fraîcheur.
 */

const HELPER_PATTERN = /^cache[A-Z]/;

function isUseCacheDirective(statement) {
	if (statement.type !== "ExpressionStatement") return false;
	const expr = statement.expression;
	if (expr.type !== "Literal") return false;
	if (typeof expr.value !== "string") return false;
	return expr.value === "use cache" || expr.value.startsWith("use cache:");
}

function hasCacheLifeCall(body) {
	let found = false;
	function visit(node) {
		if (found || !node || typeof node !== "object") return;
		if (node.type === "CallExpression") {
			const callee = node.callee;
			if (callee.type === "Identifier") {
				const name = callee.name;
				if (name === "cacheLife" || HELPER_PATTERN.test(name)) {
					found = true;
					return;
				}
			}
		}
		for (const key in node) {
			if (key === "parent" || key === "loc" || key === "range") continue;
			const value = node[key];
			if (Array.isArray(value)) {
				for (const item of value) visit(item);
			} else if (value && typeof value === "object" && typeof value.type === "string") {
				visit(value);
			}
		}
	}
	visit(body);
	return found;
}

export default {
	meta: {
		type: "problem",
		docs: {
			description:
				"Requires cacheLife() or a cacheXxx() helper in every function marked with 'use cache'",
		},
		messages: {
			missingCacheLife:
				"Fonction marquée \"use cache\" sans appel à cacheLife() ni helper cacheXxx(). Définis un profil TTL explicite (ex: cacheLife('products'), cacheDashboard(tag)).",
		},
		schema: [],
	},
	create(context) {
		function checkFunction(node) {
			const body = node.body;
			if (!body || body.type !== "BlockStatement") return;

			const directives = body.body.filter(isUseCacheDirective);
			if (directives.length === 0) return;

			if (!hasCacheLifeCall(body)) {
				context.report({ node: directives[0], messageId: "missingCacheLife" });
			}
		}

		return {
			FunctionDeclaration: checkFunction,
			FunctionExpression: checkFunction,
			ArrowFunctionExpression: checkFunction,
		};
	},
};
