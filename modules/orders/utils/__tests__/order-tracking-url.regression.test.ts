/**
 * @regression order-tracking-url-must-resolve
 *
 * AUDIT-BIZ-001 — le CTA « Suivre ma commande » de l'email de confirmation
 * pointait vers `${baseUrl}/orders`, une route qui n'existe pas (l'espace client
 * est `/commandes`). Le lien était donc mort sur 100 % des commandes encaissées
 * par Stripe — et ce, alors que les deux autres émetteurs du MÊME email
 * (`mark-as-paid`, `resend-order-email`) construisaient la bonne URL.
 *
 * Ce test verrouille deux invariants que le bug avait violés :
 *
 *  1. **Toute URL de suivi produite pointe vers un chemin réellement servi par
 *     l'app.** On ne compare pas à une constante recopiée (ce qui aurait laissé
 *     passer le bug) : on énumère les segments de premier niveau réellement
 *     routables et on vérifie l'appartenance. `/orders` échouerait.
 *  2. **Un seul SSOT.** Aucun émetteur ne doit reconstruire l'URL à la main :
 *     tous passent par `buildOrderTrackingUrl`.
 *
 * ⚠️ **Mise à jour du 2026-07-31 — le contrat n'a plus qu'une branche.**
 * `buildOrderTrackingUrl` renvoyait `/commandes/<n°>` quand `order.userId` était
 * renseigné. L'espace client a été retiré, donc cette route n'existe plus — mais
 * `Order.userId` reste renseigné sur toutes les commandes ANTÉRIEURES. Le vrai
 * risque a donc changé de forme : ce n'est plus « le webhook construit /orders »,
 * c'est « une commande héritée reçoit un lien vers une route supprimée ». C'est
 * exactement le même symptôme qu'AUDIT-BIZ-001 (404 sur le seul lien dont le
 * client dispose), d'où le test ci-dessous sur une commande AVEC `userId`.
 *
 * ⚠️ Ce fichier ne DOIT PAS mocker `@/shared/constants/urls` : c'est justement la
 * valeur réelle des routes qu'il éprouve. Les suites qui la mockent (stubs de
 * `ROUTES`) ne peuvent structurellement pas attraper ce bug — d'où ce garde-fou.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeAll } from "vitest";

import { buildOrderTrackingUrl } from "../build-order-tracking-url";
import { ROUTES } from "@/shared/constants/urls";

const REPO_ROOT = join(__dirname, "../../../..");
const APP_DIR = join(REPO_ROOT, "app");

/**
 * Énumère les segments de premier niveau réellement routables par l'App Router :
 * chaque dossier de `app/` qui contient un `page.tsx`, en traversant les groupes
 * de routes `(nom)` qui ne produisent pas de segment d'URL.
 */
function collectTopLevelRoutes(dir: string, acc = new Set<string>()): Set<string> {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const name = entry.name;
		if (name === "api" || name === "_components" || name === "__tests__") continue;

		const child = join(dir, name);

		// Groupe de routes `(shop)` / segment parallèle `@slot` : transparent pour l'URL.
		if (name.startsWith("(") || name.startsWith("@")) {
			collectTopLevelRoutes(child, acc);
			continue;
		}
		// Segment dynamique : non pertinent pour un chemin de premier niveau fixe.
		if (name.startsWith("[")) continue;

		if (existsSync(join(child, "page.tsx")) || existsSync(join(child, "page.ts"))) {
			acc.add(name);
		}
	}
	return acc;
}

let routableSegments: Set<string>;

beforeAll(() => {
	routableSegments = collectTopLevelRoutes(APP_DIR);
});

function firstSegmentOf(url: string): string {
	return new URL(url).pathname.split("/").filter(Boolean)[0] ?? "";
}

const GUEST_ORDER = {
	id: "clh0000000000000000000001",
	orderNumber: "CMD-1704067200000-A1B2C3D4E5F6",
};
/**
 * Commande passée AVANT le retrait de l'espace client : elle porte encore un
 * `userId` en base. `buildOrderTrackingUrl` ne le lit plus — c'est précisément ce
 * qu'on vérifie.
 */
const LEGACY_ORDER_WITH_USER = { ...GUEST_ORDER, userId: "user_1" };

