import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockOrderAggregate, mockCacheDashboard, mockCacheTag } = vi.hoisted(() => ({
	mockOrderAggregate: vi.fn(),
	mockCacheDashboard: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: { aggregate: mockOrderAggregate },
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/cache", () => ({
	cacheDashboard: mockCacheDashboard,
}));

vi.mock("next/cache", () => ({
	cacheTag: mockCacheTag,
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: <T>(_opts: unknown, fn: () => T) => fn(),
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: { VAT_PROGRESS: "dashboard-vat-progress" },
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	ORDERS_CACHE_TAGS: { LIST: "orders-list" },
}));

vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: {
		PAID: "PAID",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
		REFUNDED: "REFUNDED",
	},
}));

import { fetchDashboardVatProgress } from "../get-vat-progress";
import { parisWallTimeToUtc } from "@/shared/utils/timezone";

describe("fetchDashboardVatProgress", () => {
	const ORIGINAL_ENV = process.env.VAT_FRANCHISE_THRESHOLD_EUR;

	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-05-15T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
		if (ORIGINAL_ENV === undefined) {
			delete process.env.VAT_FRANCHISE_THRESHOLD_EUR;
		} else {
			process.env.VAT_FRANCHISE_THRESHOLD_EUR = ORIGINAL_ENV;
		}
	});

	it("returns ytdRevenue, threshold (cents) and progress percentage", async () => {
		mockOrderAggregate.mockResolvedValueOnce({ _sum: { total: 1500000 } });

		const result = await fetchDashboardVatProgress();

		expect(result.ytdRevenue).toBe(1500000);
		expect(result.threshold).toBe(8500000);
		expect(result.progress).toBeCloseTo(17.647);
		expect(result.year).toBe(2026);
	});

	it("scopes the aggregate query from the first day of the current Paris year", async () => {
		mockOrderAggregate.mockResolvedValueOnce({ _sum: { total: 0 } });

		await fetchDashboardVatProgress();

		const call = mockOrderAggregate.mock.calls[0]![0];
		const yearStart = call.where.paidAt.gte as Date;
		// 1er janvier 2026 00:00 Paris (= 2025-12-31T23:00:00Z en hiver, ANALYTICS-AUDIT-005).
		expect(yearStart).toEqual(parisWallTimeToUtc(2026, 0, 1));
		expect(call.where.paymentStatus).toEqual({
			in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"],
		});
		expect(call.where.deletedAt).toBeNull();
	});

	it("defaults the threshold to 85 000 € (ventes de biens) when env var is unset", async () => {
		delete process.env.VAT_FRANCHISE_THRESHOLD_EUR;
		mockOrderAggregate.mockResolvedValueOnce({ _sum: { total: 100000 } });

		const result = await fetchDashboardVatProgress();

		expect(result.threshold).toBe(8_500_000);
	});

	it("uses the configured threshold when env var is a positive number", async () => {
		// 37 500 € (prestations de services) override le défaut « ventes de biens ».
		process.env.VAT_FRANCHISE_THRESHOLD_EUR = "37500";
		mockOrderAggregate.mockResolvedValueOnce({ _sum: { total: 0 } });

		const result = await fetchDashboardVatProgress();

		expect(result.threshold).toBe(3_750_000);
	});

	it("falls back to the default when env var is invalid", async () => {
		process.env.VAT_FRANCHISE_THRESHOLD_EUR = "not-a-number";
		mockOrderAggregate.mockResolvedValueOnce({ _sum: { total: 0 } });

		const result = await fetchDashboardVatProgress();

		expect(result.threshold).toBe(8_500_000);
	});

	it("returns 0 progress when no orders are paid", async () => {
		mockOrderAggregate.mockResolvedValueOnce({ _sum: { total: null } });

		const result = await fetchDashboardVatProgress();

		expect(result.ytdRevenue).toBe(0);
		expect(result.progress).toBe(0);
	});

	it("returns >100 progress when threshold is exceeded (no cap at fetcher level)", async () => {
		// 90 000 € > seuil ventes de biens 85 000 € → ~105,9 %.
		mockOrderAggregate.mockResolvedValueOnce({ _sum: { total: 9_000_000 } });

		const result = await fetchDashboardVatProgress();

		expect(result.progress).toBeCloseTo(105.88, 1);
	});

	it("attaches dashboard + orders-list cache tags", async () => {
		mockOrderAggregate.mockResolvedValueOnce({ _sum: { total: 0 } });

		await fetchDashboardVatProgress();

		expect(mockCacheDashboard).toHaveBeenCalledWith("dashboard-vat-progress");
		expect(mockCacheTag).toHaveBeenCalledWith("orders-list");
	});
});
