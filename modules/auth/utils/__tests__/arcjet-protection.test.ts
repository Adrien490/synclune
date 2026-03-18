import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockAjAuthProtect, mockGetBaseUrl } = vi.hoisted(() => ({
	mockAjAuthProtect: vi.fn(),
	mockGetBaseUrl: vi.fn(),
}));

vi.mock("@/shared/lib/arcjet", () => ({
	ajAuth: {
		protect: mockAjAuthProtect,
	},
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
}));

import { checkArcjetProtection } from "../arcjet-protection";

// ============================================================================
// Helpers
// ============================================================================

function makeDecision({
	denied = false,
	isRateLimit = false,
	isBot = false,
	isShield = false,
}: {
	denied?: boolean;
	isRateLimit?: boolean;
	isBot?: boolean;
	isShield?: boolean;
}) {
	return {
		isDenied: () => denied,
		reason: {
			isRateLimit: () => isRateLimit,
			isBot: () => isBot,
			isShield: () => isShield,
		},
	};
}

// ============================================================================
// checkArcjetProtection
// ============================================================================

describe("checkArcjetProtection", () => {
	const mockHeaders = new Headers({ "content-type": "application/json" });
	const endpoint = "/auth/sign-in";

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://example.com");
	});

	it("returns null when the request is allowed", async () => {
		mockAjAuthProtect.mockResolvedValue(makeDecision({ denied: false }));

		const result = await checkArcjetProtection(endpoint, mockHeaders);

		expect(result).toBeNull();
	});

	it("calls ajAuth.protect with a Request built from baseUrl + endpoint", async () => {
		mockAjAuthProtect.mockResolvedValue(makeDecision({ denied: false }));

		await checkArcjetProtection(endpoint, mockHeaders);

		expect(mockAjAuthProtect).toHaveBeenCalledWith(
			expect.objectContaining({ url: "https://example.com/auth/sign-in" }),
			{ requested: 1 },
		);
	});

	it("returns rate-limit error message when reason is rate limit", async () => {
		mockAjAuthProtect.mockResolvedValue(makeDecision({ denied: true, isRateLimit: true }));

		const result = await checkArcjetProtection(endpoint, mockHeaders);

		expect(result).not.toBeNull();
		expect(result?.status).toBe(ActionStatus.ERROR);
		expect(result?.message).toBe("Trop de tentatives. Veuillez réessayer dans 15 minutes.");
	});

	it("returns bot-detection error message when reason is bot", async () => {
		mockAjAuthProtect.mockResolvedValue(makeDecision({ denied: true, isBot: true }));

		const result = await checkArcjetProtection(endpoint, mockHeaders);

		expect(result).not.toBeNull();
		expect(result?.status).toBe(ActionStatus.ERROR);
		expect(result?.message).toBe("Votre requête a été identifiée comme automatisée.");
	});

	it("returns shield error message when reason is shield", async () => {
		mockAjAuthProtect.mockResolvedValue(makeDecision({ denied: true, isShield: true }));

		const result = await checkArcjetProtection(endpoint, mockHeaders);

		expect(result).not.toBeNull();
		expect(result?.status).toBe(ActionStatus.ERROR);
		expect(result?.message).toBe("Requête bloquée pour des raisons de sécurité.");
	});

	it("returns generic error message for other denied reasons", async () => {
		mockAjAuthProtect.mockResolvedValue(
			makeDecision({ denied: true, isRateLimit: false, isBot: false, isShield: false }),
		);

		const result = await checkArcjetProtection(endpoint, mockHeaders);

		expect(result).not.toBeNull();
		expect(result?.status).toBe(ActionStatus.ERROR);
		expect(result?.message).toBe("Votre requête n'a pas pu être traitée.");
	});

	it("rate-limit reason takes priority over other reasons", async () => {
		mockAjAuthProtect.mockResolvedValue(
			makeDecision({ denied: true, isRateLimit: true, isBot: true, isShield: true }),
		);

		const result = await checkArcjetProtection(endpoint, mockHeaders);

		expect(result?.message).toBe("Trop de tentatives. Veuillez réessayer dans 15 minutes.");
	});

	it("bot reason is checked when rate-limit is false", async () => {
		mockAjAuthProtect.mockResolvedValue(
			makeDecision({ denied: true, isRateLimit: false, isBot: true, isShield: true }),
		);

		const result = await checkArcjetProtection(endpoint, mockHeaders);

		expect(result?.message).toBe("Votre requête a été identifiée comme automatisée.");
	});

	it("uses the provided endpoint in the request URL", async () => {
		mockAjAuthProtect.mockResolvedValue(makeDecision({ denied: false }));

		await checkArcjetProtection("/auth/reset-password", mockHeaders);

		expect(mockAjAuthProtect).toHaveBeenCalledWith(
			expect.objectContaining({ url: "https://example.com/auth/reset-password" }),
			expect.anything(),
		);
	});

	it("passes { requested: 1 } to protect", async () => {
		mockAjAuthProtect.mockResolvedValue(makeDecision({ denied: false }));

		await checkArcjetProtection(endpoint, mockHeaders);

		expect(mockAjAuthProtect).toHaveBeenCalledWith(expect.anything(), { requested: 1 });
	});
});
