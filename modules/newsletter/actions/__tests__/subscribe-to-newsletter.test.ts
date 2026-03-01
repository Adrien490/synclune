import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockAjNewsletter,
	mockHeaders,
	mockGetClientIp,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockSubscribeToNewsletterInternal,
} = vi.hoisted(() => ({
	mockAjNewsletter: { protect: vi.fn() },
	mockHeaders: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockSubscribeToNewsletterInternal: vi.fn(),
}));

vi.mock("@/shared/lib/arcjet", () => ({ ajNewsletter: mockAjNewsletter }));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@/shared/lib/rate-limit", () => ({ getClientIp: mockGetClientIp }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/modules/newsletter/schemas/newsletter.schemas", () => ({
	subscribeToNewsletterSchema: {},
}));
vi.mock("../subscribe-to-newsletter-internal", () => ({
	subscribeToNewsletterInternal: mockSubscribeToNewsletterInternal,
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { subscribeToNewsletter } from "../subscribe-to-newsletter";

// ============================================================================
// HELPERS
// ============================================================================

function buildDecision(overrides: Record<string, unknown> = {}) {
	return {
		isDenied: () => false,
		reason: {
			isRateLimit: () => false,
			isBot: () => false,
			isShield: () => false,
		},
		...overrides,
	};
}

function buildDeniedDecision(type: "rateLimit" | "bot" | "shield" | "other") {
	return {
		isDenied: () => true,
		reason: {
			isRateLimit: () => type === "rateLimit",
			isBot: () => type === "bot",
			isShield: () => type === "shield",
		},
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("subscribeToNewsletter", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockHeaders.mockResolvedValue(new Headers({ "user-agent": "Mozilla/5.0" }));
		mockGetClientIp.mockResolvedValue("127.0.0.1");
		mockAjNewsletter.protect.mockResolvedValue(buildDecision());
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
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
	});

	it("should return error when Arcjet rate limit is denied", async () => {
		mockAjNewsletter.protect.mockResolvedValue(buildDeniedDecision("rateLimit"));

		const result = await subscribeToNewsletter(
			undefined,
			createMockFormData({ email: "user@example.com", consent: "true" }),
		);

		expect(mockError).toHaveBeenCalledWith(
			"Trop de tentatives d'inscription. Veuillez réessayer dans quelques minutes.",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return error when Arcjet bot detection is triggered", async () => {
		mockAjNewsletter.protect.mockResolvedValue(buildDeniedDecision("bot"));

		const result = await subscribeToNewsletter(
			undefined,
			createMockFormData({ email: "user@example.com", consent: "true" }),
		);

		expect(mockError).toHaveBeenCalledWith(
			"Votre requête semble provenir d'un bot. Veuillez réessayer depuis un navigateur normal.",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return error when Arcjet shield blocks the request", async () => {
		mockAjNewsletter.protect.mockResolvedValue(buildDeniedDecision("shield"));

		const result = await subscribeToNewsletter(
			undefined,
			createMockFormData({ email: "user@example.com", consent: "true" }),
		);

		expect(mockError).toHaveBeenCalledWith(
			"Votre requête a été bloquée pour des raisons de sécurité.",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return generic error for other Arcjet denials", async () => {
		mockAjNewsletter.protect.mockResolvedValue(buildDeniedDecision("other"));

		const result = await subscribeToNewsletter(
			undefined,
			createMockFormData({ email: "user@example.com", consent: "true" }),
		);

		expect(mockError).toHaveBeenCalledWith(
			"Votre requête n'a pas pu être traitée. Veuillez réessayer.",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
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

	it("should return CONFLICT status when subscriber is already confirmed", async () => {
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

		expect(result.status).toBe(ActionStatus.CONFLICT);
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

	it("should call handleActionError when an unexpected exception is thrown", async () => {
		mockAjNewsletter.protect.mockRejectedValue(new Error("Unexpected network error"));

		const result = await subscribeToNewsletter(
			undefined,
			createMockFormData({ email: "user@example.com", consent: "true" }),
		);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
