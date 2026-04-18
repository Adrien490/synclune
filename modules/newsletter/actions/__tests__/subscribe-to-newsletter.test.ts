import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockHeaders,
	mockGetClientIp,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockConflict,
	mockSubscribeToNewsletterInternal,
} = vi.hoisted(() => ({
	mockHeaders: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockConflict: vi.fn(),
	mockSubscribeToNewsletterInternal: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@/shared/lib/rate-limit", () => ({ getClientIp: mockGetClientIp }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	conflict: mockConflict,
}));
vi.mock("@/modules/newsletter/schemas/newsletter.schemas", () => ({
	subscribeToNewsletterSchema: {},
}));
vi.mock("../../services/subscribe-to-newsletter-internal", () => ({
	subscribeToNewsletterInternal: mockSubscribeToNewsletterInternal,
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { subscribeToNewsletter } from "../subscribe-to-newsletter";

// ============================================================================
// TESTS
// ============================================================================

describe("subscribeToNewsletter", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockHeaders.mockResolvedValue(new Headers({ "user-agent": "Mozilla/5.0" }));
		mockGetClientIp.mockResolvedValue("127.0.0.1");
		mockValidateInput.mockReturnValue({ data: { email: "user@example.com", consent: true } });
		mockSubscribeToNewsletterInternal.mockResolvedValue({
			success: true,
			message: "Merci ! Un email de confirmation vous a été envoyé.",
		});
		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockConflict.mockImplementation((msg: string) => ({
			status: ActionStatus.CONFLICT,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
	});

	it("should return validation error when input is invalid", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "Email invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await subscribeToNewsletter(
			undefined,
			createMockFormData({ email: "not-an-email", consent: "false" }),
		);

		expect(result).toEqual(validationError);
		expect(mockSubscribeToNewsletterInternal).not.toHaveBeenCalled();
	});

	it("should return error when internal subscription fails", async () => {
		mockSubscribeToNewsletterInternal.mockResolvedValue({
			success: false,
			message: "Une erreur est survenue lors de l'inscription à la newsletter.",
		});

		const result = await subscribeToNewsletter(
			undefined,
			createMockFormData({ email: "user@example.com", consent: "true" }),
		);

		expect(mockError).toHaveBeenCalledWith(
			"Une erreur est survenue lors de l'inscription à la newsletter.",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return SUCCESS (not CONFLICT) when subscriber already confirmed (anti-enumeration)", async () => {
		mockSubscribeToNewsletterInternal.mockResolvedValue({
			success: true,
			alreadySubscribed: true,
			message:
				"Si cette adresse n'est pas encore inscrite, un email de confirmation vous a été envoyé.",
		});

		const result = await subscribeToNewsletter(
			undefined,
			createMockFormData({ email: "user@example.com", consent: "true" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe(
			"Si cette adresse n'est pas encore inscrite, un email de confirmation vous a été envoyé.",
		);
	});

	it("should return success when subscription succeeds", async () => {
		mockSubscribeToNewsletterInternal.mockResolvedValue({
			success: true,
			message: "Merci ! Un email de confirmation vous a été envoyé.",
		});

		const result = await subscribeToNewsletter(
			undefined,
			createMockFormData({ email: "user@example.com", consent: "true" }),
		);

		expect(mockSuccess).toHaveBeenCalledWith("Merci ! Un email de confirmation vous a été envoyé.");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should pass email, ip and userAgent to the internal function", async () => {
		mockHeaders.mockResolvedValue(new Headers({ "user-agent": "TestBrowser/1.0" }));
		mockGetClientIp.mockResolvedValue("192.168.1.1");
		mockValidateInput.mockReturnValue({ data: { email: "confirmed@example.com", consent: true } });

		await subscribeToNewsletter(
			undefined,
			createMockFormData({ email: "confirmed@example.com", consent: "true" }),
		);

		expect(mockSubscribeToNewsletterInternal).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "confirmed@example.com",
				consentSource: "newsletter_form",
			}),
		);
	});
});
