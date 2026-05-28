import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockLookup = vi.fn();

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		user: {
			findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
			update: (...args: unknown[]) => mockUserUpdate(...args),
		},
	},
}));

vi.mock("@/modules/invoices/providers/factory", () => ({
	getInvoiceProvider: () => ({
		id: "mock",
		lookupEInvoicingDirectory: (...args: unknown[]) => mockLookup(...args),
	}),
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

import { refreshCustomerRouting } from "../refresh-customer-routing.service";

describe("refreshCustomerRouting", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns USER_NOT_FOUND when no user matches", async () => {
		mockUserFindUnique.mockResolvedValueOnce(null);
		const result = await refreshCustomerRouting("user_nope");
		expect(result.status).toBe("USER_NOT_FOUND");
		expect(mockLookup).not.toHaveBeenCalled();
	});

	it("returns NOT_B2B for a B2C user (skip lookup)", async () => {
		mockUserFindUnique.mockResolvedValueOnce({
			id: "user_b2c",
			customerType: "B2C",
			companySiret: null,
			customerEInvoicingPlatformId: null,
			customerEInvoicingAddress: null,
			directoryLastCheckedAt: null,
			directoryLastCheckedSiretSnapshot: null,
		});
		const result = await refreshCustomerRouting("user_b2c");
		expect(result.status).toBe("NOT_B2B");
		expect(mockLookup).not.toHaveBeenCalled();
	});

	it("returns MISSING_SIRET for a B2B user with no SIRET", async () => {
		mockUserFindUnique.mockResolvedValueOnce({
			id: "user_b2b",
			customerType: "B2B",
			companySiret: null,
			customerEInvoicingPlatformId: null,
			customerEInvoicingAddress: null,
			directoryLastCheckedAt: null,
			directoryLastCheckedSiretSnapshot: null,
		});
		const result = await refreshCustomerRouting("user_b2b");
		expect(result.status).toBe("MISSING_SIRET");
		expect(mockLookup).not.toHaveBeenCalled();
	});

	it("returns CACHE_HIT when cache is fresh and SIRET unchanged", async () => {
		const recent = new Date(Date.now() - 1000 * 60 * 60); // 1h ago
		mockUserFindUnique.mockResolvedValueOnce({
			id: "user_b2b",
			customerType: "B2B",
			companySiret: "12345678901234",
			customerEInvoicingPlatformId: "pdp-chorus",
			customerEInvoicingAddress: "12345678901234@chorus.gouv.fr",
			directoryLastCheckedAt: recent,
			directoryLastCheckedSiretSnapshot: "12345678901234",
		});
		const result = await refreshCustomerRouting("user_b2b");
		expect(result.status).toBe("CACHE_HIT");
		expect(result.platformId).toBe("pdp-chorus");
		expect(mockLookup).not.toHaveBeenCalled();
		expect(mockUserUpdate).not.toHaveBeenCalled();
	});

	it("forces refresh when options.force=true even with fresh cache", async () => {
		mockUserFindUnique.mockResolvedValueOnce({
			id: "user_b2b",
			customerType: "B2B",
			companySiret: "12345678901234",
			customerEInvoicingPlatformId: "pdp-chorus",
			customerEInvoicingAddress: "12345678901234@chorus.gouv.fr",
			directoryLastCheckedAt: new Date(),
			directoryLastCheckedSiretSnapshot: "12345678901234",
		});
		mockLookup.mockResolvedValueOnce({
			status: "FOUND",
			found: true,
			platformId: "pdp-new",
			routingAddress: "new@addr.fr",
			raw: null,
		});
		mockUserUpdate.mockResolvedValueOnce({});

		const result = await refreshCustomerRouting("user_b2b", { force: true });
		expect(result.status).toBe("REFRESHED");
		expect(result.platformId).toBe("pdp-new");
		expect(mockLookup).toHaveBeenCalledOnce();
	});

	it("invalidates cache when SIRET has changed since last check", async () => {
		const recent = new Date(Date.now() - 1000 * 60 * 60); // 1h ago
		mockUserFindUnique.mockResolvedValueOnce({
			id: "user_b2b",
			customerType: "B2B",
			companySiret: "99999999999999", // changed
			customerEInvoicingPlatformId: "old-pdp",
			customerEInvoicingAddress: "old@addr.fr",
			directoryLastCheckedAt: recent,
			directoryLastCheckedSiretSnapshot: "12345678901234", // old
		});
		mockLookup.mockResolvedValueOnce({
			status: "FOUND",
			found: true,
			platformId: "pdp-new",
			routingAddress: "new@addr.fr",
			raw: null,
		});
		mockUserUpdate.mockResolvedValueOnce({});

		const result = await refreshCustomerRouting("user_b2b");
		expect(result.status).toBe("REFRESHED");
		const updateCall = mockUserUpdate.mock.calls[0]?.[0];
		expect(updateCall.data.directoryLastCheckedSiretSnapshot).toBe("99999999999999");
	});

	it("persists null platformId for NOT_FOUND (negative cache)", async () => {
		mockUserFindUnique.mockResolvedValueOnce({
			id: "user_b2b",
			customerType: "B2B",
			companySiret: "12345678901234",
			customerEInvoicingPlatformId: null,
			customerEInvoicingAddress: null,
			directoryLastCheckedAt: null,
			directoryLastCheckedSiretSnapshot: null,
		});
		mockLookup.mockResolvedValueOnce({
			status: "NOT_FOUND",
			found: false,
			platformId: null,
			routingAddress: null,
			raw: null,
		});
		mockUserUpdate.mockResolvedValueOnce({});

		const result = await refreshCustomerRouting("user_b2b");
		expect(result.status).toBe("REFRESHED");
		expect(result.directoryStatus).toBe("NOT_FOUND");
		const updateCall = mockUserUpdate.mock.calls[0]?.[0];
		expect(updateCall.data.customerEInvoicingPlatformId).toBeNull();
		expect(updateCall.data.directoryLastCheckedSiretSnapshot).toBe("12345678901234");
	});

	it("returns UNAVAILABLE without writing on lookup failure (preserves cache)", async () => {
		const oldCheck = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago (expired)
		mockUserFindUnique.mockResolvedValueOnce({
			id: "user_b2b",
			customerType: "B2B",
			companySiret: "12345678901234",
			customerEInvoicingPlatformId: "pdp-chorus",
			customerEInvoicingAddress: "12345678901234@chorus.gouv.fr",
			directoryLastCheckedAt: oldCheck,
			directoryLastCheckedSiretSnapshot: "12345678901234",
		});
		mockLookup.mockResolvedValueOnce({
			status: "UNAVAILABLE",
			found: false,
			platformId: null,
			routingAddress: null,
			raw: null,
		});

		const result = await refreshCustomerRouting("user_b2b");
		expect(result.status).toBe("UNAVAILABLE");
		expect(result.platformId).toBe("pdp-chorus"); // cache préservé
		expect(mockUserUpdate).not.toHaveBeenCalled();
	});

	it("refreshes when cache TTL has expired", async () => {
		const expired = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
		mockUserFindUnique.mockResolvedValueOnce({
			id: "user_b2b",
			customerType: "B2B",
			companySiret: "12345678901234",
			customerEInvoicingPlatformId: "old-pdp",
			customerEInvoicingAddress: "old@addr.fr",
			directoryLastCheckedAt: expired,
			directoryLastCheckedSiretSnapshot: "12345678901234",
		});
		mockLookup.mockResolvedValueOnce({
			status: "FOUND",
			found: true,
			platformId: "pdp-refreshed",
			routingAddress: "refreshed@addr.fr",
			raw: null,
		});
		mockUserUpdate.mockResolvedValueOnce({});

		const result = await refreshCustomerRouting("user_b2b");
		expect(result.status).toBe("REFRESHED");
		expect(result.platformId).toBe("pdp-refreshed");
	});
});
