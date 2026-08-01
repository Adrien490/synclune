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
 * risque qualification "logiciel
 * de caisse" requérant validation NF 525 préalable.
 *
 * Allowlist documentée pour les TRANSITIONS PENDING → PAID (vs création PAID) :
 *  - `modules/webhooks/services/checkout-order-processing.service.ts` : webhook
 *    Stripe `payment_intent.succeeded` (le flow est Elements/PaymentIntents —
 *    aucun `checkout.session.*` n'est jamais émis, cf. le commentaire de
 *    `modules/webhooks/utils/event-registry.ts`)
 *  - `modules/orders/actions/mark-as-paid.ts` : admin fallback pour commandes
 *    déjà passées au PaymentIntent (paiement asynchrone qui n'a pas webhook —
 *    SEPA, virements). L'Order existe déjà avec stripePaymentIntentId, donc
 *    la preuve Stripe est conservée.
 *
 * ── Durcissement du 2026-07-31 (audit invariant #8) ───────────────────────────
 * L'identification des writers PAID reposait sur une SEULE heuristique : la
 * proximité `paidAt: new Date(` à ±8 lignes. Trois angles morts en découlaient,
 * fermés ici :
 *   1. un writer posant `paidAt` via variable ou à plus de 8 lignes passait ;
 *   2. `export const recordCashSale = async () => {}` échappait au tripwire de
 *      nommage, qui ne matchait que les déclarations `function` ;
 *   3. rien n'allowlistait `order.create` LUI-MÊME — seuls les `create` portant
 *      `paymentStatus: PAID` inline étaient rejetés, alors que le fichier voisin
 *      `order-item-snapshot-immutability.regression.test.ts` fait déjà cette
 *      assertion pour `orderItem.create`.
 *
 * Ce scan reste statique, donc aveugle au SQL brut. Le filet correspondant vit
 * en base depuis la migration 20260731120000 (CHECK `Order_paid_requires_
 * stripe_proof`), dont la présence est vérifiée plus bas et le comportement par
 * `order-paid-requires-stripe-proof.integration.test.ts`.
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

const stripComments = (content: string): string =>
	content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const PAID_VALUE = /\bpaymentStatus\s*:\s*(?:PaymentStatus\.PAID\b|"PAID")/;

/**
 * Scanner brace-matching : extrait chaque bloc `{ ... }` ouvert par `data: {`
 * dans un fichier, après vérification qu'il contient un appel `order.<verb>`.
 * Retourne true si un de ces blocs inline `paymentStatus: PAID`.
 *
 * `verbs` couvre par défaut TOUTES les écritures (pas seulement `create`) : un
 * `updateMany` qui bascule un lot en PAID est aussi une vente manuelle qu'un
 * `create`, et n'était couvert que par l'heuristique de proximité `paidAt`.
 */
function fileWritesPaidOrderInline(
	content: string,
	verbs = "create|upsert|update|updateMany",
): boolean {
	const stripped = stripComments(content);
	if (!new RegExp(String.raw`\b(?:prisma|tx)\.order\.(?:${verbs})\s*\(`).test(stripped)) {
		return false;
	}

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
		if (PAID_VALUE.test(block)) return true;
	}
	return false;
}

/** Les deux seuls fichiers autorisés à faire transiter une commande vers PAID. */
const PAID_WRITER_ALLOWLIST = [
	// Admin fallback pour paiements asynchrones non-webhookés (SEPA, etc.)
	"modules/orders/actions/mark-as-paid.ts",
	// Webhook Stripe payment_intent.succeeded
	"modules/webhooks/services/checkout-order-processing.service.ts",
].sort();

