import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockAuth,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockBuildUrl,
	mockEnforceRateLimit,
	mockCheckRateLimit,
} = vi.hoisted(() => ({
	mockAuth: {
		api: {
			sendVerificationEmail: vi.fn(),
		},
	},
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockBuildUrl: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
// ⚠️ Mocker le compteur par email-cible est OBLIGATOIRE : sans ce mock, le vrai
// `checkRateLimit` s'exécutait, et comme le mock de config ci-dessous fournit une
// CHAÎNE là où la lib attend un objet, la destructuration retombait sur les défauts
// (10/min). Les tests passaient par accident, et le 11ᵉ appel sur le même email
// aurait fait rougir un test sans rapport. Audit rate limiting 2026-07-31.
vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	AUTH_LIMITS: { EMAIL_VERIFICATION: { limit: 5, windowMs: 3_600_000 } },
}));
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

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 4, limit: 5, reset: 0 });
		mockValidateInput.mockReturnValue({ data: { ...validatedData } });
		mockAuth.api.sendVerificationEmail.mockResolvedValue(undefined);
		mockBuildUrl.mockReturnValue("https://synclune.fr/verifier-email");

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
	});

	// Le compteur IP seul laissait un attaquant à IP tournante (Tor, botnet) bombarder
	// l'unique adresse admin sans plafond. Symétrique de `request-password-reset`.
	// Audit rate limiting 2026-07-31.
	describe("rate limit par email-cible (anti mail-bombing)", () => {
		it("normalise l'email dans la clé (casse + espaces)", async () => {
			mockValidateInput.mockReturnValue({ data: { email: "  User@Example.COM  " } });

			await resendVerificationEmail(undefined, validFormData);

			expect(mockCheckRateLimit).toHaveBeenCalledWith("verification-email:user@example.com", {
				limit: 5,
				windowMs: 3_600_000,
			});
		});

		it("n'envoie AUCUN email quand le quota de la cible est épuisé", async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0, limit: 5, reset: 0 });

			const result = await resendVerificationEmail(undefined, validFormData);

			expect(mockAuth.api.sendVerificationEmail).not.toHaveBeenCalled();
			// Réponse générique identique au cas nominal : révéler le blocage dirait à
			// l'attaquant que l'adresse est réelle et sous attaque (anti-énumération).
			expect(result).toEqual({
				status: ActionStatus.SUCCESS,
				message: EXPECTED_SUCCESS_MESSAGE,
			});
		});

		it("applique le compteur IP AVANT le compteur email (pas de sonde d'existence gratuite)", async () => {
			mockEnforceRateLimit.mockResolvedValue({
				error: { status: ActionStatus.ERROR, message: "Trop de requêtes." },
			});

			await resendVerificationEmail(undefined, validFormData);

			expect(mockCheckRateLimit).not.toHaveBeenCalled();
			expect(mockAuth.api.sendVerificationEmail).not.toHaveBeenCalled();
		});
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
});
