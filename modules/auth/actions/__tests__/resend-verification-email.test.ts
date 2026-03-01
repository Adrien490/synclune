import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockAuth,
	mockHeaders,
	mockCheckArcjet,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockBuildUrl,
} = vi.hoisted(() => ({
	mockAuth: {
		api: {
			sendVerificationEmail: vi.fn(),
		},
	},
	mockHeaders: vi.fn(),
	mockCheckArcjet: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockBuildUrl: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("../../utils/arcjet-protection", () => ({ checkArcjetProtection: mockCheckArcjet }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { AUTH: { VERIFY_EMAIL: "/verifier-email" } },
}));
vi.mock("../schemas/auth.schemas", () => ({ resendVerificationEmailSchema: {} }));

import { resendVerificationEmail } from "../resend-verification-email";

// ============================================================================
// HELPERS
// ============================================================================

const EXPECTED_SUCCESS_MESSAGE =
	"Si cet email est enregistré et non vérifié, vous recevrez un nouveau lien de vérification.";

const validFormData = createMockFormData({ email: "user@example.com" });
const validatedData = { email: "user@example.com" };

// ============================================================================
// TESTS
// ============================================================================

describe("resendVerificationEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockHeaders.mockResolvedValue(new Headers());
		mockCheckArcjet.mockResolvedValue(null);
		mockValidateInput.mockReturnValue({ data: { ...validatedData } });
		mockAuth.api.sendVerificationEmail.mockResolvedValue(undefined);
		mockBuildUrl.mockReturnValue("https://synclune.fr/verifier-email");

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
	});

	it("should block when Arcjet protection triggers", async () => {
		const arcjetError = { status: ActionStatus.ERROR, message: "Trop de tentatives" };
		mockCheckArcjet.mockResolvedValue(arcjetError);

		const result = await resendVerificationEmail(undefined, validFormData);

		expect(result).toEqual(arcjetError);
		expect(mockAuth.api.sendVerificationEmail).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid email", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "Email invalide" };
		mockValidateInput.mockReturnValue({ error: valErr });

		const result = await resendVerificationEmail(undefined, validFormData);

		expect(result).toEqual(valErr);
		expect(mockAuth.api.sendVerificationEmail).not.toHaveBeenCalled();
	});

	it("should call sendVerificationEmail with correct email and callbackURL", async () => {
		await resendVerificationEmail(undefined, validFormData);

		expect(mockAuth.api.sendVerificationEmail).toHaveBeenCalledWith({
			body: {
				email: "user@example.com",
				callbackURL: "https://synclune.fr/verifier-email",
			},
		});
	});

	it("should return success message on valid email", async () => {
		const result = await resendVerificationEmail(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe(EXPECTED_SUCCESS_MESSAGE);
	});

	it("should return success even when sendVerificationEmail throws (privacy protection)", async () => {
		mockAuth.api.sendVerificationEmail.mockRejectedValue(new Error("Email not found"));

		const result = await resendVerificationEmail(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe(EXPECTED_SUCCESS_MESSAGE);
	});

	it("should return success even when email address does not exist (privacy protection)", async () => {
		mockAuth.api.sendVerificationEmail.mockRejectedValue(new Error("user not found"));

		const result = await resendVerificationEmail(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe(EXPECTED_SUCCESS_MESSAGE);
	});

	it("should return generic error when Arcjet check itself throws unexpectedly", async () => {
		mockCheckArcjet.mockRejectedValue(new Error("Arcjet service unavailable"));

		const result = await resendVerificationEmail(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Une erreur inattendue est survenue");
	});

	it("should return generic error when headers() throws", async () => {
		mockHeaders.mockRejectedValue(new Error("Headers not available"));

		const result = await resendVerificationEmail(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Une erreur inattendue est survenue");
	});
});