describe("buildOrderTrackingUrl — la route existe vraiment", () => {
	it("expose au moins les segments attendus (garde-fou du collecteur lui-même)", () => {
		// Si le collecteur cassait (mauvais chemin, convention changée), il
		// retournerait un set vide et TOUS les asserts ci-dessous passeraient à
		// tort — « vert pour la mauvaise raison ». On l'ancre donc explicitement.
		// `commandes` a disparu du set avec l'espace client (2026-07-31) — on s'ancre
		// sur deux segments toujours servis, dont celui du suivi lui-même.
		expect(routableSegments.has("suivi-commande")).toBe(true);
		expect(routableSegments.has("paiement")).toBe(true);
		expect(routableSegments.size).toBeGreaterThan(5);
	});

	it("commande héritée (userId renseigné) → lien de suivi tokenisé, PAS /commandes", () => {
		const url = buildOrderTrackingUrl(LEGACY_ORDER_WITH_USER);
		const parsed = new URL(url);

		expect(firstSegmentOf(url)).not.toBe("orders");
		expect(firstSegmentOf(url)).not.toBe("commandes");
		expect(routableSegments.has(firstSegmentOf(url))).toBe(true);
		expect(parsed.pathname).toBe(ROUTES.SHOP.ORDER_TRACKING);
		expect(parsed.searchParams.get("token")).toMatch(/^[0-9a-f]{32}$/);
	});

	it("produit la MÊME URL avec ou sans userId (plus aucun branchement)", () => {
		expect(buildOrderTrackingUrl(LEGACY_ORDER_WITH_USER)).toBe(buildOrderTrackingUrl(GUEST_ORDER));
	});

	it("invité → page de suivi tokenisée, sur un segment routable", () => {
		const url = buildOrderTrackingUrl(GUEST_ORDER);
		const parsed = new URL(url);

		expect(routableSegments.has(firstSegmentOf(url))).toBe(true);
		expect(parsed.pathname).toBe(ROUTES.SHOP.ORDER_TRACKING);
		expect(parsed.searchParams.get("commande")).toBe(GUEST_ORDER.orderNumber);
		expect(parsed.searchParams.get("token")).toMatch(/^[0-9a-f]{32}$/);
	});

	it("la route de suivi n'est sous aucun préfixe authentifié", () => {
		// Historiquement `/commandes` (espace client, protégé). Aujourd'hui `/admin`
		// est le seul préfixe authentifié — y placer le suivi renverrait le client
		// vers `/connexion`, exactement le mur que cette page existe pour supprimer.
		expect(ROUTES.SHOP.ORDER_TRACKING.startsWith("/admin")).toBe(false);
		expect(ROUTES.SHOP.ORDER_TRACKING.startsWith("/commandes")).toBe(false);
	});

	it("le suivi invité est enregistré dans les routes publiques du proxy (default-deny)", () => {
		// `proxy.ts` redirige vers `/` toute route non enregistrée. Une page créée
		// sans l'ajouter à `publicRoutes` est donc inatteignable en production alors
		// qu'elle fonctionne en test — ce test ferme cet écart.
		const proxySource = readFileSync(join(REPO_ROOT, "proxy.ts"), "utf8");
		const publicRoutesBlock = proxySource.slice(
			proxySource.indexOf("const publicRoutes"),
			proxySource.indexOf("const authRoutes"),
		);
		expect(publicRoutesBlock).toContain(`"${ROUTES.SHOP.ORDER_TRACKING}"`);
	});
});

describe("buildOrderTrackingUrl — SSOT unique pour TOUS les émetteurs", () => {
	// Liste exhaustive des call sites (audit 2026-08-01 — le test n'en couvrait
	// que 3 sur 10, alors que le commentaire de la SSOT promet « tout nouvel
	// émetteur DOIT passer par ici »). Inclut la page de confirmation, seul
	// émetteur non-email.
	const EMITTERS = [
		"modules/webhooks/services/checkout-post-tasks.service.ts",
		"modules/webhooks/handlers/refund-handlers.ts",
		"modules/orders/actions/mark-as-paid.ts",
		"modules/orders/actions/mark-as-shipped.ts",
		"modules/orders/actions/cancel-order.ts",
		"modules/orders/actions/mark-as-fully-refunded.ts",
		"modules/orders/actions/resend-order-email.ts",
		"modules/refunds/services/finalize-refund.service.ts",
		"app/paiement/confirmation/page.tsx",
	];

	it.each(EMITTERS)("%s passe par buildOrderTrackingUrl", (relPath) => {
		const source = readFileSync(join(REPO_ROOT, relPath), "utf8");
		expect(source).toContain("buildOrderTrackingUrl");
	});

	it.each(EMITTERS)("%s ne reconstruit aucune URL de suivi à la main", (relPath) => {
		const source = readFileSync(join(REPO_ROOT, relPath), "utf8");

		// La forme exacte du bug d'origine.
		expect(source).not.toMatch(/baseUrl\s*\}\/orders/);
		// Et sa famille : un `trackingUrl` assigné depuis un template littéral
		// (`buildUrl(...)` / `buildOrderTrackingUrl(...)` sont des appels, pas des
		// templates — ils ne matchent pas).
		expect(source).not.toMatch(/trackingUrl\s*=\s*`/);
	});
});

describe("token de suivi — namespace disjoint de celui de la facture", () => {
	it("un token de suivi ne vaut pas un token de facture", async () => {
		const { generateOrderTrackingToken } = await import("../tracking-token");
		const { generateInvoiceAccessToken, verifyInvoiceAccessToken } =
			await import("../invoice-token");

		const tracking = generateOrderTrackingToken(GUEST_ORDER.id, GUEST_ORDER.orderNumber);
		const invoice = generateInvoiceAccessToken(GUEST_ORDER.id, GUEST_ORDER.orderNumber);

		expect(tracking).not.toBe(invoice);
		// Un lien de suivi ne doit pas ouvrir le PDF de facture (PII plus large).
		expect(verifyInvoiceAccessToken(GUEST_ORDER.id, GUEST_ORDER.orderNumber, tracking)).toBe(false);
	});
});
