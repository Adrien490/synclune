import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRenderAndSend, mockBuildUrl } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
	mockBuildUrl: vi.fn(),
}));

vi.mock("../send-email", () => ({
	renderAndSend: mockRenderAndSend,
}));

vi.mock("@/emails/verification-email", () => ({
	VerificationEmail: vi.fn((props) => ({ type: "VerificationEmail", props })),
}));
vi.mock("@/emails/password-reset-email", () => ({
	PasswordResetEmail: vi.fn((props) => ({ type: "PasswordResetEmail", props })),
}));
vi.mock("@/emails/account-deletion-email", () => ({}));

vi.mock("../../constants/email.constants", () => ({
	EMAIL_SUBJECTS: {
		VERIFICATION: "Vérifiez votre adresse email - Synclune",
		PASSWORD_RESET: "Réinitialisez votre mot de passe - Synclune",
	},
	EMAIL_CONTACT: "contact@test.com",
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { SHOP: { PRODUCTS: "/produits" } },
}));

import { sendVerificationEmail, sendPasswordResetEmail } from "../auth-emails";

describe("sendVerificationEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "v-1" } });
	});

	it("renders VerificationEmail with the verification URL and tags as 'auth'", async () => {
		await sendVerificationEmail({
			to: "user@test.com",
			url: "https://synclune.fr/verify?token=abc",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "VerificationEmail",
				props: { verificationUrl: "https://synclune.fr/verify?token=abc" },
			}),
			expect.objectContaining({
				to: "user@test.com",
				subject: "Vérifiez votre adresse email - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "auth" }],
			}),
		);
	});

	it("returns the result from renderAndSend", async () => {
		const result = await sendVerificationEmail({ to: "u@t.com", url: "https://x" });
		expect(result).toEqual({ success: true, data: { id: "v-1" } });
	});
});

describe("sendPasswordResetEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "r-1" } });
	});

	it("renders PasswordResetEmail with the reset URL and password-reset subject", async () => {
		await sendPasswordResetEmail({
			to: "user@test.com",
			url: "https://synclune.fr/reset?token=xyz",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "PasswordResetEmail",
				props: { resetUrl: "https://synclune.fr/reset?token=xyz" },
			}),
			expect.objectContaining({
				to: "user@test.com",
				subject: "Réinitialisez votre mot de passe - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "auth" }],
			}),
		);
	});

	it("propagates Resend errors as the EmailResult", async () => {
		mockRenderAndSend.mockResolvedValue({
			success: false,
			error: "RESEND_FAILED",
		});

		const result = await sendPasswordResetEmail({ to: "u@t.com", url: "https://x" });
		expect(result).toEqual({ success: false, error: "RESEND_FAILED" });
	});
});
