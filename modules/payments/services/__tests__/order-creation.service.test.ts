import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockTx,
	mockPrisma,
	mockCheckDiscountEligibility,
	mockCalculateDiscountWithExclusion,
	mockCalculateShipping,
	mockGenerateOrderNumber,
	mockGetValidImageUrl,
	mockSentryCaptureMessage,
	MockBusinessError,
	MOCK_DISCOUNT_ERROR_MESSAGES,
	MOCK_DEFAULT_CURRENCY,
} = vi.hoisted(() => {
	class MockBusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	}

	const mockTx = {
		$queryRaw: vi.fn(),
		$executeRaw: vi.fn(),
		// `count` : le comptage `maxUsagePerUser` porte sur `Order` depuis le repli de
		// `DiscountUsage` en colonnes (audit V2, Lot 2).
		order: { create: vi.fn(), count: vi.fn() },
		orderItem: { create: vi.fn() },
	};

	const mockPrisma = {
		$transaction: vi.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
	};

	return {
		mockTx,
		mockPrisma,
		mockCheckDiscountEligibility: vi.fn(),
		mockCalculateDiscountWithExclusion: vi.fn(),
		mockCalculateShipping: vi.fn(),
		mockGenerateOrderNumber: vi.fn(),
		mockGetValidImageUrl: vi.fn(),
		mockSentryCaptureMessage: vi.fn(),
		MockBusinessError,
		MOCK_DISCOUNT_ERROR_MESSAGES: { NOT_FOUND: "Code promo introuvable" },
		MOCK_DEFAULT_CURRENCY: "EUR",
	};
});

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/shared/lib/actions", () => ({
	BusinessError: MockBusinessError,
}));

vi.mock("@/modules/discounts/services/discount-eligibility.service", () => ({
	checkDiscountEligibility: mockCheckDiscountEligibility,
}));

vi.mock("@/modules/discounts/services/discount-calculation.service", () => ({
	calculateDiscountWithExclusion: mockCalculateDiscountWithExclusion,
}));

vi.mock("@/modules/orders/services/shipping.service", () => ({
	calculateShipping: mockCalculateShipping,
}));

vi.mock("@/modules/orders/services/order-generation.service", () => ({
	generateOrderNumber: mockGenerateOrderNumber,
}));

vi.mock("@/shared/lib/media-validation", () => ({
	getValidImageUrl: mockGetValidImageUrl,
}));

vi.mock("@/modules/discounts/constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: MOCK_DISCOUNT_ERROR_MESSAGES,
}));

vi.mock("@/shared/constants/currency", () => ({
	DEFAULT_CURRENCY: MOCK_DEFAULT_CURRENCY,
	// ⚠️ Tout export consommé par le service doit figurer ici : Vitest lève
	// « No "X" export is defined on the mock » au premier accès, ce qui casse les 30
	// tests du fichier d'un coup et non celui qui l'utilise.
	STRIPE_MIN_AMOUNT_EUR_CENTS: 50,
}));

