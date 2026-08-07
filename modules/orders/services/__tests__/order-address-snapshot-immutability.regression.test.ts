import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression order-address-snapshot-immutability-2026-05-28
 *
 * Garantit que le snapshot d'identité et de destination d'une `Order`
 * (`customer*` + `shipping*`) ne soit réécrit QUE par les writers audités.
 * Une commande créée en mars avec l'adresse X doit rester avec l'adresse X
 * (Art. L102 B LPF — la facture est une donnée figée).
 *
 * ⚠️ Il n'y a jamais eu de modèle `Address` en base, et il n'y a plus de carnet
 * d'adresses client depuis le retrait de l'espace client (2026-07-31) :
 * `modules/addresses` ne porte que l'autocomplétion (BAN + Geoapify), qui n'écrit
 * rien. Le snapshot dénormalisé sur `Order` est la SEULE forme d'adresse du
 * domaine — la 3ᵉ assertion en fait un invariant plutôt qu'un état de fait.
 *
 * Cf. CLAUDE.md § "Facturation électronique — invariants" #5.
 *
 * Risque réglementaire si la garde saute : une réécriture non auditée fait
 * diverger la commande de sa facture ARCHIVÉE — laquelle est scellée sous SHA-256
 * et re-vérifiée à chaque téléchargement (EINV-PDF-006) — et prive l'Art. L123-22
 * C. com. de sa trace.
 *
 * Allowlist documentée (exceptions légitimes auditées) :
 *  - `order-creation.service.ts` : snapshot initial au checkout (post-PaymentIntent
 *    succeeded) — figé une fois pour toutes.
 *  - `update-pending-order-shipping-snapshot.service.ts` : correction CLIENT d'une
 *    commande encore PENDING (KI-001), sous l'advisory lock `orderPaid`.
 *  - `update-order-customer-info.ts` : correction admin de l'identité (typo email/nom),
 *    bloquée dès `invoiceNumber !== null`.
 *  - `update-order-shipping-address.ts` : correction admin pre-shipment (bloque si
 *    `status IN (SHIPPED, DELIVERED, RETURNED)`, si un avoir est émis, ou si la
 *    facture est numérotée sans archive) — écrit par indirection de variable, donc
 *    hors du champ du scanner ; couvert par les assertions dédiées plus bas.
 *
 * ⚠️ `anonymize-user.service.ts` a quitté cette liste avec le module `users`
 * (2026-07-31) : sans compte client, aucun compte à anonymiser.
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

/**
 * Les 10 colonnes de snapshot d'identité/destination d'`Order` (`prisma/schema.prisma`).
 *
 * ⚠️ Il n'y a PLUS de bloc `billing*` : les 9 colonnes ont été droppées le 2026-08-04
 * (`20260804160000_order_rightsizing_drop_dead_columns`) — en B2C de vente à distance
 * l'adresse de facturation EST l'adresse de livraison, et `buildBillingAddress` est
 * l'identité. Ne pas les ré-ajouter ici sans ré-ajouter les colonnes.
 *
 * ⚠️ `customerEmail`/`customerName` ont été ajoutés le 2026-08-07 (audit invariant 5) :
 * ce scanner ne couvrait que `shipping*`, si bien qu'`update-order-customer-info.ts`
 * réécrivait l'identité figée d'une commande **inline**, sans être allowlisté — parce
 * qu'il était invisible. Tout nouveau writer de l'identité l'aurait été aussi.
 *
 * La parité de cette liste avec le schéma est verrouillée par
 * `modules/payments/services/__tests__/order-snapshot-column-parity.regression.test.ts`.
 */
const ADDRESS_FIELDS = [
	// Identité client
	"customerEmail",
	"customerName",
	// Destination
	"shippingFirstName",
	"shippingLastName",
	"shippingAddress1",
	"shippingAddress2",
	"shippingPostalCode",
	"shippingCity",
	"shippingCountry",
	"shippingPhone",
];

