import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression order-address-snapshot-immutability-2026-05-28
 *
 * Garantit que les snapshots adresses sur Order (`shipping*`, `billing*`) restent
 * isolés du modèle `Address` du client. Une mise à jour d'Address ne doit jamais
 * propager vers les Order historiques (Art. L102 B LPF — facture comme données
 * figées). Une commande créée en mars avec adresse X doit rester avec adresse X
 * même si le client modifie son Address en juillet.
 *
 * Cf. CLAUDE.md § "Facturation électronique — invariants" #5.
 *
 * Risque réglementaire si la garde saute : sync automatique Address → Order
 * casserait la facture comptable (PDF régénéré diverge → 503 hash mismatch sur
 * la route /api/orders/[orderNumber]/invoice) et invaliderait l'audit Art.
 * L123-22 C. com. (l'adresse de facturation est figée par l'émission).
 *
 * Allowlist documentée (exceptions légitimes auditées) :
 *  - `order-creation.service.ts` : snapshot initial au checkout (post-PaymentIntent
 *    succeeded) — figé une fois pour toutes.
 *  - `update-order-shipping-address.ts` : correction admin pre-shipment uniquement
 *    (bloque si `fulfillmentStatus IN (SHIPPED, DELIVERED, RETURNED)`), audit trail
 *    `ADDRESS_UPDATED` obligatoire — fix typo livraison avant expédition.
 *  - `update-order-billing-address.ts` : correction admin pre-shipment, idem.
 *  - `anonymize-user.service.ts` : anonymisation RGPD (droit à l'oubli Art. 17 GDPR),
 *    remplace PII par "X" / "Adresse supprimée" — conserve l'audit comptable
 *    (montants/dates) mais purge l'identité.
 */

const REPO_ROOT = process.cwd();

function walkTs(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (
			entry === "node_modules" ||
			entry === ".next" ||
			entry === "dist" ||
			entry === "generated" ||
			entry.startsWith(".")
		) {
			continue;
		}
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			walkTs(full, out);
		} else if (
			(entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
			!entry.endsWith(".test.ts") &&
			!entry.endsWith(".test.tsx") &&
			!entry.endsWith(".d.ts") &&
			!full.includes("/__tests__/") &&
			!full.includes("/__mocks__/")
		) {
			out.push(full);
		}
	}
	return out;
}

const allSourceFiles = [
	...walkTs(join(REPO_ROOT, "modules")),
	...walkTs(join(REPO_ROOT, "app")),
	...walkTs(join(REPO_ROOT, "shared")),
].filter((f) => !f.includes("/app/generated/"));

function relPath(abs: string): string {
	return relative(REPO_ROOT, abs).replaceAll("\\", "/");
}

const ADDRESS_FIELDS = [
	// Shipping snapshot
	"shippingFirstName",
	"shippingLastName",
	"shippingAddress1",
	"shippingAddress2",
	"shippingPostalCode",
	"shippingCity",
	"shippingCountry",
	"shippingPhone",
	// Billing snapshot
	"billingFirstName",
	"billingLastName",
	"billingAddress1",
	"billingAddress2",
	"billingPostalCode",
	"billingCity",
	"billingCountry",
	"billingPhone",
];

/**
 * Détecte les `data: { ... }` inline contenant un champ adresse non-primitif.
 * Approche brace-matching : pour chaque `data: {`, on extrait le bloc balancé,
 * puis on cherche un `<addr_field>: <value>` où value n'est pas `true|false|null`
 * (filtre les select clauses si jamais imbriquées).
 *
 * Le cas `data: sanitizedData` (variable extraite) N'EST PAS détecté par ce
 * scanner — c'est intentionnel, car les 2 actions d'update d'adresse admin
 * utilisent ce pattern. Elles sont sécurisées par l'audit trail (test plus bas).
 *
 * Le risque réel à prévenir = un dev qui inline `data: { shippingFirstName: x }`
 * dans une nouvelle action / cron / service non-allowlisté.
 */