vi.mock("@sentry/nextjs", () => ({
	withScope: vi.fn((cb: (scope: unknown) => void) =>
		cb({ setLevel: vi.fn(), setTag: vi.fn(), setFingerprint: vi.fn(), setContext: vi.fn() }),
	),
	captureMessage: mockSentryCaptureMessage,
	captureException: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

import { createOrderInTransaction } from "../order-creation.service";

// ============================================================================
// FIXTURES
// ============================================================================

function makeSku(overrides: Record<string, unknown> = {}) {
	return {
		id: "sku_1",
		sku: "SKU-001",
		priceInclTax: 2990,
		compareAtPrice: null,
		isActive: true,
		colorId: "color_1",
		colors: [{ id: "color_1", name: "Or", hex: "#FFD700" }],
		material: "Argent",
		size: undefined,
		images: [{ url: "https://example.com/image.jpg", mediaType: "IMAGE" as const }],
		product: {
			id: "prod_1",
			title: "Bague Étoile",
			slug: "bague-etoile",
			description: "Description produit",
		},
		...overrides,
	};
}

function makeSkuResult(skuOverrides: Record<string, unknown> = {}) {
	return {
		success: true as const,
		data: { sku: makeSku(skuOverrides) },
	};
}

function makeParams(overrides: Record<string, unknown> = {}) {
	return {
		cartItems: [{ skuId: "sku_1", quantity: 2 }],
		skuDetailsResults: [makeSkuResult()],
		subtotal: 5980,
		shippingAddress: {
			addressLine1: "12 Rue de la Paix",
			addressLine2: null,
			postalCode: "75001",
			city: "Paris",
			country: "FR",
			phoneNumber: "+33612345678",
		},
		firstName: "Marie",
		lastName: "Dupont",
		finalEmail: "marie@example.com",
		// Invariant #8 (NF 525) : une commande naît TOUJOURS avec sa provenance
		// Stripe. Le paramètre était optionnel jusqu'au 2026-07-31 et ce fixture
		// l'omettait — il encodait donc un contrat plus lâche que la production,
		// où `confirmCheckout` le passe systématiquement.
		paymentIntentId: "pi_test_order_creation",
		...overrides,
	};
}

function makeSkuRow(overrides: Record<string, unknown> = {}) {
	return {
		// Le verrou est pris en UN SEUL `$queryRaw` (`WHERE ps.id = ANY(…)`), et le
		// service indexe les lignes rendues par `row.id`. Sans cet `id`, la Map de
		// correspondance est vide et TOUT échoue en « Produit introuvable » — le
		// fixture doit donc porter la colonne que le SELECT ramène.
		id: "sku_1",
		isActive: true,
		inventory: 10,
		productTitle: "Bague Étoile",
		productStatus: "PUBLIC",
		skuDeletedAt: null,
		productDeletedAt: null,
		// Doit correspondre à `makeSku().priceInclTax` : le prix est désormais vérifié
		// sous le verrou, une divergence fait échouer la création (fail-closed).
		priceInclTax: 2990,
		...overrides,
	};
}

function makeDiscountRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "discount_1",
		code: "PROMO10",
		type: "PERCENTAGE",
		value: 10,
		minOrderAmount: null,
		maxUsageCount: null,
		maxUsagePerUser: null,
		usageCount: 0,
		isActive: true,
		endsAt: null,
		...overrides,
	};
}

function makeCreatedOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order_1",
		orderNumber: "SYN-2026-0001",
		total: 6430,
		...overrides,
	};
}

// ============================================================================
// STOCK VERIFICATION
// ============================================================================

