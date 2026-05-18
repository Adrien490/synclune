import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireAdmin, mockEnforceRateLimit, mockHandleActionError, mockSuccess, mockError } =
	vi.hoisted(() => ({
		mockRequireAdmin: vi.fn(),
		mockEnforceRateLimit: vi.fn(),
		mockHandleActionError: vi.fn((_e: unknown, fallback: string) => ({
			status: "ERROR",
			message: fallback,
		})),
		mockSuccess: vi.fn((message: string, data?: unknown) => ({
			status: "SUCCESS",
			message,
			data,
		})),
		mockError: vi.fn((message: string) => ({ status: "ERROR", message })),
	}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));

import { runCrossPageIdsAction } from "../run-cross-page-ids-action";

const fakeRateLimit = { window: "1s", max: 10 } as never;
const FAKE_WHERE = { deletedAt: null };

function makeOpts(overrides: Partial<Parameters<typeof runCrossPageIdsAction>[0]> = {}) {
	return {
		rateLimitConfig: fakeRateLimit,
		cap: 100,
		buildWhere: () => FAKE_WHERE,
		fetchIds: vi.fn().mockResolvedValue([{ id: "a" }, { id: "b" }]),
		fetchCount: vi.fn().mockResolvedValue(2),
		emptyMessage: "Aucun élément",
		errorFallback: "Erreur de chargement",
		...overrides,
	};
}

describe("runCrossPageIdsAction", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRequireAdmin.mockResolvedValue({ admin: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: "ERROR",
			message: fallback,
		}));
		mockSuccess.mockImplementation((message: string, data?: unknown) => ({
			status: "SUCCESS",
			message,
			data,
		}));
		mockError.mockImplementation((message: string) => ({ status: "ERROR", message }));
	});

	it("retourne success avec ids + totalCount + cappedAt quand le fetch réussit", async () => {
		const opts = makeOpts();
		const result = await runCrossPageIdsAction(opts);

		expect(result).toEqual({
			status: "SUCCESS",
			message: "Sélection cross-page récupérée",
			data: { ids: ["a", "b"], totalCount: 2, cappedAt: 100 },
		});
	});

	it("transmet le where construit aux callbacks fetchIds/fetchCount", async () => {
		const opts = makeOpts();
		await runCrossPageIdsAction(opts);

		expect(opts.fetchIds).toHaveBeenCalledWith(FAKE_WHERE);
		expect(opts.fetchCount).toHaveBeenCalledWith(FAKE_WHERE);
	});

	it("supporte un buildWhere async (cas products avec embeddings full-text)", async () => {
		const asyncWhere = { id: { in: ["x"] } };
		const opts = makeOpts({ buildWhere: async () => asyncWhere });

		await runCrossPageIdsAction(opts);

		expect(opts.fetchIds).toHaveBeenCalledWith(asyncWhere);
	});

	it("rejette quand requireAdmin échoue, sans appeler buildWhere ni les fetchers", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: "FORBIDDEN", message: "Accès refusé" },
		});
		const opts = makeOpts();

		const result = await runCrossPageIdsAction(opts);

		expect(result).toEqual({ status: "FORBIDDEN", message: "Accès refusé" });
		expect(opts.fetchIds).not.toHaveBeenCalled();
		expect(opts.fetchCount).not.toHaveBeenCalled();
	});

	it("rejette quand rate-limited, sans appeler buildWhere ni les fetchers", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: "ERROR", message: "Trop de requêtes" },
		});
		const buildWhere = vi.fn(() => FAKE_WHERE);
		const opts = makeOpts({ buildWhere });

		const result = await runCrossPageIdsAction(opts);

		expect(result).toEqual({ status: "ERROR", message: "Trop de requêtes" });
		expect(buildWhere).not.toHaveBeenCalled();
		expect(opts.fetchIds).not.toHaveBeenCalled();
	});

	it("retourne l'emptyMessage quand aucun id ne match", async () => {
		const opts = makeOpts({
			fetchIds: vi.fn().mockResolvedValue([]),
			fetchCount: vi.fn().mockResolvedValue(0),
		});

		const result = await runCrossPageIdsAction(opts);

		expect(result).toEqual({ status: "ERROR", message: "Aucun élément" });
	});

	it("appelle handleActionError avec l'errorFallback sur exception fetchIds", async () => {
		const opts = makeOpts({
			fetchIds: vi.fn().mockRejectedValue(new Error("DB down")),
		});

		const result = await runCrossPageIdsAction(opts);

		expect(result).toEqual({ status: "ERROR", message: "Erreur de chargement" });
		expect(mockHandleActionError).toHaveBeenCalledWith(expect.any(Error), "Erreur de chargement");
	});

	it("respecte le cap dans la réponse", async () => {
		const opts = makeOpts({
			cap: 50,
			fetchCount: vi.fn().mockResolvedValue(200), // total réel > cap
		});

		const result = await runCrossPageIdsAction(opts);

		expect(result.data).toMatchObject({ totalCount: 200, cappedAt: 50 });
	});
});