describe("Facturation — pas de création manuelle de commande PAID (Invariant #8)", () => {
	it("no source file writes paymentStatus: PAID in an order.create/upsert/update data block", () => {
		// Assertion structurelle : elle ne dépend d'aucun voisinage de lignes, donc
		// elle survit à un writer qui poserait `paidAt` autrement. Couvre les 4
		// verbes d'écriture, pas seulement `create`.
		//
		// Assertion en SOUS-ENSEMBLE, pas en égalité : seul `mark-as-paid` inline
		// aujourd'hui son bloc `data` (le webhook passe par une variable
		// `orderUpdateData`, invisible au brace-matcher — c'est l'assertion
		// suivante qui le couvre). Exiger l'égalité rendrait ce test rouge le jour
		// où un fichier ALLOWLISTÉ change de style, ce qui n'est pas la régression
		// qu'on garde.
		const offenders = allSourceFiles
			.filter((f) => fileWritesPaidOrderInline(readFileSync(f, "utf-8")))
			.map(relPath)
			.filter((rel) => !PAID_WRITER_ALLOWLIST.includes(rel))
			.sort();
		expect(offenders).toEqual([]);
	});

	it("only allowlisted services transition Order → PAID (paymentStatus + paidAt write)", () => {
		// Heuristique COMPLÉMENTAIRE de la précédente, pas redondante : elle seule
		// attrape le pattern `processOrderAtomically(tx, id, { paymentStatus: PAID,
		// paidAt })` où l'objet est construit dans une variable, hors de tout
		// `data: {` — la brace-matcher ne le voit pas.
		//
		// L'ancre accepte désormais toute valeur de type Date (`new Date()`, une
		// variable, un champ calculé) là où elle n'acceptait que `new Date(` — un
		// writer ayant calculé sa date en amont passait. Les formes exclues sont
		// exactement la syntaxe de LECTURE, et chacune produit un faux positif
		// réel dans le repo si on l'oublie :
		//   `paidAt: { lt: … }`  filtre `where`  (get-action-items, invoicing-overview)
		//   `paidAt: true`       projection `select`
		//   `paidAt: "desc"`     clé `orderBy`
		//
		// ⚠️ Le `\s*` est DANS le lookahead, pas devant : écrit `paidAt\s*:\s*(?!\{)`,
		// le moteur backtrackerait `\s*` à zéro caractère et testerait le lookahead
		// sur l'espace — qui n'est pas `{` — donc la négation ne filtrerait rien.
		const paidAtWrite = /\bpaidAt\s*:(?!\s*(?:\{|true\b|false\b|null\b|undefined\b|["'`]))/;

		const writers = allSourceFiles
			.filter((f) => {
				const lines = stripComments(readFileSync(f, "utf-8")).split("\n");
				for (let i = 0; i < lines.length; i++) {
					if (!PAID_VALUE.test(lines[i]!)) continue;
					const window = lines.slice(Math.max(0, i - 8), i + 9).join("\n");
					if (paidAtWrite.test(window)) return true;
				}
				return false;
			})
			.map(relPath)
			.sort();

		expect(writers).toEqual(PAID_WRITER_ALLOWLIST);
	});

	it("only order-creation.service.ts calls prisma.order.create / upsert", () => {
		// Calqué sur `order-item-snapshot-immutability.regression.test.ts`, qui fait
		// déjà cette assertion pour `orderItem.create`. Sans elle, un NOUVEAU
		// créateur de commandes (même PENDING) était invisible : seuls les `create`
		// portant `paymentStatus: PAID` inline étaient rejetés. Or c'est la
		// création qui fixe la provenance Stripe dont dépendent tous les gardes en
		// aval — `mark-as-paid` refuse `!stripePaymentIntentId`, le webhook résout
		// la commande par ce champ, et le CHECK DB s'y adosse.
		const creators = allSourceFiles
			.filter((f) =>
				/\b(?:prisma|tx)\.order\.(?:create|upsert)\s*\(/.test(
					stripComments(readFileSync(f, "utf-8")),
				),
			)
			.map(relPath)
			.sort();
		expect(creators).toEqual(["modules/payments/services/order-creation.service.ts"]);
	});

	it("order-creation.service.ts exige un PaymentIntent et naît toujours PENDING", () => {
		const content = readFileSync(
			join(REPO_ROOT, "modules/payments/services/order-creation.service.ts"),
			"utf-8",
		);
		// `paymentIntentId` NON optionnel : la provenance Stripe est une
		// précondition du service, pas une discipline de l'appelant (même motif que
		// EINV-SEQ-008 sur persistInvoiceNumber).
		expect(content).toMatch(/\bpaymentIntentId\s*:\s*string\s*;/);
		expect(content).not.toMatch(/\bpaymentIntentId\s*\?\s*:/);
		// Et il doit être écrit inconditionnellement (pas derrière un spread
		// conditionnel, qui laissait naître une commande sans preuve Stripe).
		expect(content).toMatch(/stripePaymentIntentId\s*:\s*paymentIntentId\s*,/);
		expect(content).not.toMatch(/\.\.\.\(\s*paymentIntentId\s*&&/);
		// La commande naît PENDING, jamais payée.
		expect(content).toMatch(/paymentStatus\s*:\s*"PENDING"/);
	});

	it("le filet DB de l'invariant #8 est présent dans la SSOT des gardes bruts", () => {
		// Le scan statique de ce fichier est aveugle au SQL brut (psql direct,
		// script de migration) — c'est le vecteur que le CHECK couvre. Vérifier ici
		// sa PRÉSENCE coûte zéro base de données ; son COMPORTEMENT est prouvé par
		// `order-paid-requires-stripe-proof.integration.test.ts` (job CI Postgres).
		const guards = readFileSync(join(REPO_ROOT, "prisma/sql/raw-guards.sql"), "utf-8");
		expect(guards).toMatch(/ADD\s+CONSTRAINT\s+"Order_paid_requires_stripe_proof"/);
		expect(guards).toMatch(/ADD\s+CONSTRAINT\s+"Order_paid_requires_paidAt"/);
		// L'échappatoire de la purge RGPD 10 ans doit rester dans la contrainte :
		// `ORDER_PII_SCRUB` nulle `stripePaymentIntentId` sur des lignes restées
		// PAID. La retirer casserait `hard-delete-retention` des années plus tard.
		expect(guards).toMatch(/"Order_paid_requires_stripe_proof"[^;]*piiPurgedAt"\s+IS\s+NOT\s+NULL/);
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
		// clear cart ni persistInvoiceNumber — une Order PAID
		// sans facture ni e-reporting → oversell + divergence DGFiP silencieuse
		// (Art. 286 / 289-I CGI). La fonction a été SUPPRIMÉE (audit cache 2026-07-03,
		// dernier mutateur de statut sans invalidation cache) ; ce test interdit sa
		// réintroduction sous le même nom. Le remplaçant canonique est
		// `processOrderFromPaymentIntent` (idempotent + décrément + facture).
		const offenders = allSourceFiles
			.map(relPath)
			.filter((rel) =>
				/\bmarkOrderAsPaid\b/.test(stripComments(readFileSync(join(REPO_ROOT, rel), "utf-8"))),
			)
			.sort();
		expect(offenders).toEqual([]);
	});

	it("no source file exports a symbol named recordCashSale / createManualOrder", () => {
		// Hint sémantique : si quelqu'un nomme une nouvelle action de cette manière,
		// le test échoue et force une revue. Le naming est volontairement spécifique
		// à des patterns qui violeraient typiquement l'invariant #8.
		//
		// Couvre les DEUX formes d'export : `export function x` et
		// `export const x = async () => {}`. La seconde échappait au tripwire — et
		// c'est précisément celle qu'écrirait quelqu'un suivant le style des
		// Server Actions récentes du repo.
		const FORBIDDEN =
			"recordCashSale|createManualOrder|recordOfflineSale|createOfflineOrder|recordManualSale|createCashOrder";
		const declaration = new RegExp(
			String.raw`\bexport\s+(?:(?:async\s+)?function|const|let|var)\s+(?:${FORBIDDEN})\b`,
		);
		// `export { recordCashSale }` / `export { x as recordCashSale }`
		const reexport = new RegExp(String.raw`\bexport\s*\{[^}]*\b(?:${FORBIDDEN})\b[^}]*\}`);

		const offenders = allSourceFiles
			.filter((f) => {
				const content = stripComments(readFileSync(f, "utf-8"));
				return declaration.test(content) || reexport.test(content);
			})
			.map(relPath)
			.sort();
		expect(offenders).toEqual([]);
	});
});
