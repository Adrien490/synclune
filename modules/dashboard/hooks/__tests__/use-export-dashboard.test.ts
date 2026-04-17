import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockExportDashboardReport } = vi.hoisted(() => ({
	mockExportDashboardReport: vi.fn(),
}));

vi.mock("@/modules/dashboard/actions/export-dashboard-report", () => ({
	exportDashboardReport: mockExportDashboardReport,
}));

vi.mock("sonner", () => ({
	toast: {
		loading: vi.fn(),
		dismiss: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

// ============================================================================
// DOM helpers (triggerDashboardDownload)
// ============================================================================

const createObjectURL = vi.fn(() => "blob:mock");
const revokeObjectURL = vi.fn();

beforeEach(() => {
	vi.stubGlobal("URL", {
		...URL,
		createObjectURL,
		revokeObjectURL,
	});
});

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useExportDashboard, triggerDashboardDownload } from "../use-export-dashboard";

// ============================================================================
// TESTS
// ============================================================================

const successPayload = {
	filename: "dashboard-month-2026-04-17.csv",
	mimeType: "text/csv;charset=utf-8",
	content: "csv-content",
};

const SUCCESS = {
	status: ActionStatus.SUCCESS,
	message: "Rapport genere",
	data: successPayload,
};

const ERROR = { status: ActionStatus.ERROR, message: "KO" };

describe("triggerDashboardDownload", () => {
	beforeEach(() => {
		createObjectURL.mockClear();
		revokeObjectURL.mockClear();
	});

	it("creates an anchor, triggers click, revokes the blob URL", () => {
		const appendSpy = vi.spyOn(document.body, "appendChild");
		const clickSpy = vi.fn();

		const origCreate = document.createElement.bind(document);
		const createSpy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			const el = origCreate(tag);
			if (tag === "a") {
				(el as HTMLAnchorElement).click = clickSpy;
			}
			return el;
		});

		triggerDashboardDownload(successPayload);

		expect(createObjectURL).toHaveBeenCalledTimes(1);
		expect(appendSpy).toHaveBeenCalled();
		expect(clickSpy).toHaveBeenCalled();
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");

		createSpy.mockRestore();
		appendSpy.mockRestore();
	});
});

describe("useExportDashboard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockExportDashboardReport.mockResolvedValue(SUCCESS);
		createObjectURL.mockClear();
	});

	it("returns exportReport function, isPending state and state", () => {
		const { result } = renderHook(() => useExportDashboard());

		expect(typeof result.current.exportReport).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useExportDashboard());

		expect(result.current.isPending).toBe(false);
	});

	it("calls exportDashboardReport with a FormData containing period + format", async () => {
		const { result } = renderHook(() => useExportDashboard());

		await act(async () => {
			result.current.exportReport({ period: "30d", format: "json" });
		});

		expect(mockExportDashboardReport).toHaveBeenCalledTimes(1);
		const [, formData] = mockExportDashboardReport.mock.calls[0] as [unknown, FormData];
		expect(formData).toBeInstanceOf(FormData);
		expect(formData.get("period")).toBe("30d");
		expect(formData.get("format")).toBe("json");
	});

	it("triggers download and calls onSuccess with payload on success", async () => {
		const clickSpy = vi.fn();
		const origCreate = document.createElement.bind(document);
		const createSpy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			const el = origCreate(tag);
			if (tag === "a") (el as HTMLAnchorElement).click = clickSpy;
			return el;
		});

		const onSuccess = vi.fn();
		const { result } = renderHook(() => useExportDashboard({ onSuccess }));

		await act(async () => {
			result.current.exportReport({ period: "month", format: "csv" });
		});

		expect(clickSpy).toHaveBeenCalled();
		expect(onSuccess).toHaveBeenCalledWith(successPayload);
		createSpy.mockRestore();
	});

	it("does not trigger download when action returns error", async () => {
		mockExportDashboardReport.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();

		const { result } = renderHook(() => useExportDashboard({ onSuccess }));

		await act(async () => {
			result.current.exportReport({ period: "month", format: "csv" });
		});

		expect(createObjectURL).not.toHaveBeenCalled();
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("does not trigger download when data payload is malformed", async () => {
		mockExportDashboardReport.mockResolvedValue({
			status: ActionStatus.SUCCESS,
			message: "ok",
			data: { filename: "x.csv" }, // missing mimeType + content
		});
		const onSuccess = vi.fn();

		const { result } = renderHook(() => useExportDashboard({ onSuccess }));

		await act(async () => {
			result.current.exportReport({ period: "month", format: "csv" });
		});

		expect(createObjectURL).not.toHaveBeenCalled();
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