function findInlineAddressWritesInOrderData(content: string): boolean {
	const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
	if (!/\b(?:prisma|tx)\.order\.(?:create|update|updateMany|upsert)\s*\(/.test(stripped))
		return false;

	const fieldPattern = new RegExp(
		`\\b(?:${ADDRESS_FIELDS.join("|")})\\s*:\\s*(?!true\\b|false\\b|null\\b)`,
	);

	const dataOpenRegex = /\bdata\s*:\s*\{/g;
	let match: RegExpExecArray | null;
	while ((match = dataOpenRegex.exec(stripped)) !== null) {
		// Extract balanced block starting at the `{` we just matched.
		const openIdx = match.index + match[0].length - 1; // position of `{`
		let depth = 0;
		let endIdx = -1;
		for (let i = openIdx; i < stripped.length; i++) {
			const ch = stripped[i];
			if (ch === "{") depth++;
			else if (ch === "}") {
				depth--;
				if (depth === 0) {
					endIdx = i;
					break;
				}
			}
		}
		if (endIdx === -1) continue;
		const block = stripped.slice(openIdx, endIdx + 1);
		if (fieldPattern.test(block)) return true;
	}
	return false;
}

describe("Facturation — snapshots adresses Order immuables (Invariant #5)", () => {
	it("only allowlisted services inline shipping*/billing* in an Order data block", () => {
		const writers = allSourceFiles
			.filter((f) => findInlineAddressWritesInOrderData(readFileSync(f, "utf-8")))
			.map(relPath)
			.sort();

		// Allowlist documentée — inline writes uniquement (data: { ... }).
		// Le pattern `data: variableName` (sanitizedData) est utilisé par les 2
		// actions update-order-*-address.ts — non détecté par ce scanner mais
		// sécurisé par le test audit trail ci-dessous.
		const allowed = [
			// Snapshot initial au checkout (post-PaymentIntent succeeded)
			"modules/payments/services/order-creation.service.ts",
			// Anonymisation RGPD (Art. 17 GDPR — droit à l'oubli)
			"modules/users/services/anonymize-user.service.ts",
		].sort();

		expect(writers).toEqual(allowed);
	});

	it("address update actions exist and write via variable indirection (allowlisted)", () => {
		// Vérifie l'existence des 2 actions admin et leur pattern attendu : un
		// `data: <variableName>` (jamais inline). Si quelqu'un refactore vers
		// `data: { shippingFirstName: ... }` inline, le test précédent l'attrapera
		// comme nouveau writer → forcera mise à jour de l'allowlist.
		const actions = [
			"modules/orders/actions/update-order-shipping-address.ts",
			"modules/orders/actions/update-order-billing-address.ts",
		];
		for (const rel of actions) {
			const content = readFileSync(join(REPO_ROOT, rel), "utf-8");
			expect(content).toMatch(/\b(?:prisma|tx)\.order\.update\s*\(/);
			// `data: <identifier>` — pas d'inline `data: {`. L'identifier porte la
			// data sanitizée (sanitizedData, newData, etc.).
			expect(content).toMatch(/data\s*:\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*,/);
		}
	});

	it("no source file syncs User.address → Order via nested user/address writes", () => {
		// Pattern à risque : `prisma.user.update({ data: { addresses: { ... }, orders: { ... } } })`
		// ou un script de migration qui propage Address changes vers Order.shipping*.
		// Aucun use case légitime — toute "sync" doit créer une NOUVELLE Order via checkout.
		const pattern =
			/orders\s*:\s*\{\s*(?:update|updateMany|upsert)[\s\S]{0,500}?\b(?:shippingFirstName|shippingAddress1|billingFirstName|billingAddress1)\b/;
		const offenders = allSourceFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
				return pattern.test(stripped);
			})
			.map(relPath)
			.sort();
		expect(offenders).toEqual([]);
	});

	it("address mutation actions enforce audit trail (createOrderAuditTx call)", () => {
		// Sécurité supplémentaire : si `update-order-*-address.ts` perd son
		// `createOrderAuditTx`, la modification serait silencieuse — violation
		// Art. L123-22 C. com. (audit trail obligatoire pour toute mutation
		// post-paiement). On vérifie que les 2 actions critiques continuent à
		// poser un audit log.
		const actionFiles = [
			"modules/orders/actions/update-order-shipping-address.ts",
			"modules/orders/actions/update-order-billing-address.ts",
		];
		for (const rel of actionFiles) {
			const content = readFileSync(join(REPO_ROOT, rel), "utf-8");
			expect(content).toMatch(/createOrderAuditTx\s*\(/);
			expect(content).toMatch(/action\s*:\s*"ADDRESS_UPDATED"/);
		}
	});
});
