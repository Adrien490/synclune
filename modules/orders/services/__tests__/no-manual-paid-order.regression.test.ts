import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression no-manual-paid-order-2026-05-28
 *
 * Garantit qu'aucune Server Action, route API arbitraire ou composant admin
 * ne crée une commande directement en `paymentStatus: PAID`. Toute commande
 * payée DOIT passer par le flow Stripe (PaymentIntent → webhook
 * `payment_intent.succeeded`) — c'est l'invariant qui empêche Synclune d'être
 * assimilé à un "logiciel de caisse" non conforme NF 525 + qui garantit l'audit
 * comptable Art. 286 / 289-I CGI (émission à l'encaissement avec preuve PSP).
 *
 * Cf. CLAUDE.md § "Facturation électronique — invariants" #8.
 *
 * Risque réglementaire si la garde saute : une action `recordCashSale` ou
 * `createManualOrder` créerait une Order PAID sans PaymentIntent. Pas de hook
 * `payment_intent.succeeded` → pas de `persistInvoiceNumber` eager → pas de
 * `recordSalesEReporting` → divergence DGFiP + risque qualification "logiciel
 * de caisse" requérant validation NF 525 préalable.
 *
 * Allowlist documentée pour les TRANSITIONS PENDING → PAID (vs création PAID) :
 *  - `modules/webhooks/services/checkout-order-processing.service.ts` : webhook
 *    Stripe checkout.session.completed / payment_intent.succeeded
 *  - `modules/orders/actions/mark-as-paid.ts` : admin fallback pour commandes
 *    déjà passées au PaymentIntent (paiement asynchrone qui n'a pas webhook —
 *    SEPA, virements). L'Order existe déjà avec stripePaymentIntentId, donc
 *    la preuve Stripe est conservée.
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
 * Scanner brace-matching : extrait chaque bloc `{ ... }` ouvert par `data: {`
 * dans un fichier, après vérification qu'il y a un appel `order.create|upsert`.
 * Retourne true si un de ces blocs inline `paymentStatus: "PAID"` ou
 * `paymentStatus: PaymentStatus.PAID`.
 */
function fileCreatesPaidOrderInline(content: string): boolean {
	const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
	if (!/\b(?:prisma|tx)\.order\.(?:create|upsert)\s*\(/.test(stripped)) return false;

	const paidPattern = /\bpaymentStatus\s*:\s*(?:PaymentStatus\.PAID\b|"PAID")/;

	const dataOpenRegex = /\bdata\s*:\s*\{/g;
	let match: RegExpExecArray | null;
	while ((match = dataOpenRegex.exec(stripped)) !== null) {
		const openIdx = match.index + match[0].length - 1;
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
		if (paidPattern.test(block)) return true;
	}
	return false;
}

describe("Facturation — pas de création manuelle de commande PAID (Invariant #8)", () => {
	it("no source file calls prisma.order.create with paymentStatus: PAID inline", () => {
		const offenders = allSourceFiles
			.filter((f) => fileCreatesPaidOrderInline(readFileSync(f, "utf-8")))
			.map(relPath)
			.sort();
		expect(offenders).toEqual([]);
	});

	it("only allowlisted services transition Order → PAID (paymentStatus + paidAt write)", () => {
		// Heuristique robuste : tout WRITE de `paymentStatus: PAID` est canoniquement
		// accompagné de `paidAt: new Date()` à proximité (≤ 8 lignes). Les READS
		// (filtres `where:`) n'ont pas ce voisin. Cette heuristique capture aussi
		// le pattern `processOrderAtomically(tx, id, { paymentStatus: PAID, paidAt })`
		// où l'écriture se fait via variable indirection (data: orderUpdateData).
		const stripped = (content: string) =>
			content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
		const paidLineRegex = /\bpaymentStatus\s*:\s*(?:PaymentStatus\.PAID\b|"PAID")/;
		const paidAtRegex = /\bpaidAt\s*:\s*new\s+Date\s*\(/;

		const writers = allSourceFiles
			.filter((f) => {
				const content = stripped(readFileSync(f, "utf-8"));
				const lines = content.split("\n");
				for (let i = 0; i < lines.length; i++) {
					if (!paidLineRegex.test(lines[i]!)) continue;
					const window = lines.slice(Math.max(0, i - 8), i + 9).join("\n");
					if (paidAtRegex.test(window)) return true;
				}
				return false;
			})
			.map(relPath)
			.sort();

		const allowed = [
			// Admin fallback pour paiements asynchrones non-webhookés (SEPA, etc.)
			"modules/orders/actions/mark-as-paid.ts",
			// Webhook Stripe checkout.session.completed + payment_intent.succeeded
			"modules/webhooks/services/checkout-order-processing.service.ts",
		].sort();

		expect(writers).toEqual(allowed);
	});

	it("mark-as-paid action enforces existing PaymentIntent (no cash sale shortcut)", () => {
		// L'admin ne doit JAMAIS créer une commande PAID ex nihilo. mark-as-paid
		// suppose une Order existante née d'un PaymentIntent Stripe (seule preuve
		// de paiement depuis le retrait du flow Checkout Session hosted) — sinon
		// l'invariant #8 saute (logiciel de caisse).
		const content = readFileSync(
			join(REPO_ROOT, "modules/orders/actions/mark-as-paid.ts"),
			"utf-8",
		);
		// Doit refuser le passage si commande déjà PAID (idempotence) — pas créer.
		expect(content).toMatch(/already_paid/);
		// Doit refuser si commande CANCELLED — preuve qu'on opère sur une Order
		// existante (pas de création de toute pièce).
		expect(content).toMatch(/cancelled/);
		// Doit lire `stripePaymentIntentId` — confirme que l'Order doit avoir
		// transité par un PaymentIntent Stripe.
		expect(content).toMatch(/stripePaymentIntentId/);
		// EINV-CASH-001 : doit REFUSER explicitement toute Order sans preuve Stripe
		// (PaymentIntent absent) — empêche un encaissement fictif.
		expect(content).toMatch(/no_stripe_proof/);
		expect(content).toMatch(/if\s*\(\s*!\s*found\.stripePaymentIntentId\s*\)/);
	});

	it("markOrderAsPaid (déprécié, supprimé 2026-07-03) is not reintroduced anywhere", () => {
		// EINV-CASH-003 : markOrderAsPaid écrivait `PAID + paidAt` SANS décrément stock,
		// clear cart, persistInvoiceNumber ni recordSalesEReporting — une Order PAID
		// sans facture ni e-reporting → oversell + divergence DGFiP silencieuse
		// (Art. 286 / 289-I CGI). La fonction a été SUPPRIMÉE (audit cache 2026-07-03,
		// dernier mutateur de statut sans invalidation cache) ; ce test interdit sa
		// réintroduction sous le même nom. Le remplaçant canonique est
		// `processOrderFromPaymentIntent` (idempotent + décrément + facture).
		const stripComments = (c: string) =>
			c.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
		const offenders = allSourceFiles
			.map(relPath)
			.filter((rel) =>
				/\bmarkOrderAsPaid\b/.test(stripComments(readFileSync(join(REPO_ROOT, rel), "utf-8"))),
			)
			.sort();
		expect(offenders).toEqual([]);
	});

	it("no source file exports a function named recordCashSale / createManualOrder", () => {
		// Hint sémantique : si quelqu'un nomme une nouvelle action de cette manière,
		// le test échoue et force une revue. Le naming est volontairement spécifique
		// à des patterns qui violeraient typiquement l'invariant #8.
		const offenders = allSourceFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				return /\bexport\s+(?:async\s+)?function\s+(?:recordCashSale|createManualOrder|recordOfflineSale|createOfflineOrder)\b/.test(
					content,
				);
			})
			.map(relPath)
			.sort();
		expect(offenders).toEqual([]);
	});
});
