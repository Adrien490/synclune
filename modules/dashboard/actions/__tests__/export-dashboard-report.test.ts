import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockHandleActionError,
	mockSuccess,
	mockValidateInput,
	mockSafeFormGet,
	mockFetchKpis,
	mockFetchCustomerKpis,
	mockFetchRevenue,
	mockFetchTopProducts,
	mockFetchRecentOrders,
	mockBuildExport,
} = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSafeFormGet: vi.fn(),
	mockFetchKpis: vi.fn(),
	mockFetchCustomerKpis: vi.fn(),
	mockFetchRevenue: vi.fn(),
	mockFetchTopProducts: vi.fn(),
	mockFetchRecentOrders: vi.fn(),
	mockBuildExport: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_DASHBOARD_LIMITS: { EXPORT: "dashboard-export" },
}));
vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	validateInput: mockValidateInput,
	safeFormGet: mockSafeFormGet,
}));
vi.mock("../../data/get-kpis", () => ({ fetchDashboardKpis: mockFetchKpis }));
vi.mock("../../data/get-customer-kpis", () => ({ fetchCustomerKpis: mockFetchCustomerKpis }));
vi.mock("../../data/get-revenue-chart", () => ({
	fetchDashboardRevenueChart: mockFetchRevenue,
}));
vi.mock("../../data/get-top-products", () => ({ fetchTopProducts: mockFetchTopProducts }));
vi.mock("../../data/get-recent-orders", () => ({
	fetchDashboardRecentOrders: mockFetchRecentOrders,
}));
vi.mock("../../services/export-builder.service", () => ({
	buildDashboardExport: mockBuildExport,
}));

import { exportDashboardReport } from "../export-dashboard-report";

// ============================================================================
// TESTS
// ============================================================================

describe("exportDashboardReport", () => {
	const validInput = { period: "month", format: "csv" };
	let formData: FormData;

	beforeEach(() => {
		vi.resetAllMocks();

		formData = new FormData();
		formData.append("period", "month");
		formData.append("format", "csv");

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSafeFormGet.mockImplementation((fd: FormData, key: string) => fd.get(key));
		mockValidateInput.mockReturnValue({ data: validInput });
		mockFetchKpis.mockResolvedValue({ kpis: "kpis-data" });
		mockFetchCustomerKpis.mockResolvedValue({ customerKpis: "customer-kpis-data" });
		mockFetchRevenue.mockResolvedValue({ revenue: "revenue-data" });
		mockFetchTopProducts.mockResolvedValue({ products: [] });
		mockFetchRecentOrders.mockResolvedValue({ orders: [] });
		mockBuildExport.mockReturnValue({
			filename: "dashboard-month-2026-04-17.csv",
			mimeType: "text/csv;charset=utf-8",
			content: "csv-content",
		});
		mockSuccess.mockImplementation((msg: string, data: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// -------------------------------------------------------------------------
	// Auth
	// -------------------------------------------------------------------------

	it("calls requireAdmin first and returns early on auth error", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "KO" },
		});

		const result = await exportDashboardReport(undefined, formData);

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockEnforceRateLimit).not.toHaveBeenCalled();
		expect(mockFetchKpis).not.toHaveBeenCalled();
		expect(mockBuildExport).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Rate limit
	// -------------------------------------------------------------------------

	it("calls enforceRateLimit with the EXPORT config after admin check", async () => {
		await exportDashboardReport(undefined, formData);

		expect(mockEnforceRateLimit).toHaveBeenCalledWith("dashboard-export");
	});

	it("returns early when rate limit is exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});

		const result = await exportDashboardReport(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockValidateInput).not.toHaveBeenCalled();
		expect(mockFetchKpis).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Validation
	// -------------------------------------------------------------------------

	it("validates period + format from FormData via safeFormGet", async () => {
		await exportDashboardReport(undefined, formData);

		expect(mockSafeFormGet).toHaveBeenCalledWith(formData, "period");
		expect(mockSafeFormGet).toHaveBeenCalledWith(formData, "format");
		expect(mockValidateInput).toHaveBeenCalledWith(expect.anything(), {
			period: "month",
			format: "csv",
		});
	});

	it("returns validation error when schema fails", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Période invalide" },
		});

		const result = await exportDashboardReport(undefined, formData);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockFetchKpis).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Happy path
	// -------------------------------------------------------------------------

	it("fetches all 5 sources in parallel with the validated period", async () => {
		await exportDashboardReport(undefined, formData);

		expect(mockFetchKpis).toHaveBeenCalledWith("month");
		expect(mockFetchCustomerKpis).toHaveBeenCalledWith("month");
		expect(mockFetchRevenue).toHaveBeenCalledWith("month");
		expect(mockFetchTopProducts).toHaveBeenCalledWith("month");
		expect(mockFetchRecentOrders).toHaveBeenCalledWith();
	});

	it("calls buildDashboardExport with validated period + format + fetched data", async () => {
		await exportDashboardReport(undefined, formData);

		expect(mockBuildExport).toHaveBeenCalledWith("month", "csv", {
			kpis: { kpis: "kpis-data" },
			customerKpis: { customerKpis: "customer-kpis-data" },
			revenueChart: { revenue: "revenue-data" },
			topProducts: { products: [] },
			recentOrders: { orders: [] },
		});
	});

	it("returns success with the export payload as data", async () => {
		const result = await exportDashboardReport(undefined, formData);

		expect(mockSuccess).toHaveBeenCalledWith("Rapport genere", {
			filename: "dashboard-month-2026-04-17.csv",
			mimeType: "text/csv;charset=utf-8",
			content: "csv-content",
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// -------------------------------------------------------------------------
	// Error handling
	// -------------------------------------------------------------------------

	it("routes exceptions through handleActionError", async () => {
		mockFetchKpis.mockRejectedValue(new Error("DB crash"));

		const result = await exportDashboardReport(undefined, formData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("does not call buildDashboardExport when a fetcher fails", async () => {
		mockFetchRevenue.mockRejectedValue(new Error("KO"));

		await exportDashboardReport(undefined, formData);

		expect(mockBuildExport).not.toHaveBeenCalled();
	});
});
