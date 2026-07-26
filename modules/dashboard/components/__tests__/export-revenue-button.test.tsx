import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockTriggerHaptic, mockToastPromise } = vi.hoisted(() => ({
	mockTriggerHaptic: vi.fn(),
	mockToastPromise: vi.fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: {
		promise: mockToastPromise,
	},
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		...props
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		[k: string]: unknown;
	}) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Download: () => <svg data-testid="icon-download" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

vi.mock("../../services/period-boundaries.service", () => ({
	getPeriodBoundaries: vi.fn(() => ({
		currentStart: new Date("2026-04-01T00:00:00Z"),
		currentEnd: new Date("2026-05-08T00:00:00Z"),
		previousStart: new Date("2026-03-01T00:00:00Z"),
		previousEnd: new Date("2026-04-01T00:00:00Z"),
		previousYearStart: new Date("2025-04-01T00:00:00Z"),
		previousYearEnd: new Date("2025-05-08T00:00:00Z"),
	})),
}));

import { ExportRevenueButton } from "../export-revenue-button";

// ============================================================================
// SETUP
// ============================================================================

const FIXED_NOW = new Date("2026-05-08T12:00:00Z");

const originalFetch = globalThis.fetch;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

let mockFetch: ReturnType<typeof vi.fn>;
let mockCreateObjectURL: ReturnType<typeof vi.fn>;
let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
let clickSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(FIXED_NOW);

	mockFetch = vi.fn();
	mockCreateObjectURL = vi.fn(() => "blob:mock-url");
	mockRevokeObjectURL = vi.fn();
	globalThis.fetch = mockFetch as unknown as typeof fetch;
	URL.createObjectURL = mockCreateObjectURL as unknown as typeof URL.createObjectURL;
	URL.revokeObjectURL = mockRevokeObjectURL as unknown as typeof URL.revokeObjectURL;

	// Stub anchor click so jsdom doesn't actually navigate
	clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

	// toast.promise simply awaits the promise; tests assert on its arguments
	mockToastPromise.mockImplementation((p: Promise<unknown>) => p.catch(() => {}));
});

afterEach(() => {
	cleanup();
	clickSpy.mockRestore();
	globalThis.fetch = originalFetch;
	URL.createObjectURL = originalCreateObjectURL;
	URL.revokeObjectURL = originalRevokeObjectURL;
	vi.useRealTimers();
	vi.clearAllMocks();
});

