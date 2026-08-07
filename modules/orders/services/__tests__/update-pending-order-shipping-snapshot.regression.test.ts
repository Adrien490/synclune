import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * @regression pending-order-shipping-snapshot-2026-07-30
 *
 * Ferme KI-001 : une resoumission de checkout qui corrigeait la RUE (mêmes lignes, même
 * pays, même code postal) était acceptée en silence, la commande gardant son snapshot
 * figé → colis expédié à l'ancienne adresse, sans aucun signal.
 *
 * Ce service réécrit le snapshot, mais SEULEMENT sur une commande encore PENDING (pas
 * encore une pièce comptable) et sous le même advisory lock que la transition PAID. Les
 * assertions ci-dessous verrouillent chacune de ces conditions : c'est ce qui sépare une
 * correction légitime d'une pièce comptable mutable (Art. L102 B LPF).
 */

const { mockTransaction, mockAcquireLock, mockCreateAudit, mockFindUnique, mockUpdate } =
	vi.hoisted(() => ({
		mockTransaction: vi.fn(),
		mockAcquireLock: vi.fn(),
		mockCreateAudit: vi.fn(),
		mockFindUnique: vi.fn(),
		mockUpdate: vi.fn(),
	}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { $transaction: mockTransaction },
}));

vi.mock("@/modules/orders/utils/order-paid-lock", () => ({
	acquireOrderPaidLockTx: mockAcquireLock,
}));

vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateAudit,
}));

