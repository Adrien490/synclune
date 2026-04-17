import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

const {
	mockPrisma,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockNotFound,
	mockHandleActionError,
	mockLogAudit,
	mockSubscribeInternal,
} = vi.hoisted(() => ({
	mockPrisma: { order: { findFirst: vi.fn() } },
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockLogAudit: vi.fn(),
	mockSubscribeInternal: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
	handleActionError: mockHandleActionError,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/shared/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock("../../services/subscribe-to-newsletter-internal", () => ({
	subscribeToNewsletterInternal: mockSubscribeInternal,
}));
vi.mock("../../schemas/newsletter.schemas", () => ({ subscribeFromCheckoutSchema: {} }));

import { subscribeFromCheckout } from "../subscribe-from-checkout";

describe("subscribeFromCheckout", () => {
	const VALID_INPUT = { email: "buyer@test.fr", orderId: "order_1" };

	beforeEach(() => {
		vi.resetAllMocks();
		mockValidateInput.mockReturnValue({ data: VALID_INPUT });
		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockNotFound.mockImplementation((msg: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
	});

	it("returns validation error when input invalid", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.ERROR, message: "Format invalide" },
		});
		const result = await subscribeFromCheckout(VALID_INPUT);
		expect(result.message).toBe("Format invalide");
	});

	it("returns notFound when order does not exist", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);
		const result = await subscribeFromCheckout(VALID_INPUT);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockSubscribeInternal).not.toHaveBeenCalled();
	});

	it("returns error when order has newsletterOptIn=false (anti-tampering)", async () => {
		mockPrisma.order.findFirst.mockResolvedValue({
			id: "order_1",
			newsletterOptIn: false,
			userId: null,
			orderNumber: "ORD-001",
		});
		const result = await subscribeFromCheckout(VALID_INPUT);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockSubscribeInternal).not.toHaveBeenCalled();
	});

	it("delegates to subscribeToNewsletterInternal with checkout_form consent source", async () => {
		mockPrisma.order.findFirst.mockResolvedValue({
			id: "order_1",
			newsletterOptIn: true,
			userId: "user_a",
			orderNumber: "ORD-001",
		});
		mockSubscribeInternal.mockResolvedValue({
			success: true,
			message: "Inscription OK",
			alreadySubscribed: false,
		});
		const result = await subscribeFromCheckout(VALID_INPUT);
		expect(mockSubscribeInternal).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "buyer@test.fr",
				consentSource: "checkout_form",
			}),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("logs audit with orderId, orderNumber and userId metadata on success", async () => {
		mockPrisma.order.findFirst.mockResolvedValue({
			id: "order_1",
			newsletterOptIn: true,
			userId: "user_a",
			orderNumber: "ORD-001",
		});
		mockSubscribeInternal.mockResolvedValue({ success: true, message: "OK" });
		await subscribeFromCheckout(VALID_INPUT);
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "newsletter.checkoutSubscribe",
				metadata: expect.objectContaining({
					orderId: "order_1",
					orderNumber: "ORD-001",
					userId: "user_a",
				}),
			}),
		);
	});

	it("propagates internal service failure as error", async () => {
		mockPrisma.order.findFirst.mockResolvedValue({
			id: "order_1",
			newsletterOptIn: true,
			userId: null,
			orderNumber: "ORD-001",
		});
		mockSubscribeInternal.mockResolvedValue({ success: false, message: "Email envoi échoué" });
		const result = await subscribeFromCheckout(VALID_INPUT);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Email envoi");
	});

	it("is idempotent when subscriber already CONFIRMED (alreadySubscribed flag)", async () => {
		mockPrisma.order.findFirst.mockResolvedValue({
			id: "order_1",
			newsletterOptIn: true,
			userId: null,
			orderNumber: "ORD-001",
		});
		mockSubscribeInternal.mockResolvedValue({
			success: true,
			message: "Déjà inscrit",
			alreadySubscribed: true,
		});
		const result = await subscribeFromCheckout(VALID_INPUT);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ alreadySubscribed: true });
	});

	it("calls handleActionError on DB exception", async () => {
		mockPrisma.order.findFirst.mockRejectedValue(new Error("DB"));
		const result = await subscribeFromCheckout(VALID_INPUT);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalled();
	});
});
