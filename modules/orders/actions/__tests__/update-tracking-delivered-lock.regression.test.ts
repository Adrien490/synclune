/**
 * @regression ORD-BIZ-006
 *
 * Garantit que `updateTracking` refuse la modification de tracking au-delà de
 * 30 jours après `actualDelivery` (préservation de la preuve de livraison).
 *
 * Sans cette régression : un admin peut écraser silencieusement la preuve de
 * livraison post-litige, post-réclamation transporteur, ou pour fraude interne.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";
import type * as SharedActions from "@/shared/lib/actions";
import type * as OrderConstants from "../../constants/order.constants";

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSendTrackingEmail,
	mockCreateOrderAuditTx,
	mockGetOrderMetadataInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn((e: Error, fallback: string) => ({
		status: "error",
		message: e.message || fallback,
	})),
	mockSendTrackingEmail: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockGetOrderMetadataInvalidationTags: vi.fn().mockReturnValue([]),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdminWithUser,
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", async (importOriginal) => {
	const original = await importOriginal<typeof SharedActions>();
	return {
		...original,
		safeFormGet: (formData: FormData, key: string) => {
			const v = formData.get(key);
			return typeof v === "string" ? v : null;
		},
		handleActionError: mockHandleActionError,
	};
});
vi.mock("@/modules/emails/services/order-emails", () => ({
	sendTrackingUpdateEmail: mockSendTrackingEmail,
}));
vi.mock("../../utils/order-audit", () => ({ createOrderAuditTx: mockCreateOrderAuditTx }));
vi.mock("../../constants/order.constants", async (importOriginal) => {
	const actual = await importOriginal<typeof OrderConstants>();
	return {
		...actual,
		ORDER_ERROR_MESSAGES: { ...actual.ORDER_ERROR_MESSAGES, NOT_FOUND: "Commande introuvable." },
	};
});
vi.mock("../../constants/cache", () => ({
	getOrderMetadataInvalidationTags: mockGetOrderMetadataInvalidationTags,
}));
vi.mock("@/modules/orders/utils/carrier.utils", () => ({
	getTrackingUrl: vi.fn().mockReturnValue("https://carrier/track"),
	getCarrierLabel: vi.fn().mockReturnValue("La Poste"),
}));
vi.mock("../../utils/customer-name", () => ({
	extractCustomerFirstName: vi.fn().mockReturnValue("Client"),
}));

import { updateTracking } from "../update-tracking";

function makeForm() {
	return createMockFormData({
		id: VALID_CUID,
		trackingNumber: "8N12345678901",
		carrier: "colissimo",
		sendEmail: "false",
	});
}

describe("ORD-BIZ-006 — update-tracking refuse modification > 30j après livraison", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin" },
		});
		mockEnforceRateLimit.mockResolvedValue({ rateLimited: false });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) =>
			fn(mockPrisma),
		);
		mockPrisma.order.update.mockResolvedValue({});
	});

	it("autorise modification si SHIPPED (actualDelivery encore null)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			id: VALID_CUID,
			orderNumber: "SYN-001",
			status: "SHIPPED",
			fulfillmentStatus: "SHIPPED",
			userId: "u-1",
			customerEmail: null,
			customerName: null,
			shippingFirstName: null,
			shippingLastName: null,
			shippingAddress1: null,
			shippingAddress2: null,
			shippingPostalCode: null,
			shippingCity: null,
			shippingCountry: null,
			trackingNumber: "old123",
			actualDelivery: null,
		});

		const result = await updateTracking(undefined, makeForm());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockCreateOrderAuditTx).toHaveBeenCalled();
	});

	it("autorise modification si DELIVERED il y a moins de 30 jours", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			id: VALID_CUID,
			orderNumber: "SYN-001",
			status: "DELIVERED",
			fulfillmentStatus: "DELIVERED",
			userId: "u-1",
			customerEmail: null,
			customerName: null,
			shippingFirstName: null,
			shippingLastName: null,
			shippingAddress1: null,
			shippingAddress2: null,
			shippingPostalCode: null,
			shippingCity: null,
			shippingCountry: null,
			trackingNumber: "old123",
			actualDelivery: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 jours
		});

		const result = await updateTracking(undefined, makeForm());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockCreateOrderAuditTx).toHaveBeenCalled();
	});

	it("refuse modification si DELIVERED il y a plus de 30 jours (preuve verrouillée)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			id: VALID_CUID,
			orderNumber: "SYN-001",
			status: "DELIVERED",
			fulfillmentStatus: "DELIVERED",
			userId: "u-1",
			customerEmail: null,
			customerName: null,
			shippingFirstName: null,
			shippingLastName: null,
			shippingAddress1: null,
			shippingAddress2: null,
			shippingPostalCode: null,
			shippingCity: null,
			shippingCountry: null,
			trackingNumber: "old123",
			actualDelivery: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 jours
		});

		const result = await updateTracking(undefined, makeForm());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/30 jours/i);
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
	});
});