function makeOkResponse(filename = "livre-recettes-2026-05-08.csv"): Response {
	return new Response(new Blob([""], { type: "text/csv" }), {
		status: 200,
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="${filename}"`,
		},
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("ExportRevenueButton", () => {
	it("renders a button with French label and aria-label", () => {
		render(<ExportRevenueButton period="month" />);

		const button = screen.getByRole("button", {
			name: "Exporter le livre de recettes au format CSV",
		});
		expect(button).toBeInTheDocument();
		expect(screen.getByText("Exporter")).toBeInTheDocument();
		expect(screen.getByTestId("icon-download")).toBeInTheDocument();
	});

	describe("URL building per period", () => {
		it("month → periodType=month with current year+month", async () => {
			mockFetch.mockResolvedValue(makeOkResponse());
			render(<ExportRevenueButton period="month" />);

			fireEvent.click(screen.getByRole("button"));

			await waitFor(() => expect(mockFetch).toHaveBeenCalled());
			const url = String(mockFetch.mock.calls[0]?.[0]);
			expect(url).toContain("/api/admin/orders/export?");
			expect(url).toContain("periodType=month");
			expect(url).toContain("year=2026");
			expect(url).toContain("month=5");
		});

		it("year → periodType=year with current year", async () => {
			mockFetch.mockResolvedValue(makeOkResponse());
			render(<ExportRevenueButton period="year" />);

			fireEvent.click(screen.getByRole("button"));

			await waitFor(() => expect(mockFetch).toHaveBeenCalled());
			const url = String(mockFetch.mock.calls[0]?.[0]);
			expect(url).toContain("periodType=year");
			expect(url).toContain("year=2026");
			expect(url).not.toContain("month=");
		});

		it("7d → periodType=custom with ISO date range", async () => {
			mockFetch.mockResolvedValue(makeOkResponse());
			render(<ExportRevenueButton period="7d" />);

			fireEvent.click(screen.getByRole("button"));

			await waitFor(() => expect(mockFetch).toHaveBeenCalled());
			const url = String(mockFetch.mock.calls[0]?.[0]);
			expect(url).toContain("periodType=custom");
			expect(url).toContain("dateFrom=2026-04-01");
			expect(url).toContain("dateTo=2026-05-08");
		});

		it("quarter → periodType=custom (uses getPeriodBoundaries)", async () => {
			mockFetch.mockResolvedValue(makeOkResponse());
			render(<ExportRevenueButton period="quarter" />);

			fireEvent.click(screen.getByRole("button"));

			await waitFor(() => expect(mockFetch).toHaveBeenCalled());
			expect(String(mockFetch.mock.calls[0]?.[0])).toContain("periodType=custom");
		});
	});

	describe("download flow", () => {
		it("downloads the blob and revokes the URL", async () => {
			mockFetch.mockResolvedValue(makeOkResponse());
			render(<ExportRevenueButton period="month" />);

			fireEvent.click(screen.getByRole("button"));

			await waitFor(() => expect(mockCreateObjectURL).toHaveBeenCalled());
			expect(clickSpy).toHaveBeenCalledTimes(1);
			await waitFor(() => expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url"));
		});

		it("uses the filename from Content-Disposition", async () => {
			mockFetch.mockResolvedValue(makeOkResponse("livre-recettes-2026-05-08.csv"));
			render(<ExportRevenueButton period="month" />);

			let downloadAttr = "";
			clickSpy.mockImplementation(function (this: HTMLAnchorElement) {
				downloadAttr = this.download;
			});

			fireEvent.click(screen.getByRole("button"));

			await waitFor(() => expect(clickSpy).toHaveBeenCalled());
			expect(downloadAttr).toBe("livre-recettes-2026-05-08.csv");
		});

		it("falls back to default filename if header missing", async () => {
			mockFetch.mockResolvedValue(
				new Response(new Blob([""], { type: "text/csv" }), { status: 200 }),
			);
			render(<ExportRevenueButton period="month" />);

			let downloadAttr = "";
			clickSpy.mockImplementation(function (this: HTMLAnchorElement) {
				downloadAttr = this.download;
			});

			fireEvent.click(screen.getByRole("button"));

			await waitFor(() => expect(clickSpy).toHaveBeenCalled());
			expect(downloadAttr).toBe("livre-recettes.csv");
		});
	});

	describe("error handling", () => {
		it("throws server error message when API returns non-OK", async () => {
			mockFetch.mockResolvedValue(
				new Response(JSON.stringify({ error: "Période invalide" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				}),
			);

			render(<ExportRevenueButton period="month" />);
			fireEvent.click(screen.getByRole("button"));

			await waitFor(() => expect(mockToastPromise).toHaveBeenCalled());
			const opts = mockToastPromise.mock.calls[0]?.[1] as
				{ error: (e: Error) => string } | undefined;
			expect(opts?.error(new Error("Période invalide"))).toBe("Période invalide");
		});

		it("falls back to generic message on JSON parse failure", async () => {
			mockFetch.mockResolvedValue(
				new Response("not json", {
					status: 500,
					headers: { "Content-Type": "text/plain" },
				}),
			);

			render(<ExportRevenueButton period="month" />);
			fireEvent.click(screen.getByRole("button"));

			await waitFor(() => expect(mockToastPromise).toHaveBeenCalled());
		});
	});

	describe("haptic feedback", () => {
		it("triggers medium on click and success on completion", async () => {
			mockFetch.mockResolvedValue(makeOkResponse());
			render(<ExportRevenueButton period="month" />);

			fireEvent.click(screen.getByRole("button"));

			expect(mockTriggerHaptic).toHaveBeenNthCalledWith(1, "medium");
			await waitFor(() => expect(mockTriggerHaptic).toHaveBeenNthCalledWith(2, "success"));
		});

		it("triggers error on failure", async () => {
			mockFetch.mockRejectedValue(new Error("network down"));
			render(<ExportRevenueButton period="month" />);

			fireEvent.click(screen.getByRole("button"));

			await waitFor(() => expect(mockTriggerHaptic).toHaveBeenCalledWith("error"));
		});
	});

	describe("loading state", () => {
		it("disables the button while exporting", async () => {
			let resolveFetch!: (r: Response) => void;
			mockFetch.mockReturnValue(
				new Promise<Response>((resolve) => {
					resolveFetch = resolve;
				}),
			);

			render(<ExportRevenueButton period="month" />);
			const button = screen.getByRole("button");

			fireEvent.click(button);

			await waitFor(() => expect(button).toBeDisabled());
			expect(button).toHaveAttribute("aria-busy", "true");
			expect(screen.getByTestId("icon-loader")).toBeInTheDocument();

			resolveFetch(makeOkResponse());
			await waitFor(() => expect(button).not.toBeDisabled());
		});

		it("ignores re-clicks while exporting", async () => {
			let resolveFetch!: (r: Response) => void;
			mockFetch.mockReturnValue(
				new Promise<Response>((resolve) => {
					resolveFetch = resolve;
				}),
			);

			render(<ExportRevenueButton period="month" />);
			const button = screen.getByRole("button");

			fireEvent.click(button);
			fireEvent.click(button);
			fireEvent.click(button);

			expect(mockFetch).toHaveBeenCalledTimes(1);
			resolveFetch(makeOkResponse());
		});
	});
});