describe("createOrderInTransaction — stock verification", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow()]);
		mockTx.$executeRaw.mockResolvedValue(1);
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());
		mockTx.orderItem.create.mockResolvedValue({});
		mockTx.order.count.mockResolvedValue(0);
		mockCalculateShipping.mockReturnValue(450);
		mockGenerateOrderNumber.mockReturnValue("SYN-2026-0001");
		mockGetValidImageUrl.mockReturnValue("https://example.com/image.jpg");
	});

	it("should call FOR UPDATE query for each cart item with a valid sku result", async () => {
		await createOrderInTransaction(makeParams());

		expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
	});

	// Le nombre d'appels ne dit RIEN du verrou : sans cette assertion, retirer
	// `FOR UPDATE` du SQL laissait toute la suite verte alors que la vérification de
	// stock devenait une simple lecture non sérialisée. Audit « validation stock
	// panier » 2026-07-30, P2-5. Le pattern existe ailleurs dans le repo
	// (`dispute-handlers.test.ts`, `mark-as-paid.test.ts` pour l'advisory lock).
	it("verrouille la ligne SKU : le SQL contient bien FOR UPDATE", async () => {
		await createOrderInTransaction(makeParams());

		const sql = mockTx.$queryRaw.mock.calls
			.map((call) => (Array.isArray(call[0]) ? call[0].join("?") : String(call[0])))
			.join("\n");

		expect(sql).toContain('FROM "ProductSku"');
		expect(sql).toContain("FOR UPDATE");
	});

	// Le verrou est BATCHÉ : un seul `WHERE ps.id = ANY(…) FOR UPDATE`, pas une requête
	// par article. Compter les appels ne dit donc plus rien de la couverture — c'est le
	// tableau d'ids passé au `$queryRaw` qui la porte, et c'est lui qu'on assert. Un
	// article oublié de ce tableau repart non verrouillé, donc survendable.
	it("verrouille TOUS les articles du panier en une seule requête", async () => {
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow({ id: "sku_1" }), makeSkuRow({ id: "sku_2" })]);

		const params = makeParams({
			cartItems: [
				{ skuId: "sku_1", quantity: 1 },
				{ skuId: "sku_2", quantity: 2 },
			],
			skuDetailsResults: [makeSkuResult({ id: "sku_1" }), makeSkuResult({ id: "sku_2" })],
			// 1×2990 + 2×2990 — cohérent avec l'invariant CHECKOUT-TOTAL-005
			subtotal: 8970,
		});

		await createOrderInTransaction(params);

		expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
		// Second argument du tagged template : le tableau d'ids interpolé dans `ANY(…)`.
		expect(mockTx.$queryRaw.mock.calls[0]![1]).toEqual(["sku_1", "sku_2"]);
	});

	/**
	 * @regression CHECKOUT-PRICE-UNDER-LOCK-001
	 *
	 * Le prix est vérifié SOUS le verrou, comme le stock et le statut. Il ne l'était
	 * pas : le total était calculé depuis `fetchSkuForValidation` (cache `checkout`),
	 * et le garde-fou `priceAtAdd !== sku.priceInclTax` des actions de paiement compare
	 * deux valeurs issues de la MÊME lecture cachée — il ne peut donc pas détecter un
	 * cache périmé. `CHECKOUT-TOTAL-005` ne vérifie que la cohérence interne
	 * (`computedSubtotal === subtotal`), les deux côtés dérivant de cette même lecture.
	 * Un changement de prix concurrent facturait donc l'ancien montant.
	 */
	it("CHECKOUT-PRICE-UNDER-LOCK-001: refuse quand le prix verrouillé diverge du prix facturé", async () => {
		// Le SKU vaut 2990 au moment du calcul du total, mais 3490 sous le verrou.
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow({ priceInclTax: 3490 })]);

		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(
			"Le prix d'un article a changé. Actualise ton panier.",
		);
		// Fail-closed : aucune commande créée, on ne sous-facture pas.
		expect(mockTx.order.create).not.toHaveBeenCalled();
	});

	// CHECKOUT-TOTAL-005 : plus JAMAIS de skip silencieux — un cartItem sans
	// skuDetailsResult correspondant signifie qu'un article facturé (inclus dans
	// le subtotal) ne serait pas snapshoté → fail-closed AVANT la transaction.
	// @regression checkout-cart-item-fail-closed
	it("CHECKOUT-TOTAL-005: throws (fail-closed) when a cart item has no matching sku result — no silent skip", async () => {
		const params = makeParams({
			skuDetailsResults: [{ success: false as const, error: "not found" }],
		});

		await expect(createOrderInTransaction(params)).rejects.toThrow(MockBusinessError);
		await expect(createOrderInTransaction(params)).rejects.toThrow(
			"Certains articles de ton panier sont introuvables. Actualise la page.",
		);
		// Rejet AVANT la transaction : aucun lock pris, rien créé.
		expect(mockTx.$queryRaw).not.toHaveBeenCalled();
		expect(mockTx.order.create).not.toHaveBeenCalled();
	});

	// CHECKOUT-TOTAL-005 : le subtotal paramètre doit égaler Σ priceInclTax×quantity
	// des lignes snapshotées — toute divergence (filtrage/arrondi amont) est un bug
	// interne → rejet fail-closed + alerte Sentry, AVANT la transaction.
	// @regression checkout-subtotal-invariant
	it("CHECKOUT-TOTAL-005: throws and alerts Sentry when subtotal param diverges from line items sum", async () => {
		// Items = 2×2990 = 5980, subtotal param volontairement faux.
		const params = makeParams({ subtotal: 6000 });

		await expect(createOrderInTransaction(params)).rejects.toThrow(
			"Le montant de ton panier a changé. Actualise la page.",
		);
		expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
			"createOrderInTransaction: subtotal param diverges from line items sum",
			"error",
		);
		// Rejet AVANT la transaction : aucun lock pris, rien créé.
		expect(mockTx.$queryRaw).not.toHaveBeenCalled();
		expect(mockTx.order.create).not.toHaveBeenCalled();
	});

	it("should throw BusinessError when SKU row not found in DB", async () => {
		mockTx.$queryRaw.mockResolvedValue([]);

		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(MockBusinessError);
		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(
			"Produit introuvable : Bague Étoile",
		);
	});

	it("should throw BusinessError when product is inactive (isActive=false)", async () => {
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow({ isActive: false })]);

		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(MockBusinessError);
		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(
			"Le produit Bague Étoile n'est plus disponible",
		);
	});

	it("should throw BusinessError when product status is not PUBLIC", async () => {
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow({ productStatus: "DRAFT" })]);

		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(MockBusinessError);
		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(
			"Le produit Bague Étoile n'est plus disponible",
		);
	});

	it("should throw BusinessError when inventory is insufficient", async () => {
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow({ inventory: 1 })]);

		// cartItem quantity is 2, inventory is 1
		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(MockBusinessError);
		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(
			"Stock insuffisant pour Bague Étoile",
		);
	});
});