vi.mock("@/app/generated/prisma/client", () => ({
	HistorySource: { CUSTOMER: "CUSTOMER", ADMIN: "ADMIN" },
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { updatePendingOrderShippingSnapshot } from "../update-pending-order-shipping-snapshot.service";

const CURRENT = {
	paymentStatus: "PENDING",
	customerName: "Marie Dupont",
	customerEmail: "marie@example.com",
	shippingFirstName: "Marie",
	shippingLastName: "Dupont",
	shippingAddress1: "12 rue des Lilas",
	shippingAddress2: null,
	shippingPostalCode: "44000",
	shippingCity: "Nantes",
	shippingCountry: "FR",
	shippingPhone: "+33600000000",
};

const CORRECTED = {
	firstName: "Marie",
	lastName: "Dupont",
	address1: "14 rue des Lilas", // ← la correction
	address2: null,
	postalCode: "44000",
	city: "Nantes",
	country: "FR",
	phone: "+33600000000",
	customerName: "Marie Dupont",
	customerEmail: "marie@example.com",
};

const tx = {
	order: { findUnique: mockFindUnique, update: mockUpdate },
};

beforeEach(() => {
	vi.clearAllMocks();
	mockTransaction.mockImplementation((cb: (t: unknown) => unknown) => cb(tx));
	mockFindUnique.mockResolvedValue({ ...CURRENT });
	mockUpdate.mockResolvedValue({});
});

describe("updatePendingOrderShippingSnapshot", () => {
	it("corrige le snapshot et ne rapporte QUE le champ modifié", async () => {
		const result = await updatePendingOrderShippingSnapshot({
			orderId: "order_1",
			shipping: CORRECTED,
		});

		expect(result).toEqual({ updated: true, changedFields: ["shippingAddress1"] });
		expect(mockUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "order_1" },
				data: expect.objectContaining({ shippingAddress1: "14 rue des Lilas" }),
			}),
		);
	});

	it("prend l'advisory lock AVANT de lire le statut", async () => {
		await updatePendingOrderShippingSnapshot({
			orderId: "order_1",
			shipping: CORRECTED,
		});

		expect(mockAcquireLock).toHaveBeenCalledWith(tx, "order_1");
		expect(mockAcquireLock.mock.invocationCallOrder[0]!).toBeLessThan(
			mockFindUnique.mock.invocationCallOrder[0]!,
		);
	});

	it("REFUSE d'écrire sur une commande PAID — le webhook a gagné la course", async () => {
		// Le cas critique : sans cette garde, on réécrirait l'adresse d'une commande
		// encaissée, donc d'une pièce comptable dont la facture est déjà figée.
		mockFindUnique.mockResolvedValue({ ...CURRENT, paymentStatus: "PAID" });

		const result = await updatePendingOrderShippingSnapshot({
			orderId: "order_1",
			shipping: CORRECTED,
		});

		expect(result).toEqual({ updated: false, reason: "not-pending" });
		expect(mockUpdate).not.toHaveBeenCalled();
		expect(mockCreateAudit).not.toHaveBeenCalled();
	});

	it.each(["FAILED", "REFUNDED", "PARTIALLY_REFUNDED"])(
		"REFUSE d'écrire sur un paymentStatus %s",
		async (paymentStatus) => {
			mockFindUnique.mockResolvedValue({ ...CURRENT, paymentStatus });

			const result = await updatePendingOrderShippingSnapshot({
				orderId: "order_1",
				shipping: CORRECTED,
			});

			expect(result).toEqual({ updated: false, reason: "not-pending" });
			expect(mockUpdate).not.toHaveBeenCalled();
		},
	);

	it("n'écrit rien quand l'adresse est inchangée (double-clic, retry réseau)", async () => {
		const result = await updatePendingOrderShippingSnapshot({
			orderId: "order_1",
			shipping: {
				firstName: CURRENT.shippingFirstName,
				lastName: CURRENT.shippingLastName,
				address1: CURRENT.shippingAddress1,
				address2: CURRENT.shippingAddress2,
				postalCode: CURRENT.shippingPostalCode,
				city: CURRENT.shippingCity,
				country: CURRENT.shippingCountry,
				phone: CURRENT.shippingPhone,
				customerName: CURRENT.customerName,
				customerEmail: CURRENT.customerEmail,
			},
		});

		expect(result).toEqual({ updated: false, reason: "no-change" });
		expect(mockUpdate).not.toHaveBeenCalled();
		expect(mockCreateAudit).not.toHaveBeenCalled();
	});

	it("rapporte not-found sur une commande absente", async () => {
		mockFindUnique.mockResolvedValue(null);

		const result = await updatePendingOrderShippingSnapshot({
			orderId: "order_gone",
			shipping: CORRECTED,
		});

		expect(result).toEqual({ updated: false, reason: "not-found" });
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it("pose un audit CUSTOMER sans aucune PII : authorName neutre, metadata sans valeurs", async () => {
		// OrderHistory est immuable 10 ans et n'est jamais scrubé à l'anonymisation RGPD :
		// ni le nom du client, ni les valeurs d'adresse ne doivent y entrer.
		await updatePendingOrderShippingSnapshot({
			orderId: "order_1",
			shipping: CORRECTED,
		});

		expect(mockCreateAudit).toHaveBeenCalledTimes(1);
		const audit = mockCreateAudit.mock.calls[0]![1] as Record<string, unknown>;

		expect(audit.action).toBe("ADDRESS_UPDATED");
		expect(audit.source).toBe("CUSTOMER");
		expect(audit.authorName).toBe("Client");
		// La colonne `OrderHistory.authorId` a disparu (audit V2, Lot 1 — ~35
		// écrivains, zéro lecteur) ; elle était de toute façon déjà NULL ici depuis
		// le retrait de `Order.userId`. Le libellé neutre « Client » reste, c'est
		// lui qui porte l'invariant RGPD.
		expect(audit.metadata).toEqual({
			addressType: "shipping",
			changedFields: ["shippingAddress1"],
		});

		// Aucune valeur d'adresse nulle part dans l'entrée d'audit.
		const serialized = JSON.stringify(audit);
		expect(serialized).not.toContain("14 rue des Lilas");
		expect(serialized).not.toContain("Nantes");
		expect(serialized).not.toContain("+33600000000");
	});

	it("trace un invité (pas de compte) sans casser l'audit", async () => {
		await updatePendingOrderShippingSnapshot({
			orderId: "order_1",
			shipping: CORRECTED,
		});

		const audit = mockCreateAudit.mock.calls[0]![1] as Record<string, unknown>;
		expect(audit.authorName).toBe("Client");
	});

	it("détecte une correction sur chacun des champs hors-montant", async () => {
		// ⚠️ Les 10 colonnes, sans exception. `postalCode` et `country` manquaient
		// jusqu'au 2026-08-07 : un bug de mapping sur l'un des deux serait passé au vert
		// alors même que le service les écrit. `address1` est couvert par le 1ᵉʳ test.
		const cases: Array<[keyof typeof CORRECTED, unknown, string]> = [
			["firstName", "Marion", "shippingFirstName"],
			["lastName", "Duval", "shippingLastName"],
			["address2", "Appartement 4", "shippingAddress2"],
			["postalCode", "44100", "shippingPostalCode"],
			["city", "Nantes Sud", "shippingCity"],
			["country", "BE", "shippingCountry"],
			["phone", "+33611111111", "shippingPhone"],
			["customerName", "Marion Duval", "customerName"],
			["customerEmail", "marion@example.com", "customerEmail"],
		];

		for (const [field, value, expectedColumn] of cases) {
			vi.clearAllMocks();
			mockTransaction.mockImplementation((cb: (t: unknown) => unknown) => cb(tx));
			mockFindUnique.mockResolvedValue({ ...CURRENT });

			const result = await updatePendingOrderShippingSnapshot({
				orderId: "order_1",
				shipping: { ...CORRECTED, address1: CURRENT.shippingAddress1, [field]: value },
			});

			expect(result).toEqual({ updated: true, changedFields: [expectedColumn] });
		}
	});

	/**
	 * @regression pending-snapshot-corrects-customer-identity-2026-08-07
	 *
	 * Le service ne réécrivait QUE les 8 `shipping*`. Il fermait donc KI-001 pour
	 * l'adresse en laissant le même défaut sur l'identité : `customerName` divergeait de
	 * `shippingFirstName + shippingLastName` (or il est recomposé du MÊME `fullName`), et
	 * surtout `customerEmail` restait fautif — donc l'email de confirmation, et avec lui
	 * l'UNIQUE lien de suivi HMAC de la cliente, repartait à l'adresse erronée.
	 */
	it("corrige AUSSI le nom et l'email quand le client les rectifie en resoumettant", async () => {
		const result = await updatePendingOrderShippingSnapshot({
			orderId: "order_1",
			shipping: {
				...CORRECTED,
				address1: CURRENT.shippingAddress1,
				firstName: "Marion",
				lastName: "Duval",
				customerName: "Marion Duval",
				customerEmail: "marion@example.com",
			},
		});

		expect(result).toEqual({
			updated: true,
			changedFields: ["customerName", "customerEmail", "shippingFirstName", "shippingLastName"],
		});
		expect(mockUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "order_1" },
				data: expect.objectContaining({
					customerName: "Marion Duval",
					customerEmail: "marion@example.com",
					shippingFirstName: "Marion",
					shippingLastName: "Duval",
				}),
			}),
		);
	});

	it("ne laisse NI le nom NI l'email entrer dans l'audit immuable", async () => {
		// Même exigence RGPD que pour l'adresse : `OrderHistory` survit 10 ans sans être
		// scrubé avant l'échéance. Seuls des NOMS de champs peuvent y figurer.
		await updatePendingOrderShippingSnapshot({
			orderId: "order_1",
			shipping: {
				...CORRECTED,
				address1: CURRENT.shippingAddress1,
				customerName: "Marion Duval",
				customerEmail: "marion@example.com",
			},
		});

		const audit = mockCreateAudit.mock.calls[0]![1] as Record<string, unknown>;
		const serialized = JSON.stringify(audit);
		expect(serialized).not.toContain("Marion Duval");
		expect(serialized).not.toContain("marion@example.com");
		expect(audit.metadata).toEqual({
			addressType: "shipping",
			changedFields: ["customerName", "customerEmail"],
		});
	});
});
