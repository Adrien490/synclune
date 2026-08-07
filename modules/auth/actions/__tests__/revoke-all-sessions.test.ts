/**
 * `revokeAllSessions` est le bouton « je crois ma session volée » du compte UNIQUE
 * qui administre la boutique (cf. RUNBOOK § Compte admin compromis). Il n'avait
 * aucun test — nulle part — jusqu'à l'audit « Server Actions sécurisées » du
 * 2026-08-07.
 *
 * Ce qu'on verrouille ici, et pourquoi chaque point compte :
 *
 *  - **la garde admin précède l'écriture** — `auth.api.revokeSessions` supprime des
 *    lignes ; un appel RPC non-admin ne doit jamais l'atteindre ;
 *  - **le rate limit s'applique quand même** — `requireAdmin()` borne QUI appelle,
 *    pas COMBIEN de fois ;
 *  - **un `signOut` en échec n'annule pas la révocation** — les lignes `Session`
 *    sont déjà supprimées, l'essentiel est fait ; seuls les cookies locaux
 *    survivent, et le message doit rester un succès ;
 *  - **le message annonce la latence** — Better Auth sert la session depuis son
 *    cookie-cache signé sans lire la base : la révocation n'est effective sur les
 *    autres appareils qu'au bout de `cookieCache.maxAge` (60 s). Une copie qui
 *    promettrait l'immédiateté mentirait.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockAuth,
	mockHeaders,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockSuccess,
	mockHandleActionError,
	mockLogger,
} = vi.hoisted(() => ({
	mockAuth: {
		api: {
			revokeSessions: vi.fn(),
			signOut: vi.fn(),
		},
	},
	mockHeaders: vi.fn(),
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockSuccess: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockLogger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	AUTH_LIMITS: { LOGOUT: { name: "auth-logout", limit: 10, windowMs: 60_000 } },
}));
vi.mock("@/modules/auth/lib/auth-env", () => ({
	AUTH_SESSION_CONFIG: { cookieCache: { maxAge: 60 } },
}));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("@/shared/lib/actions", () => ({
	success: mockSuccess,
	handleActionError: mockHandleActionError,
}));

import { revokeAllSessions } from "../revoke-all-sessions";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN = { user: { id: "cm3admin000001qz8v4h2j9d3", name: "Léane", role: "ADMIN" } };
const AUTH_ERROR = { status: ActionStatus.FORBIDDEN, message: "Accès non autorisé" };

const call = () => revokeAllSessions(undefined, new FormData());

beforeEach(() => {
	vi.resetAllMocks();

	mockRequireAdminWithUser.mockResolvedValue(ADMIN);
	mockEnforceRateLimit.mockResolvedValue({ success: true });
	mockHeaders.mockResolvedValue(new Headers());
	mockAuth.api.revokeSessions.mockResolvedValue({});
	mockAuth.api.signOut.mockResolvedValue({});

	mockSuccess.mockImplementation((message: string) => ({
		status: ActionStatus.SUCCESS,
		message,
	}));
	mockHandleActionError.mockImplementation((_e: unknown, message: string) => ({
		status: ActionStatus.ERROR,
		message,
	}));
});

// ============================================================================
// TESTS
// ============================================================================

describe("revokeAllSessions", () => {
	describe("garde admin", () => {
		it("rejette un appelant non-admin", async () => {
			mockRequireAdminWithUser.mockResolvedValue({ error: AUTH_ERROR });

			await expect(call()).resolves.toEqual(AUTH_ERROR);
		});

		it("n'atteint AUCUNE écriture quand la garde rejette", async () => {
			mockRequireAdminWithUser.mockResolvedValue({ error: AUTH_ERROR });

			await call();

			expect(mockAuth.api.revokeSessions).not.toHaveBeenCalled();
			expect(mockAuth.api.signOut).not.toHaveBeenCalled();
		});

		it("place la garde AVANT le rate limit — on ne consomme pas le quota d'un intrus", async () => {
			mockRequireAdminWithUser.mockResolvedValue({ error: AUTH_ERROR });

			await call();

			expect(mockEnforceRateLimit).not.toHaveBeenCalled();
		});
	});

	describe("rate limit", () => {
		it("rend l'erreur de plafond sans rien révoquer", async () => {
			const rateError = { status: ActionStatus.ERROR, message: "Trop de requêtes." };
			mockEnforceRateLimit.mockResolvedValue({ error: rateError });

			await expect(call()).resolves.toEqual(rateError);
			expect(mockAuth.api.revokeSessions).not.toHaveBeenCalled();
		});

		it("est appliqué même sur une action admin — la garde borne QUI, pas COMBIEN", async () => {
			await call();

			expect(mockEnforceRateLimit).toHaveBeenCalledWith(
				expect.objectContaining({ name: "auth-logout" }),
			);
		});
	});

	describe("révocation", () => {
		it("révoque TOUTES les sessions, la courante comprise", async () => {
			await call();

			// `revokeSessions` et non `revokeOtherSessions` : garder la session courante
			// supposerait de savoir qu'elle est saine — l'hypothèse exacte qu'on ne peut
			// pas faire quand on ne sait pas laquelle est compromise.
			expect(mockAuth.api.revokeSessions).toHaveBeenCalledWith({
				headers: expect.any(Headers),
			});
		});

		it("déconnecte aussi le navigateur appelant", async () => {
			// `revokeSessions` supprime les LIGNES ; sans ce `signOut`, l'opératrice
			// resterait visuellement connectée — le doute qu'elle vient de lever.
			await call();

			expect(mockAuth.api.signOut).toHaveBeenCalledWith({ headers: expect.any(Headers) });
		});

		it("rend un succès qui annonce la latence de révocation", async () => {
			const result = await call();

			expect(result.status).toBe(ActionStatus.SUCCESS);
			// La copie doit dire que les AUTRES appareils ne perdent l'accès qu'ensuite :
			// tant que le cookie-cache Better Auth est valide, la session est servie sans
			// lecture en base.
			expect(result.message).toMatch(/minute/i);
		});
	});

	describe("tolérance à l'échec du sign-out local", () => {
		beforeEach(() => {
			mockAuth.api.signOut.mockRejectedValue(new Error("cookie store unavailable"));
		});

		it("rend quand même un succès — les sessions SONT révoquées en base", async () => {
			const result = await call();

			expect(result.status).toBe(ActionStatus.SUCCESS);
		});

		it("trace l'échec plutôt que de le taire", async () => {
			await call();

			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining("Sessions revoked but local sign-out failed"),
				expect.objectContaining({ service: "revoke-all-sessions" }),
			);
		});
	});

	describe("échec de la révocation", () => {
		it("passe par handleActionError (aucun détail technique rendu au client)", async () => {
			mockAuth.api.revokeSessions.mockRejectedValue(new Error("DB connection refused"));

			const result = await call();

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toBe("Impossible de révoquer les sessions");
			expect(result.message).not.toContain("DB connection refused");
		});
	});
});