// ============================================================================
// SHIPPING
// ============================================================================

describe("createOrderInTransaction — shipping", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow()]);
		mockTx.$executeRaw.mockResolvedValue(1);
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());
		mockTx.orderItem.create.mockResolvedValue({});
		mockTx.order.count.mockResolvedValue(0);
		mockGenerateOrderNumber.mockReturnValue("SYN-2026-0001");
		mockGetValidImageUrl.mockReturnValue("https://example.com/image.jpg");
	});

	it("should call calculateShipping with country and postalCode", async () => {
		mockCalculateShipping.mockReturnValue(450);

		await createOrderInTransaction(makeParams());

		expect(mockCalculateShipping).toHaveBeenCalledWith("FR", "75001");
	});

	it("should throw BusinessError when shipping is null (unavailable zone)", async () => {
		mockCalculateShipping.mockReturnValue(null);

		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(MockBusinessError);
		await expect(createOrderInTransaction(makeParams())).rejects.toThrow(
			"Livraison non disponible pour cette zone (Corse, DOM-TOM)",
		);
	});
});

// ============================================================================
// ORDER CREATION WITHOUT DISCOUNT
// ============================================================================

describe("createOrderInTransaction — order creation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow()]);
		mockTx.$executeRaw.mockResolvedValue(1);
		mockTx.orderItem.create.mockResolvedValue({});
		mockTx.order.count.mockResolvedValue(0);
		mockCalculateShipping.mockReturnValue(450);
		mockGenerateOrderNumber.mockReturnValue("SYN-2026-0001");
		mockGetValidImageUrl.mockReturnValue("https://example.com/image.jpg");
	});

	it("should compute correct totals: subtotal + shipping", async () => {
		// subtotal=5980, shipping=450, total=6430
		mockTx.order.create.mockResolvedValue(makeCreatedOrder({ total: 6430 }));

		await createOrderInTransaction(makeParams());

		const createCall = mockTx.order.create.mock.calls[0]![0];
		expect(createCall.data.subtotal).toBe(5980);
		expect(createCall.data.shippingCost).toBe(450);
		expect(createCall.data.total).toBe(6430);
	});

	// @regression order-no-tax-column (2026-08-04) : `Order.taxAmount` a été
	// retirée — franchise en base (Art. 293 B), la colonne valait toujours 0,
	// était exclue de `Order_total_formula` et jamais lue par le renderer.
	it("n'écrit AUCUNE colonne de TVA sur la commande", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder({ total: 6430 }));

		await createOrderInTransaction(makeParams());

		const createCall = mockTx.order.create.mock.calls[0]![0];
		expect(createCall.data).not.toHaveProperty("taxAmount");
	});

	it("should set customerEmail to empty string when finalEmail is null", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());

		await createOrderInTransaction(makeParams({ finalEmail: null }));

		const createCall = mockTx.order.create.mock.calls[0]![0];
		expect(createCall.data.customerEmail).toBe("");
	});

	it("should trim customerName correctly", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());

		await createOrderInTransaction(makeParams({ firstName: "Marie", lastName: "Dupont" }));

		const createCall = mockTx.order.create.mock.calls[0]![0];
		expect(createCall.data.customerName).toBe("Marie Dupont");
	});

	// Invariant #5 (CLAUDE.md § Facturation électronique) — snapshot adresse figé
	// au checkout. Verrouille en VALEUR le mapping formulaire → colonnes Order que
	// le scan statique order-address-snapshot-immutability.regression.test.ts ne
	// couvre pas (un swap city↔postalCode ou la perte d'addressLine2 passerait
	// inaperçu avec la seule allowlist de writers).
	//
	// ⚠️ `toMatchObject` autorise le SUR-ENSEMBLE et les 9 clés sont écrites à la
	// main : une colonne de snapshot ajoutée au schéma et non écrite ici resterait
	// invisible. C'est
	// `modules/payments/services/__tests__/order-snapshot-column-parity.regression.test.ts`
	// qui tient cette direction-là, en dérivant la liste de `prisma/schema.prisma`.
	it("should snapshot the shipping address field-by-field on the order", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());

		await createOrderInTransaction(
			makeParams({
				shippingAddress: {
					addressLine1: "12 Rue de la Paix",
					addressLine2: "Bâtiment B, 3e étage",
					postalCode: "75001",
					city: "Paris",
					country: "FR",
					phoneNumber: "+33612345678",
				},
				firstName: "Marie",
				lastName: "Dupont",
			}),
		);

		const createCall = mockTx.order.create.mock.calls[0]![0];
		expect(createCall.data).toMatchObject({
			customerName: "Marie Dupont",
			shippingFirstName: "Marie",
			shippingLastName: "Dupont",
			shippingAddress1: "12 Rue de la Paix",
			shippingAddress2: "Bâtiment B, 3e étage",
			shippingPostalCode: "75001",
			shippingCity: "Paris",
			shippingCountry: "FR",
			shippingPhone: "+33612345678",
		});
	});

	// ⚠️ L'assertion « aucune clé billing* écrite » a vécu ici jusqu'au 2026-08-07.
	// Elle est devenue VACUE au drop des 9 colonnes `billing*` (2026-08-04) : elle ne
	// pouvait plus échouer, et son commentaire citait `update-order-billing-address`,
	// supprimé dans le même commit. Elle vit désormais dans
	// `order-snapshot-column-parity.regression.test.ts`, doublée d'un contrôle du
	// SCHÉMA — c'est ce second volet qui lui redonne un objet.

	it("should coalesce missing addressLine2 to null and missing phone to empty string", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());

		await createOrderInTransaction(
			makeParams({
				shippingAddress: {
					addressLine1: "3 Allée des Tilleuls",
					addressLine2: undefined,
					postalCode: "44000",
					city: "Nantes",
					country: "FR",
					phoneNumber: undefined,
				},
			}),
		);

		const createCall = mockTx.order.create.mock.calls[0]![0];
		expect(createCall.data.shippingAddress2).toBeNull();
		expect(createCall.data.shippingPhone).toBe("");
	});

	it("should denormalize product and SKU data on order items", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder({ id: "order_1" }));

		await createOrderInTransaction(makeParams());

		const itemCall = mockTx.orderItem.create.mock.calls[0]![0];
		expect(itemCall.data.orderId).toBe("order_1");
		expect(itemCall.data.skuId).toBe("sku_1");
		expect(itemCall.data.productTitle).toBe("Bague Étoile");
		expect(itemCall.data.price).toBe(2990);
		expect(itemCall.data.quantity).toBe(2);
		// Les 3 libellés de variante étaient écrits sans qu'aucun test ne les
		// regarde (audit 2026-08-07) : supprimer `skuColor:` du `create` ne cassait
		// rien, alors que la facture archivée sous SHA-256 les imprime pour 10 ans.
		expect(itemCall.data.skuColor).toBe("Or");
		expect(itemCall.data.skuMaterial).toBe("Argent");
		expect(itemCall.data.skuSize).toBeNull();
	});

	it("joint les couleurs multiples en un seul libellé snapshot", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());

		const multiColor = makeSkuResult({
			colors: [
				{ id: "c1", name: "Or", hex: "#FFD700" },
				{ id: "c2", name: "Lavande", hex: "#B57EDC" },
				{ id: "c3", name: "Menthe", hex: "#98FF98" },
			],
			size: "M",
		});

		await createOrderInTransaction(makeParams({ skuDetailsResults: [multiColor] }));

		const itemCall = mockTx.orderItem.create.mock.calls[0]![0];
		expect(itemCall.data.skuColor).toBe("Or · Lavande · Menthe");
		expect(itemCall.data.skuSize).toBe("M");
	});

	it("préserve null quand le SKU n'a ni couleur, ni matière, ni taille", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());

		const bare = makeSkuResult({ colors: [], material: null, size: null });

		await createOrderInTransaction(makeParams({ skuDetailsResults: [bare] }));

		const itemCall = mockTx.orderItem.create.mock.calls[0]![0];
		// `join("")` sur un tableau vide rend `""` — le `|| null` du service évite
		// d'écrire une chaîne vide là où la colonne est nullable.
		expect(itemCall.data.skuColor).toBeNull();
		expect(itemCall.data.skuMaterial).toBeNull();
		expect(itemCall.data.skuSize).toBeNull();
	});

	/**
	 * `OrderItem.skuColor` et `.skuMaterial` sont des `@db.VarChar(100)`, mais leur
	 * source est AGRÉGÉE : trois noms de couleur joints par « · » dépassent
	 * facilement 100 caractères. Sans troncature, c'est un `22001` Postgres levé
	 * DANS la transaction de checkout — donc une commande refusée avec un
	 * « Une erreur est survenue » qui ne nomme aucun champ.
	 *
	 * Tronquer plutôt que rejeter est le bon arbitrage : un libellé d'affichage
	 * abrégé n'a aucune conséquence comptable (il ne porte ni prix ni quantité).
	 */
	it("tronque les libellés de variante à la largeur de la colonne (VarChar(100))", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());

		const longColorNames = ["A".repeat(40), "B".repeat(40), "C".repeat(40)];
		const overlong = makeSkuResult({
			colors: longColorNames.map((name, i) => ({ id: `c${i}`, name, hex: "#000000" })),
			material: "M".repeat(180),
		});

		await createOrderInTransaction(makeParams({ skuDetailsResults: [overlong] }));

		const itemCall = mockTx.orderItem.create.mock.calls[0]![0];
		// 3 × 40 + 2 séparateurs de 3 = 126 caractères avant troncature ; les 100
		// premiers s'arrêtent au 14ᵉ « C ».
		expect(itemCall.data.skuColor).toHaveLength(100);
		expect(itemCall.data.skuColor).toBe(
			`${"A".repeat(40)} · ${"B".repeat(40)} · ${"C".repeat(14)}`,
		);
		expect(itemCall.data.skuMaterial).toHaveLength(100);
		expect(itemCall.data.skuMaterial).toBe("M".repeat(100));
	});

	it("prend la première IMAGE de l'ordre canonique (position asc) pour le snapshot", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());
		mockGetValidImageUrl.mockReturnValue("https://example.com/primary.jpg");

		// Depuis le lot A1 (audit V5), le média principal est le rang 0 : le
		// tableau arrive trié (position asc, id asc) et pickPrimaryImage prend
		// la première IMAGE de cet ordre.
		const skuWithPrimary = makeSkuResult({
			images: [
				{ url: "https://example.com/primary.jpg", mediaType: "IMAGE" as const },
				{ url: "https://example.com/other.jpg", mediaType: "IMAGE" as const },
			],
		});

		await createOrderInTransaction(makeParams({ skuDetailsResults: [skuWithPrimary] }));

		expect(mockGetValidImageUrl).toHaveBeenCalledWith("https://example.com/primary.jpg");
		const itemCall = mockTx.orderItem.create.mock.calls[0]![0];
		expect(itemCall.data.productImageUrl).toBe("https://example.com/primary.jpg");
	});

	/**
	 * @regression EINV-SNAPSHOT-MEDIA-001
	 *
	 * Une VIDÉO au rang 0 ne doit jamais atterrir dans le snapshot figé
	 * `OrderItem.productImageUrl` — immuable, rétention 10 ans, rendu
	 * dans l'historique client ET dans le PDF de facture. Le code faisait
	 * `images[0]` sans filtre, aveugle au `mediaType` (que le select ne
	 * remontait même pas), et `getValidImageUrl` ne valide que HTTPS +
	 * domaine — un `.mp4` UploadThing passait donc intégralement.
	 */
	it("EINV-SNAPSHOT-MEDIA-001: ignore une vidéo au rang 0 et prend la première IMAGE", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());
		mockGetValidImageUrl.mockImplementation((url: string | null) => url);

		const skuWithPrimaryVideo = makeSkuResult({
			images: [
				{ url: "https://example.com/clip.mp4", mediaType: "VIDEO" as const },
				{ url: "https://example.com/photo.jpg", mediaType: "IMAGE" as const },
			],
		});

		await createOrderInTransaction(makeParams({ skuDetailsResults: [skuWithPrimaryVideo] }));

		const itemCall = mockTx.orderItem.create.mock.calls[0]![0];
		expect(itemCall.data.productImageUrl).toBe("https://example.com/photo.jpg");
		expect(itemCall.data.productImageUrl).not.toContain(".mp4");
	});

	it("EINV-SNAPSHOT-MEDIA-001: n'écrit aucune URL quand le SKU n'a que des vidéos", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());
		mockGetValidImageUrl.mockReturnValue(null);

		const videoOnly = makeSkuResult({
			images: [{ url: "https://example.com/clip.mp4", mediaType: "VIDEO" as const }],
		});

		await createOrderInTransaction(makeParams({ skuDetailsResults: [videoOnly] }));

		// `pickPrimaryImage` rend null ⇒ on préfère l'absence d'image à une vidéo.
		expect(mockGetValidImageUrl).toHaveBeenCalledWith(null);
		const itemCall = mockTx.orderItem.create.mock.calls[0]![0];
		expect(itemCall.data.productImageUrl).toBeNull();
	});

	it("prend l'unique image d'un SKU mono-image", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());
		mockGetValidImageUrl.mockReturnValue("https://example.com/first.jpg");

		const singleImageSku = makeSkuResult({
			images: [{ url: "https://example.com/first.jpg", mediaType: "IMAGE" as const }],
		});

		await createOrderInTransaction(makeParams({ skuDetailsResults: [singleImageSku] }));

		expect(mockGetValidImageUrl).toHaveBeenCalledWith("https://example.com/first.jpg");
	});

	it("should set imageUrl to null when no images and getValidImageUrl returns null", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());
		mockGetValidImageUrl.mockReturnValue(null);

		const skuWithoutImages = makeSkuResult({ images: [] });

		await createOrderInTransaction(makeParams({ skuDetailsResults: [skuWithoutImages] }));

		expect(mockGetValidImageUrl).toHaveBeenCalledWith(null);
		const itemCall = mockTx.orderItem.create.mock.calls[0]![0];
		expect(itemCall.data.productImageUrl).toBeNull();
	});

	it("should call getValidImageUrl with the raw image URL", async () => {
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());

		await createOrderInTransaction(makeParams());

		expect(mockGetValidImageUrl).toHaveBeenCalledWith("https://example.com/image.jpg");
	});

	it("should return the created order", async () => {
		const createdOrder = makeCreatedOrder();
		mockTx.order.create.mockResolvedValue(createdOrder);

		const result = await createOrderInTransaction(makeParams());

		expect(result.order).toBe(createdOrder);
	});
});

