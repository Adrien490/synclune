import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockLogger, mockMergeCarts, mockMergeWishlists, mockUpdateTag } = vi.hoisted(
	() => ({
		mockPrisma: {
			user: { findUnique: vi.fn() },
			order: { updateMany: vi.fn() },
		},
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		mockMergeCarts: vi.fn(),
		mockMergeWishlists: vi.fn(),
		mockUpdateTag: vi.fn(),
	}),
);

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));

// Modules importés dynamiquement par handlePostLoginMerges — vi.mock intercepte
// aussi les import() (registre de modules Vitest).
vi.mock("@/modules/cart/actions/merge-carts", () => ({
	mergeCarts: mockMergeCarts,
}));

vi.mock("@/modules/wishlist/actions/merge-wishlists", () => ({
	mergeWishlists: mockMergeWishlists,
}));

// cart-session importe next/headers (indisponible hors requête) → mock avec la
// même validation UUID v4 stricte que l'implémentation réelle.
vi.mock("@/modules/cart/lib/cart-session", () => ({
	isValidCartSessionId: (value: unknown): boolean =>
		typeof value === "string" &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
}));

vi.mock("@/modules/wishlist/lib/wishlist-session", () => ({
	isValidUuidV4: (value: unknown): boolean =>
		typeof value === "string" &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		USER_ORDERS: (userId: string) => `user-orders-${userId}`,
	},
}));

import { handlePostLoginMerges, type PostLoginMergeContext } from "../post-login-merge";

// ============================================================================
// Constants & helpers
// ============================================================================

const USER_ID = "user-123";
const USER_EMAIL = "client@example.com";
const VALID_CART_SESSION = "550e8400-e29b-41d4-a716-446655440000";

function makeCtx(options: {
	newSession?: { user: { id: string; email?: string | null } } | null;
	cookies?: Record<string, string>;
}): PostLoginMergeContext & { setCookie: ReturnType<typeof vi.fn> } {
	const cookies = options.cookies ?? {};
	return {
		context: { newSession: options.newSession },
		getCookie: (name: string) => cookies[name] ?? null,
		setCookie: vi.fn(
			(_name: string, _value: string, _options?: { maxAge?: number; path?: string }) => undefined,
		),
	};
}

function mockActiveAccount(): void {
	mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: "ACTIVE" });
}