function stripCommentsForScan(content: string): string {
	return content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * Extrait le fragment délimité par la paire ouvrante/fermante commençant à `openIdx`.
 * Rend `null` si la source est déséquilibrée (fichier tronqué).
 */
function extractBalanced(source: string, openIdx: number, open: string, close: string) {
	let depth = 0;
	for (let i = openIdx; i < source.length; i++) {
		if (source[i] === open) depth++;
		else if (source[i] === close) {
			depth--;
			if (depth === 0) return source.slice(openIdx, i + 1);
		}
	}
	return null;
}

/** Tous les blocs `data: { … }` balancés contenus dans `source`. */
function extractDataBlocks(source: string): string[] {
	const blocks: string[] = [];
	const dataOpenRegex = /\bdata\s*:\s*\{/g;
	let match: RegExpExecArray | null;
	while ((match = dataOpenRegex.exec(source)) !== null) {
		const block = extractBalanced(source, match.index + match[0].length - 1, "{", "}");
		if (block) blocks.push(block);
	}
	return blocks;
}

/**
 * Détecte les `data: { ... }` inline contenant un champ de snapshot non-primitif,
 * **dans les arguments d'un appel d'écriture Prisma sur `Order`**.
 *
 * ⚠️ La portée est le point délicat, et il a coûté un faux positif : la première
 * version se contentait de vérifier qu'un `prisma|tx.order.<write>(` existait
 * QUELQUE PART dans le fichier, puis scannait TOUS les `data: {` du fichier.
 * Tant que la liste ne portait que des `shipping*`, aucun payload non-Prisma ne
 * les nommait. En y ajoutant `customerEmail`/`customerName` (2026-08-07), le
 * scanner a immédiatement accusé `modules/webhooks/handlers/dispute-handlers.ts`,
 * dont le `data:` incriminé est la charge utile d'une **alerte email**
 * (`type: "ADMIN_DISPUTE_ALERT"`), pas une écriture. L'allowlister aurait été le
 * mauvais réflexe : ça aurait masqué une VRAIE écriture ultérieure dans ce fichier.
 * On extrait donc d'abord les arguments de chaque appel d'écriture, et on ne
 * cherche les blocs `data:` QUE dedans.
 *
 * Le cas `data: sanitizedData` (variable extraite) N'EST PAS détecté par ce
 * scanner — c'est intentionnel, car l'action d'update d'adresse admin utilise ce
 * pattern. Elle est sécurisée par l'audit trail (test plus bas).
 *
 * Le risque réel à prévenir = un dev qui inline `data: { shippingFirstName: x }`
 * dans une nouvelle action / cron / service non-allowlisté.
 */
function findInlineAddressWritesInOrderData(content: string): boolean {
	const stripped = stripCommentsForScan(content);

	const fieldPattern = new RegExp(
		`\\b(?:${ADDRESS_FIELDS.join("|")})\\s*:\\s*(?!true\\b|false\\b|null\\b)`,
	);

	const writeCallRegex = /\b(?:prisma|tx)\.order\.(?:create|update|updateMany|upsert)\s*\(/g;
	let match: RegExpExecArray | null;
	while ((match = writeCallRegex.exec(stripped)) !== null) {
		// Arguments de l'appel uniquement — pas le reste du fichier.
		const args = extractBalanced(stripped, match.index + match[0].length - 1, "(", ")");
		if (!args) continue;
		if (extractDataBlocks(args).some((block) => fieldPattern.test(block))) return true;
	}
	return false;
}

describe("Facturation — snapshots adresses Order immuables (Invariant #5)", () => {
	it("only allowlisted services inline shipping* in an Order data block", () => {
		const writers = allSourceFiles
			.filter((f) => findInlineAddressWritesInOrderData(readFileSync(f, "utf-8")))
			.map(relPath)
			.sort();

		// Allowlist documentée — inline writes uniquement (data: { ... }).
		// Le pattern `data: variableName` (sanitizedData) est utilisé par
		// `update-order-shipping-address.ts` — non détecté par ce scanner mais
		// sécurisé par le test audit trail ci-dessous.
		// (Il n'y a plus qu'UNE action d'adresse : `update-order-billing-address.ts`
		// est parti avec les 9 colonnes `billing*` le 2026-08-04.)
		const allowed = [
			// Snapshot initial au checkout (post-PaymentIntent succeeded)
			"modules/payments/services/order-creation.service.ts",
			// Correction client d'une commande ENCORE PENDING (KI-001, 2026-07-30) :
			// paymentStatus re-lu sous l'advisory lock `orderPaid`, aucun champ de montant
			// touché, audit `ADDRESS_UPDATED` obligatoire. Une commande PENDING n'est pas
			// encore une pièce comptable — c'est ce qui rend la réécriture légitime.
			"modules/orders/services/update-pending-order-shipping-snapshot.service.ts",
			// Correction admin de l'identité client (typo email/nom au support), gatée sur
			// `invoiceNumber !== null` : une fois la facture émise, l'identité imprimée est
			// figée (Art. 286 CGI) et l'avoir est rendu depuis ces mêmes colonnes.
			"modules/orders/actions/update-order-customer-info.ts",
			// ⚠️ `modules/users/services/anonymize-user.service.ts` (anonymisation RGPD
			// Art. 17) a quitté cette allowlist avec le module `users` entier, au retrait
			// de l'espace client (2026-07-31) : sans compte client, aucun compte à
			// anonymiser. Le scrub des `shipping*` d'une commande n'est plus déclenché
			// que par la purge à `paidAt + 10 ans` (`hard-delete-retention`), qui écrit
			// via le contrat de champs SSOT `modules/orders/constants/pii-scrub.ts` — donc
			// par indirection de variable, hors du champ de ce scanner (cf. le test de
			// contrat `purge-pii-scrub-contract.regression.test.ts`, qui le couvre).
		].sort();

		expect(writers).toEqual(allowed);
	});

	it("address update actions exist and write via variable indirection (allowlisted)", () => {
		// Vérifie l'existence de l'action admin d'adresse et son pattern attendu : un
		// `data: <variableName>` (jamais inline). Si quelqu'un refactore vers
		// `data: { shippingFirstName: ... }` inline, le test précédent l'attrapera
		// comme nouveau writer → forcera mise à jour de l'allowlist.
		const actions = ["modules/orders/actions/update-order-shipping-address.ts"];
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
			/orders\s*:\s*\{\s*(?:update|updateMany|upsert)[\s\S]{0,500}?\b(?:shippingFirstName|shippingAddress1)\b/;
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
		// Sécurité supplémentaire : si un writer perd son `createOrderAuditTx`, la
		// modification serait silencieuse — violation Art. L123-22 C. com. (audit
		// trail obligatoire pour toute mutation post-paiement). On vérifie que les
		// 3 writers réécrivant un snapshot existant continuent à poser un audit log.
		// (`order-creation.service.ts` en est exclu : il CRÉE le snapshot, et
		// l'absence d'`OrderHistory` à la création est délibérée — cf. son docblock.)
		const actionFiles = [
			"modules/orders/actions/update-order-shipping-address.ts",
			"modules/orders/actions/update-order-customer-info.ts",
			// Writer client (KI-001) : même exigence d'audit trail que les actions admin.
			"modules/orders/services/update-pending-order-shipping-snapshot.service.ts",
		];
		for (const rel of actionFiles) {
			const content = readFileSync(join(REPO_ROOT, rel), "utf-8");
			expect(content).toMatch(/createOrderAuditTx\s*\(/);
			expect(content).toMatch(/action\s*:\s*"ADDRESS_UPDATED"/);
		}
	});

	it("the customer-facing snapshot writer only ever touches a PENDING order, under the paid lock", () => {
		// Les 3 gardes qui rendent cette réécriture légitime vivent dans le même fichier.
		// Si l'une disparaît, le snapshot d'une commande PAYÉE devient réécrivable — donc
		// une pièce comptable mutable (Art. L102 B LPF).
		const rel = "modules/orders/services/update-pending-order-shipping-snapshot.service.ts";
		const content = readFileSync(join(REPO_ROOT, rel), "utf-8");

		// 1. Sérialisation sur le MÊME verrou que la transition PAID.
		expect(content).toMatch(/acquireOrderPaidLockTx\s*\(\s*tx\s*,/);
		// 2. Statut re-vérifié (et non pas seulement lu par l'appelant).
		expect(content).toMatch(/paymentStatus\s*!==\s*"PENDING"/);
		// 3. Aucun champ de montant dans l'écriture.
		//
		// ⚠️ Extraction par accolades BALANCÉES, pas par regex. La version d'avant
		// fermait le bloc sur `/\n\t\t\t\}/` — soit exactement trois tabulations :
		// un simple reformat (ou l'ajout d'un niveau d'imbrication) rendait
		// `dataBlock === ""`, et `expect("").not.toMatch(…)` passe au vert sans rien
		// vérifier. Une assertion qui ne peut plus échouer ne protège rien.
		const forbiddenMoneyFields = /\b(?:total|subtotal|shippingCost|discountAmount|taxAmount)\s*:/;
		const dataBlocks = extractDataBlocks(stripCommentsForScan(content));
		expect(dataBlocks.length).toBeGreaterThan(0);
		for (const block of dataBlocks) {
			expect(block).not.toMatch(forbiddenMoneyFields);
		}
	});
});