// ============================================================================
// DISCOUNT FLOW
// ============================================================================

// ============================================================================
// TOTALS
// ============================================================================

describe("createOrderInTransaction — totals", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTx.$queryRaw.mockResolvedValue([makeSkuRow()]);
		mockTx.$executeRaw.mockResolvedValue(1);
		mockTx.orderItem.create.mockResolvedValue({});
		mockTx.order.count.mockResolvedValue(0);
		mockGenerateOrderNumber.mockReturnValue("SYN-2026-0001");
		mockGetValidImageUrl.mockReturnValue("https://example.com/image.jpg");
	});

	it("should compute total as subtotal + shipping when no discount", async () => {
		mockCalculateShipping.mockReturnValue(450);
		mockTx.order.create.mockResolvedValue(makeCreatedOrder());

		await createOrderInTransaction(makeParams({ subtotal: 5980 }));

		const createCall = mockTx.order.create.mock.calls[0]![0];
		// total = max(0, 5980 + 450) = 6430
		expect(createCall.data.total).toBe(6430);
	});

	it("REFUSE un total sous le minimum Stripe au lieu de créer la commande (MIN-AMOUNT-DIVERGE-01)", async () => {
		// Ce test assertait auparavant `total === 0` — le `Math.max(0, …)` du service.
		// C'était verrouiller un cul-de-sac : une commande à 0 € est créée, puis Stripe
		// refuse l'`update` du PaymentIntent (montant sous le minimum EUR), et
		// `confirmCheckout` la hard-delete en affichant « Une erreur est survenue ».
		// Le scénario n'est atteignable qu'avec un port gratuit ou un tarif < 50 c
		// (`calculateShipping` → 0 ci-dessous) — exactement ce que le commentaire
		// ⚠️ du service annonçait sans l'implémenter.
		// Sans codes promo, le seul chemin vers un total sous le minimum est un
		// article à 0 € (« offert ») combiné à un port gratuit.
		mockCalculateShipping.mockReturnValue(0);
		mockTx.$queryRaw.mockReset().mockResolvedValueOnce([makeSkuRow({ priceInclTax: 0 })]);
		mockTx.order.create.mockResolvedValue(makeCreatedOrder({ total: 0 }));

		await expect(
			createOrderInTransaction(
				makeParams({ subtotal: 0, skuDetailsResults: [makeSkuResult({ priceInclTax: 0 })] }),
			),
		).rejects.toThrow(/trop faible pour être encaissé/i);

		// Fail-closed : aucune commande créée, donc rien à nettoyer en aval.
		expect(mockTx.order.create).not.toHaveBeenCalled();
	});

	it("accepte un total exactement égal au minimum Stripe", async () => {
		// Borne inclusive : le rejet porte sur `< 50`, pas `<= 50`.
		mockCalculateShipping.mockReturnValue(50);
		mockTx.$queryRaw.mockReset().mockResolvedValueOnce([makeSkuRow({ priceInclTax: 0 })]);
		mockTx.order.create.mockResolvedValue(makeCreatedOrder({ total: 50 }));

		await createOrderInTransaction(
			makeParams({ subtotal: 0, skuDetailsResults: [makeSkuResult({ priceInclTax: 0 })] }),
		);

		const createCall = mockTx.order.create.mock.calls[0]![0];
		expect(createCall.data.total).toBe(50);
	});
});

// Note (audit schéma 2026-07-26) : le bloc « client B2C » qui vivait ici ne
// contenait qu'une assertion sur `Order.customerType` — colonne supprimée avec
// l'e-reporting (migration 20260726233000_drop_customer_type). Il n'y a plus rien
// à vérifier : Synclune n'a plus de discriminant de type client en base.