describe("handlePostLoginMerges", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockActiveAccount();
		mockMergeCarts.mockResolvedValue({ status: ActionStatus.SUCCESS, message: "ok" });
		mockMergeWishlists.mockResolvedValue({ status: ActionStatus.SUCCESS, message: "ok" });
		mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });
	});

	it("does nothing when no new session was created", async () => {
		const ctx = makeCtx({ newSession: null });

		await handlePostLoginMerges(ctx);

		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
		expect(mockMergeCarts).not.toHaveBeenCalled();
	});

	it("skips all merges when account is not ACTIVE (PENDING_DELETION reconnect)", async () => {
		mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });
		const ctx = makeCtx({
			newSession: { user: { id: USER_ID, email: USER_EMAIL } },
			cookies: { cart_session: VALID_CART_SESSION },
		});

		await handlePostLoginMerges(ctx);

		expect(mockMergeCarts).not.toHaveBeenCalled();
		expect(mockMergeWishlists).not.toHaveBeenCalled();
		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
	});

	it("merges the guest cart and clears the cookie on success", async () => {
		const ctx = makeCtx({
			newSession: { user: { id: USER_ID, email: USER_EMAIL } },
			cookies: { cart_session: VALID_CART_SESSION },
		});

		await handlePostLoginMerges(ctx);

		expect(mockMergeCarts).toHaveBeenCalledWith(USER_ID, VALID_CART_SESSION);
		expect(ctx.setCookie).toHaveBeenCalledWith("cart_session", "", {
			maxAge: 0,
			path: "/",
		});
	});

	it("preserves the cart cookie when the merge returns an error (retry at next login)", async () => {
		mockMergeCarts.mockResolvedValue({ status: ActionStatus.ERROR, message: "rate limited" });
		const ctx = makeCtx({
			newSession: { user: { id: USER_ID, email: USER_EMAIL } },
			cookies: { cart_session: VALID_CART_SESSION },
		});

		await handlePostLoginMerges(ctx);

		expect(mockMergeCarts).toHaveBeenCalled();
		expect(ctx.setCookie).not.toHaveBeenCalledWith("cart_session", "", expect.anything());
	});

	it("swallows a mergeCarts throw and preserves the cookie", async () => {
		mockMergeCarts.mockRejectedValue(new Error("DB down"));
		const ctx = makeCtx({
			newSession: { user: { id: USER_ID, email: USER_EMAIL } },
			cookies: { cart_session: VALID_CART_SESSION },
		});

		await expect(handlePostLoginMerges(ctx)).resolves.toBeUndefined();
		expect(ctx.setCookie).not.toHaveBeenCalledWith("cart_session", "", expect.anything());
	});

	it("does not call mergeCarts when the cart cookie is not a valid UUID v4", async () => {
		const ctx = makeCtx({
			newSession: { user: { id: USER_ID, email: USER_EMAIL } },
			cookies: { cart_session: "forged-non-uuid-value" },
		});

		await handlePostLoginMerges(ctx);

		expect(mockMergeCarts).not.toHaveBeenCalled();
	});

	it("does not call mergeCarts when no cart cookie is present", async () => {
		const ctx = makeCtx({ newSession: { user: { id: USER_ID, email: USER_EMAIL } } });

		await handlePostLoginMerges(ctx);

		expect(mockMergeCarts).not.toHaveBeenCalled();
	});

	it("merges the guest wishlist and clears its cookie on success (same contract as cart)", async () => {
		const ctx = makeCtx({
			newSession: { user: { id: USER_ID, email: USER_EMAIL } },
			cookies: { wishlist_session: VALID_CART_SESSION },
		});

		await handlePostLoginMerges(ctx);

		expect(mockMergeWishlists).toHaveBeenCalledWith(USER_ID, VALID_CART_SESSION);
		expect(ctx.setCookie).toHaveBeenCalledWith("wishlist_session", "", {
			maxAge: 0,
			path: "/",
		});
	});

	it("links guest orders by email and invalidates user order caches when some were linked", async () => {
		mockPrisma.order.updateMany.mockResolvedValue({ count: 2 });
		const ctx = makeCtx({ newSession: { user: { id: USER_ID, email: USER_EMAIL } } });

		await handlePostLoginMerges(ctx);

		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
			where: {
				userId: null,
				customerEmail: USER_EMAIL,
				deletedAt: null,
			},
			data: { userId: USER_ID },
		});
		expect(mockUpdateTag).toHaveBeenCalledWith(`user-orders-${USER_ID}`);
	});

	// AUDIT-BIZ-001 — le rattachement rétroactif est le SEUL pont entre une
	// commande invité et un compte : c'est lui qui rend honnête le CTA « Crée ton
	// compte » de la page de confirmation et du suivi tokenisé. Il repose sur une
	// égalité stricte `customerEmail === session.user.email`, or `Order.customerEmail`
	// est normalisé (`normalizeEmail` : trim + lowercase) dans `confirmCheckout`.
	// Toute dénormalisation en amont (ici ou côté Better Auth) casserait le pont en
	// SILENCE : aucune erreur, la commande n'apparaît simplement jamais dans
	// l'espace client. Ce test ancre l'invariant côté requête.
	it("matches guest orders on a normalized (lowercase) email — silent-break guard", async () => {
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
		const ctx = makeCtx({
			newSession: { user: { id: USER_ID, email: "Buyer.Mixed@Example.TEST" } },
		});

		await handlePostLoginMerges(ctx);

		const where = mockPrisma.order.updateMany.mock.calls[0]?.[0]?.where as {
			customerEmail: string;
		};
		expect(where.customerEmail).toBe("buyer.mixed@example.test");
	});

	it("does not invalidate order caches when no guest order was linked", async () => {
		mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });
		const ctx = makeCtx({ newSession: { user: { id: USER_ID, email: USER_EMAIL } } });

		await handlePostLoginMerges(ctx);

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("logs and continues when guest order linking fails", async () => {
		mockPrisma.order.updateMany.mockRejectedValue(new Error("DB down"));
		const ctx = makeCtx({ newSession: { user: { id: USER_ID, email: USER_EMAIL } } });

		await expect(handlePostLoginMerges(ctx)).resolves.toBeUndefined();
		expect(mockLogger.error).toHaveBeenCalledWith(
			"Guest order linking failed",
			expect.any(Error),
			expect.objectContaining({ service: "auth", userId: USER_ID }),
		);
	});
});
