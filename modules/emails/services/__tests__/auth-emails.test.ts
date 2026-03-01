import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRenderAndSend } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
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

vi.mock("@/emails/password-changed-email", () => ({
	PasswordChangedEmail: vi.fn((props) => ({ type: "PasswordChangedEmail", props })),
}));

vi.mock("@/emails/account-deletion-email", () => ({
	AccountDeletionEmail: vi.fn((props) => ({ type: "AccountDeletionEmail", props })),
}));

vi.mock("../../constants/email.constants", () => ({
	EMAIL_SUBJECTS: {
		VERIFICATION: "Vérifiez votre adresse email - Synclune",
		PASSWORD_RESET: "Réinitialisez votre mot de passe - Synclune",
		PASSWORD_CHANGED: "Votre mot de passe a été modifié - Synclune",
		ACCOUNT_DELETED: "Votre compte a été supprimé - Synclune",
	},
	EMAIL_CONTACT: "contact@test.com",
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: vi.fn((route: string) => `https://test.com${route}`),
	ROUTES: {
		AUTH: {
			FORGOT_PASSWORD: "/mot-de-passe-oublie",
		},
	},
}));

import {
	sendVerificationEmail,
	sendPasswordResetEmail,
	sendPasswordChangedEmail,
	sendAccountDeletionEmail,
} from "../auth-emails";

describe("sendVerificationEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-1" } });
	});

	it("should call renderAndSend with correct component props", async () => {
		await sendVerificationEmail({
			to: "user@test.com",
			url: "https://test.com/verifier-email?token=abc123",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "VerificationEmail",
				props: expect.objectContaining({
					verificationUrl: "https://test.com/verifier-email?token=abc123",
				}),
			}),
			expect.objectContaining({
				to: "user@test.com",
				subject: "Vérifiez votre adresse email - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "auth" }],
			}),
		);
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendVerificationEmail({
			to: "user@test.com",
			url: "https://test.com/verifier-email?token=abc123",
		});

		expect(result).toEqual({ success: true, data: { id: "email-1" } });
	});
});

describe("sendPasswordResetEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-2" } });
	});

	it("should call renderAndSend with correct component props", async () => {
		await sendPasswordResetEmail({
			to: "user@test.com",
			url: "https://test.com/reinitialiser-mot-de-passe?token=xyz",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "PasswordResetEmail",
				props: expect.objectContaining({
					resetUrl: "https://test.com/reinitialiser-mot-de-passe?token=xyz",
				}),
			}),
			expect.objectContaining({
				to: "user@test.com",
				subject: "Réinitialisez votre mot de passe - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "auth" }],
			}),
		);
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendPasswordResetEmail({
			to: "user@test.com",
			url: "https://test.com/reinitialiser-mot-de-passe?token=xyz",
		});

		expect(result).toEqual({ success: true, data: { id: "email-2" } });
	});
});

describe("sendPasswordChangedEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-3" } });
	});

	it("should call renderAndSend with correct component props including built resetUrl", async () => {
		await sendPasswordChangedEmail({
			to: "user@test.com",
			userName: "Marie",
			changeDate: "2026-02-24",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "PasswordChangedEmail",
				props: expect.objectContaining({
					userName: "Marie",
					changeDate: "2026-02-24",
					resetUrl: "https://test.com/mot-de-passe-oublie",
				}),
			}),
			expect.objectContaining({
				to: "user@test.com",
				subject: "Votre mot de passe a été modifié - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "auth" }],
			}),
		);
	});

	it("should build resetUrl from ROUTES.AUTH.FORGOT_PASSWORD", async () => {
		const { buildUrl } = await import("@/shared/constants/urls");

		await sendPasswordChangedEmail({
			to: "user@test.com",
			userName: "Marie",
			changeDate: "2026-02-24",
		});

		expect(buildUrl).toHaveBeenCalledWith("/mot-de-passe-oublie");
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendPasswordChangedEmail({
			to: "user@test.com",
			userName: "Marie",
			changeDate: "2026-02-24",
		});

		expect(result).toEqual({ success: true, data: { id: "email-3" } });
	});
});

describe("sendAccountDeletionEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-4" } });
	});

	it("should call renderAndSend with correct component props", async () => {
		await sendAccountDeletionEmail({
			to: "user@test.com",
			userName: "Marie",
			deletionDate: "2026-02-24",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "AccountDeletionEmail",
				props: expect.objectContaining({
					userName: "Marie",
					deletionDate: "2026-02-24",
				}),
			}),
			expect.objectContaining({
				to: "user@test.com",
				subject: "Votre compte a été supprimé - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "auth" }],
			}),
		);
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendAccountDeletionEmail({
			to: "user@test.com",
			userName: "Marie",
			deletionDate: "2026-02-24",
		});

		expect(result).toEqual({ success: true, data: { id: "email-4" } });
	});
});
