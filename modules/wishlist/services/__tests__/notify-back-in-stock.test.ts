import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockSendBackInStockEmail, mockLogger, mockCaptureWishlistError, mockDelay } =
	vi.hoisted(() => ({
		mockPrisma: {
			// `count` alimente le budget marketing quotidien (audit coûts P1-3) :
			// sans lui, `remainingMarketingBudget()` throw et TOUS les envois sont
			// avalés par le catch externe — la suite passerait au vert sans qu'un
			// seul email ne parte.
			wishlistItem: { findMany: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
		},
		mockSendBackInStockEmail: vi.fn(),
		mockLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
		mockCaptureWishlistError: vi.fn(),
		// Throttle anti-rate-limit : mocké en no-op pour ne pas ralentir la suite.
		mockDelay: vi.fn().mockResolvedValue(undefined),
	}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));
vi.mock("@/modules/emails/services/wishlist-emails", () => ({
	sendBackInStockEmail: mockSendBackInStockEmail,
}));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: vi.fn((path: string) => `https://synclune.fr${path}`),
	ROUTES: {
		SHOP: { PRODUCTS: "/produits" },
		NOTIFICATIONS: { UNSUBSCRIBE: "/notifications/desinscription" },
	},
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));
vi.mock("@/modules/wishlist/utils/capture-wishlist-error", () => ({
	captureWishlistError: mockCaptureWishlistError,
}));
vi.mock("@/shared/utils/delay", () => ({
	delay: mockDelay,
}));
vi.mock("@sentry/nextjs", () => ({
	// startSpan executes the callback with a no-op span so attributes are recorded harmlessly
	startSpan: vi.fn(
		async (
			_options: { name: string; attributes?: Record<string, unknown> },
			cb: (span: { setAttribute: (k: string, v: unknown) => void }) => Promise<void> | void,
		) => cb({ setAttribute: () => {} }),
	),
}));

import { MARKETING_DAILY_EMAIL_BUDGET } from "@/modules/emails/constants/email-budget";
import { notifyBackInStock } from "../notify-back-in-stock";

// ============================================================================
// HELPERS
// ============================================================================

function makeWishlistItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "wi-1",
		wishlist: {
			user: { email: "client@example.com", name: "Marie" },
		},
		product: {
			title: "Bracelet Lune",
			slug: "bracelet-lune",
			skus: [{ images: [{ url: "https://utfs.io/f/bracelet-lune.jpg" }] }],
		},
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("notifyBackInStock", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPrisma.wishlistItem.findMany.mockResolvedValue([]);
		mockPrisma.wishlistItem.updateMany.mockResolvedValue({ count: 0 });
		// Aucun envoi marketing encore effectué aujourd'hui => budget complet.
		mockPrisma.wishlistItem.count.mockResolvedValue(0);
		mockSendBackInStockEmail.mockResolvedValue({ success: true });
		mockDelay.mockResolvedValue(undefined);
	});

	it("throttle les envois (pause entre items, sautée sur le dernier du lot)", async () => {
		const items = [
			makeWishlistItem({ id: "wi-1" }),
			makeWishlistItem({ id: "wi-2" }),
			makeWishlistItem({ id: "wi-3" }),
		];
		mockPrisma.wishlistItem.findMany.mockResolvedValueOnce(items).mockResolvedValueOnce([]);

		await notifyBackInStock("prod-1");

		// 3 envois → 2 pauses (pas de pause après le dernier).
		expect(mockSendBackInStockEmail).toHaveBeenCalledTimes(3);
		expect(mockDelay).toHaveBeenCalledTimes(2);
	});

	it("returns early when no wishlist items found", async () => {
		await notifyBackInStock("prod-1");

		expect(mockSendBackInStockEmail).not.toHaveBeenCalled();
	});

	it("queries wishlist items for correct product with correct filters", async () => {
		await notifyBackInStock("prod-1");

		const call = mockPrisma.wishlistItem.findMany.mock.calls[0]![0];
		expect(call.where.productId).toBe("prod-1");
		expect(call.where.backInStockNotifiedAt).toBeNull();
		expect(call.where.wishlist.userId).toEqual({ not: null });
		expect(call.where.wishlist.user.deletedAt).toBeNull();
		// `take` = min(taille de lot, budget marketing restant). Le budget (40)
		// étant inférieur à la taille de lot (50), c'est lui qui borne la requête.
		expect(call.take).toBe(MARKETING_DAILY_EMAIL_BUDGET);
		expect(call.orderBy).toEqual({ id: "asc" });
	});

	it("excludes users who opted out of marketing (RGPD-AUDIT P1-1, Art. 21)", async () => {
		await notifyBackInStock("prod-1");

		const call = mockPrisma.wishlistItem.findMany.mock.calls[0]![0];
		expect(call.where.wishlist.user.marketingOptOutAt).toBeNull();
	});

	/**
	 * @regression biz-bug-002
	 * Ne jamais envoyer d'email « revenu en stock » pour un produit non
	 * achetable (archivé, brouillon, soft-deleted) — le lien produit mènerait
	 * à une 404. Le filtre vit dans la clause `where` Prisma.
	 */
	it("[regression biz-bug-002] restricts to PUBLIC, non-deleted products via where clause", async () => {
		await notifyBackInStock("prod-1");

		const call = mockPrisma.wishlistItem.findMany.mock.calls[0]![0];
		expect(call.where.product).toEqual({
			status: "PUBLIC",
			deletedAt: null,
		});
	});

	it("sends email to all eligible wishlist users", async () => {
		const items = [
			makeWishlistItem({ id: "wi-1" }),
			makeWishlistItem({
				id: "wi-2",
				wishlist: { user: { email: "other@example.com", name: "Sophie" } },
			}),
		];
		mockPrisma.wishlistItem.findMany.mockResolvedValue(items);

		await notifyBackInStock("prod-1");

		expect(mockSendBackInStockEmail).toHaveBeenCalledTimes(2);
		expect(mockSendBackInStockEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				productTitle: "Bracelet Lune",
			}),
		);
		expect(mockSendBackInStockEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "other@example.com",
			}),
		);
	});

	it("batch-marks items as notified after successful emails", async () => {
		mockPrisma.wishlistItem.findMany.mockResolvedValue([makeWishlistItem()]);

		await notifyBackInStock("prod-1");

		expect(mockPrisma.wishlistItem.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: ["wi-1"] } },
				data: { backInStockNotifiedAt: expect.any(Date) },
			}),
		);
	});

	it("skips marking when email send fails", async () => {
		mockPrisma.wishlistItem.findMany.mockResolvedValue([makeWishlistItem()]);
		mockSendBackInStockEmail.mockResolvedValue({ success: false });

		await notifyBackInStock("prod-1");

		expect(mockPrisma.wishlistItem.updateMany).not.toHaveBeenCalled();
	});

	it("skips items with no user", async () => {
		const itemNoUser = makeWishlistItem({ wishlist: { user: null } });
		mockPrisma.wishlistItem.findMany.mockResolvedValue([itemNoUser]);

		await notifyBackInStock("prod-1");

		expect(mockSendBackInStockEmail).not.toHaveBeenCalled();
	});

	it("skips items with no product", async () => {
		const itemNoProduct = makeWishlistItem({ product: null });
		mockPrisma.wishlistItem.findMany.mockResolvedValue([itemNoProduct]);

		await notifyBackInStock("prod-1");

		expect(mockSendBackInStockEmail).not.toHaveBeenCalled();
	});

	it("does not throw when outer DB query fails (non-blocking)", async () => {
		mockPrisma.wishlistItem.findMany.mockRejectedValue(new Error("DB connection lost"));

		// Should not throw
		// Ne throw jamais et renvoie 0 envoi (le compteur de budget consommé).
		await expect(notifyBackInStock("prod-1")).resolves.toBe(0);
	});

	it("does not throw when individual email send throws", async () => {
		mockPrisma.wishlistItem.findMany.mockResolvedValue([makeWishlistItem()]);
		mockSendBackInStockEmail.mockRejectedValue(new Error("SMTP down"));

		// Should not throw
		// Ne throw jamais et renvoie 0 envoi (le compteur de budget consommé).
		await expect(notifyBackInStock("prod-1")).resolves.toBe(0);
	});

	it("continues processing remaining items when one email fails (no retry recovery)", async () => {
		const items = [
			makeWishlistItem({ id: "wi-1" }),
			makeWishlistItem({
				id: "wi-2",
				wishlist: { user: { email: "other@example.com", name: "Sophie" } },
			}),
		];
		mockPrisma.wishlistItem.findMany.mockResolvedValue(items);
		// wi-1: rejected on first try AND on retry (permanent failure)
		// wi-2: success on first try
		mockSendBackInStockEmail
			.mockRejectedValueOnce(new Error("fail"))
			.mockResolvedValueOnce({ success: true })
			.mockRejectedValueOnce(new Error("fail again"));

		await notifyBackInStock("prod-1");

		// 2 initial calls + 1 retry for wi-1
		expect(mockSendBackInStockEmail).toHaveBeenCalledTimes(3);
		// Only wi-2 should be batch-marked as notified (wi-1 permanently failed)
		expect(mockPrisma.wishlistItem.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: ["wi-2"] } },
			}),
		);
		// Sentry captured for the send-email throw AND the retry-exhausted
		expect(mockCaptureWishlistError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({ stage: "send-email", wishlistItemId: "wi-1" }),
		);
		expect(mockCaptureWishlistError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({ stage: "retry-exhausted", wishlistItemId: "wi-1" }),
		);
	});

	it("retries failed-email items once after main loop and marks them notified on success", async () => {
		const items = [
			makeWishlistItem({ id: "wi-1" }),
			makeWishlistItem({
				id: "wi-2",
				wishlist: { user: { email: "other@example.com", name: "Sophie" } },
			}),
		];
		mockPrisma.wishlistItem.findMany.mockResolvedValue(items);
		// wi-1: fails first, succeeds on retry
		// wi-2: succeeds first try
		mockSendBackInStockEmail
			.mockResolvedValueOnce({ success: false }) // wi-1 first call
			.mockResolvedValueOnce({ success: true }) // wi-2 first call
			.mockResolvedValueOnce({ success: true }); // wi-1 retry

		await notifyBackInStock("prod-1");

		expect(mockSendBackInStockEmail).toHaveBeenCalledTimes(3);
		// Initial pass marks wi-2
		expect(mockPrisma.wishlistItem.updateMany).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ where: { id: { in: ["wi-2"] } } }),
		);
		// Retry pass marks wi-1
		expect(mockPrisma.wishlistItem.updateMany).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ where: { id: { in: ["wi-1"] } } }),
		);
		// No Sentry capture: retry succeeded
		expect(mockCaptureWishlistError).not.toHaveBeenCalled();
	});

	it("captures Sentry error with stage send-email when send throws", async () => {
		mockPrisma.wishlistItem.findMany.mockResolvedValue([makeWishlistItem({ id: "wi-throw" })]);
		mockSendBackInStockEmail.mockRejectedValue(new Error("SMTP exploded"));

		await notifyBackInStock("prod-1");

		expect(mockCaptureWishlistError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "SMTP exploded" }),
			expect.objectContaining({
				service: "back-in-stock",
				stage: "send-email",
				productId: "prod-1",
				wishlistItemId: "wi-throw",
			}),
		);
	});

	it("captures Sentry error with stage outer-loop when DB query throws", async () => {
		mockPrisma.wishlistItem.findMany.mockRejectedValue(new Error("DB exploded"));

		await notifyBackInStock("prod-1");

		expect(mockCaptureWishlistError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "DB exploded" }),
			expect.objectContaining({
				service: "back-in-stock",
				stage: "outer-loop",
				productId: "prod-1",
			}),
		);
	});

	/**
	 * Le budget marketing quotidien (40) est INFÉRIEUR à la taille de lot (50) :
	 * c'est donc toujours lui qui borne la requête, et un run ne pagine jamais.
	 * La continuation se fait entre runs, pas dans un run — `backInStockNotifiedAt`
	 * exclut les items déjà notifiés, si bien que le drainage du lendemain
	 * re-interroge la file depuis le début et récupère naturellement le reliquat.
	 *
	 * La boucle de pagination reste en place (elle se réactive si le budget est
	 * relevé au-dessus de la taille de lot) mais ne doit pas être testée par un
	 * scénario que la configuration réelle rend inatteignable.
	 */
	it("ne fait qu'une page par run tant que le budget borne le lot", async () => {
		const fullPage = Array.from({ length: MARKETING_DAILY_EMAIL_BUDGET }, (_, i) =>
			makeWishlistItem({
				id: `wi-${i + 1}`,
				wishlist: { user: { email: `user${i + 1}@example.com`, name: `User ${i + 1}` } },
			}),
		);
		mockPrisma.wishlistItem.findMany.mockResolvedValue(fullPage);

		const sent = await notifyBackInStock("prod-1");

		expect(mockPrisma.wishlistItem.findMany).toHaveBeenCalledTimes(1);
		expect(sent).toBe(MARKETING_DAILY_EMAIL_BUDGET);
		expect(mockPrisma.wishlistItem.updateMany).toHaveBeenCalledTimes(1);
	});

	it("stops pagination when a batch comes back incomplete", async () => {
		const smallBatch = Array.from({ length: 3 }, (_, i) => makeWishlistItem({ id: `wi-${i + 1}` }));
		mockPrisma.wishlistItem.findMany.mockResolvedValueOnce(smallBatch);

		await notifyBackInStock("prod-1");

		// Un seul findMany : le lot est plus court que le `take` demandé.
		expect(mockPrisma.wishlistItem.findMany).toHaveBeenCalledTimes(1);
		expect(mockSendBackInStockEmail).toHaveBeenCalledTimes(3);
	});

	// ==========================================================================
	// BUDGET MARKETING QUOTIDIEN — audit coûts P1-3
	//
	// Resend Free plafonne à 100 emails/JOUR, partagés avec le transactionnel.
	// Sans borne, un réassort sur un produit à forte demande consommait le quota
	// du jour et faisait rejeter en 429 la confirmation de commande d'un client
	// achetant le même jour — email définitivement perdu (un 429 de quota
	// journalier ne se résorbe pas dans la fenêtre de retry).
	// ==========================================================================

	it("ne dépasse jamais le budget marketing du jour", async () => {
		// Bien plus d'inscrits que le budget ne permet d'en notifier.
		const crowd = Array.from({ length: MARKETING_DAILY_EMAIL_BUDGET + 25 }, (_, i) =>
			makeWishlistItem({
				id: `wi-${i + 1}`,
				wishlist: { user: { email: `user${i + 1}@example.com`, name: `User ${i + 1}` } },
			}),
		);
		mockPrisma.wishlistItem.findMany.mockImplementation(
			({ take }: { take: number }) => Promise.resolve(crowd.slice(0, take)) as never,
		);

		const sent = await notifyBackInStock("prod-1");

		expect(sent).toBe(MARKETING_DAILY_EMAIL_BUDGET);
		expect(mockSendBackInStockEmail).toHaveBeenCalledTimes(MARKETING_DAILY_EMAIL_BUDGET);
	});

	it("ne demande jamais plus d'items que le budget restant", async () => {
		mockPrisma.wishlistItem.count.mockResolvedValue(MARKETING_DAILY_EMAIL_BUDGET - 5);
		mockPrisma.wishlistItem.findMany.mockResolvedValue([]);

		await notifyBackInStock("prod-1");

		expect(mockPrisma.wishlistItem.findMany.mock.calls[0]![0].take).toBe(5);
	});

	it("n'envoie rien et ne requête pas la file quand le budget est épuisé", async () => {
		mockPrisma.wishlistItem.count.mockResolvedValue(MARKETING_DAILY_EMAIL_BUDGET);

		const sent = await notifyBackInStock("prod-1");

		expect(sent).toBe(0);
		expect(mockPrisma.wishlistItem.findMany).not.toHaveBeenCalled();
		expect(mockSendBackInStockEmail).not.toHaveBeenCalled();
	});

	it("laisse les inscrits non notifiés en file (pas de flag posé)", async () => {
		const crowd = Array.from({ length: MARKETING_DAILY_EMAIL_BUDGET + 10 }, (_, i) =>
			makeWishlistItem({ id: `wi-${i + 1}` }),
		);
		mockPrisma.wishlistItem.findMany.mockImplementation(
			({ take }: { take: number }) => Promise.resolve(crowd.slice(0, take)) as never,
		);

		await notifyBackInStock("prod-1");

		// Seuls les items réellement envoyés sont flaggés : les autres restent
		// `backInStockNotifiedAt: null` pour le drainage du lendemain.
		const flagged = mockPrisma.wishlistItem.updateMany.mock.calls.flatMap(
			(call) => (call[0] as { where: { id: { in: string[] } } }).where.id.in,
		);
		expect(flagged).toHaveLength(MARKETING_DAILY_EMAIL_BUDGET);
	});

	it("uses email as fallback when user has no name", async () => {
		const item = makeWishlistItem({
			wishlist: { user: { email: "noname@example.com", name: null } },
		});
		mockPrisma.wishlistItem.findMany.mockResolvedValue([item]);

		await notifyBackInStock("prod-1");

		expect(mockSendBackInStockEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				customerName: "noname@example.com",
			}),
		);
	});
});
