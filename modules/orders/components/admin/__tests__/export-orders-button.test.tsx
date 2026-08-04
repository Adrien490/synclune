import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		variant,
		size,
		onClick,
		disabled,
	}: {
		children: React.ReactNode;
		variant?: string;
		size?: string;
		onClick?: () => void;
		disabled?: boolean;
	}) => (
		<button data-variant={variant} data-size={size} onClick={onClick} disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/dialog", () => ({
	Dialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (
		<div data-testid="dialog" data-open={open}>
			{children}
		</div>
	),
	DialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-content">{children}</div>
	),
	DialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="dialog-description">{children}</p>
	),
	DialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-footer">{children}</div>
	),
	DialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-header">{children}</div>
	),
	DialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="dialog-title">{children}</h2>
	),
	DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
		if (asChild) return <>{children}</>;
		return <div data-testid="dialog-trigger">{children}</div>;
	},
}));

const { mockSelectCallbacks } = vi.hoisted(() => ({
	mockSelectCallbacks: new Map<number, (v: string) => void>(),
}));

let selectCounter = 0;
vi.mock("@/shared/components/ui/select", () => ({
	Select: ({
		children,
		value,
		onValueChange,
	}: {
		children: React.ReactNode;
		value?: string;
		onValueChange?: (v: string) => void;
	}) => {
		const id = selectCounter++;
		if (onValueChange) mockSelectCallbacks.set(id, onValueChange);
		return (
			<div data-testid="select" data-value={value} data-select-id={id}>
				{children}
			</div>
		);
	},
	SelectContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="select-content">{children}</div>
	),
	SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<div data-testid={`select-item-${value}`} data-value={value}>
			{children}
		</div>
	),
	SelectTrigger: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="select-trigger">{children}</div>
	),
	SelectValue: () => <span data-testid="select-value" />,
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
		<input data-testid="input" {...props} />
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	DownloadSimpleIcon: () => <svg data-testid="icon-download" />,
	SpinnerIcon: () => <svg data-testid="icon-loader" />,
}));

const { mockToast } = vi.hoisted(() => {
	const toast = {
		success: vi.fn(),
		error: vi.fn(),
		promise: vi.fn(
			(
				promise: Promise<unknown>,
				opts: {
					loading?: string;
					success?: string | ((d: unknown) => string);
					error?: string | ((e: unknown) => string);
				},
			) => {
				promise.then(
					(data) => {
						const msg = typeof opts.success === "function" ? opts.success(data) : opts.success;
						if (msg) toast.success(msg);
					},
					(err) => {
						const msg = typeof opts.error === "function" ? opts.error(err) : opts.error;
						if (msg) toast.error(msg);
					},
				);
				return "toast-id";
			},
		),
	};
	return { mockToast: toast };
});

vi.mock("sonner", () => ({ toast: mockToast }));
vi.mock("@/shared/utils/toast", () => ({ toast: mockToast }));

import { ExportOrdersButton } from "../export-orders-button";

/** Helper: trigger the onValueChange of the first Select (period type) */
function changePeriodType(value: string) {
	// The period type select is always the first one rendered (lowest id)
	const selects = screen.getAllByTestId("select");
	const id = Number(selects[0]!.getAttribute("data-select-id"));
	const callback = mockSelectCallbacks.get(id);
	callback?.(value);
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ExportOrdersButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		selectCounter = 0;
		mockSelectCallbacks.clear();
	});

	it("renders without crashing", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("dialog")).toBeInTheDocument();
	});

	it("renders the trigger button with 'Exporter' text", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByText("Exporter")).toBeInTheDocument();
	});

	it("renders download icons (trigger + footer)", () => {
		render(<ExportOrdersButton />);
		const icons = screen.getAllByTestId("icon-download");
		expect(icons.length).toBeGreaterThanOrEqual(1);
	});

	it("renders dialog title 'Exporter le livre de recettes'", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("dialog-title")).toHaveTextContent("Exporter le livre de recettes");
	});

	it("renders dialog description with legal reference", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("dialog-description")).toHaveTextContent("Article 286 CGI");
	});

	it("renders period select", () => {
		render(<ExportOrdersButton />);
		const selects = screen.getAllByTestId("select");
		expect(selects.length).toBeGreaterThan(0);
	});

	it("renders 'Toutes les commandes' period option", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("select-item-all")).toHaveTextContent("Toutes les commandes");
	});

	it("renders 'Par année' period option", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("select-item-year")).toHaveTextContent("Par année");
	});

	it("renders 'Par mois' period option", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("select-item-month")).toHaveTextContent("Par mois");
	});

	it("renders 'Période personnalisée' period option", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("select-item-custom")).toHaveTextContent("Période personnalisée");
	});

	it("renders 'Télécharger CSV' button in footer", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByText("Télécharger CSV")).toBeInTheDocument();
	});

	it("renders 'Annuler' button in footer", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByText("Annuler")).toBeInTheDocument();
	});

	it("dialog starts closed", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "false");
	});

	// ─── Period type selection ─────────────────────────────────────────────

	it("shows year select when period is 'year'", async () => {
		render(<ExportOrdersButton />);
		await act(() => changePeriodType("year"));
		// Should now have 2 selects: period + year
		expect(screen.getAllByTestId("select").length).toBeGreaterThanOrEqual(2);
	});

	it("shows month select when period is 'month'", async () => {
		render(<ExportOrdersButton />);
		await act(() => changePeriodType("month"));
		// Should now have 3 selects: period + year + month
		expect(screen.getAllByTestId("select").length).toBeGreaterThanOrEqual(3);
	});

	it("shows date inputs when period is 'custom'", async () => {
		render(<ExportOrdersButton />);
		await act(() => changePeriodType("custom"));
		const inputs = screen.getAllByTestId("input");
		expect(inputs.length).toBe(2);
	});

	// ─── Export behavior ──────────────────────────────────────────────────

	it("calls fetch with periodType=all on export", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			blob: () => Promise.resolve(new Blob(["csv"])),
			headers: new Headers({ "Content-Disposition": 'filename="export.csv"' }),
		});
		vi.stubGlobal("fetch", mockFetch);

		render(<ExportOrdersButton />);
		const exportBtn = screen.getByText("Télécharger CSV");
		await userEvent.click(exportBtn);

		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("periodType=all"), {
			method: "POST",
		});
		vi.unstubAllGlobals();
	});

	it("shows toast.error when custom dates are missing", async () => {
		const { toast } = await import("sonner");
		render(<ExportOrdersButton />);
		await act(() => changePeriodType("custom"));

		const exportBtn = screen.getByText("Télécharger CSV");
		await userEvent.click(exportBtn);

		expect(toast.error).toHaveBeenCalledWith("Veuillez renseigner les dates de début et de fin");
	});

	it("shows toast.error when fetch fails", async () => {
		const { toast } = await import("sonner");
		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ error: "Server error" }),
		});
		vi.stubGlobal("fetch", mockFetch);

		render(<ExportOrdersButton />);
		const exportBtn = screen.getByText("Télécharger CSV");
		await userEvent.click(exportBtn);

		expect(toast.error).toHaveBeenCalledWith("Server error");
		vi.unstubAllGlobals();
	});

	it("shows generic error when fetch throws", async () => {
		const { toast } = await import("sonner");
		const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
		vi.stubGlobal("fetch", mockFetch);

		render(<ExportOrdersButton />);
		const exportBtn = screen.getByText("Télécharger CSV");
		await userEvent.click(exportBtn);

		expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'export");
		vi.unstubAllGlobals();
	});

	it("shows generic error when response.json fails", async () => {
		const { toast } = await import("sonner");
		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			json: () => Promise.reject(new Error("parse error")),
		});
		vi.stubGlobal("fetch", mockFetch);

		render(<ExportOrdersButton />);
		const exportBtn = screen.getByText("Télécharger CSV");
		await userEvent.click(exportBtn);

		expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'export");
		vi.unstubAllGlobals();
	});

	it("downloads CSV on successful export", async () => {
		const { toast } = await import("sonner");
		const mockBlob = new Blob(["data"]);
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			blob: () => Promise.resolve(mockBlob),
			headers: new Headers({ "Content-Disposition": 'filename="orders-2026.csv"' }),
		});
		vi.stubGlobal("fetch", mockFetch);

		const mockLink = { href: "", download: "", click: vi.fn() };
		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			if (tag === "a") return mockLink as unknown as HTMLAnchorElement;
			return originalCreateElement(tag);
		});
		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:url");
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

		render(<ExportOrdersButton />);
		const exportBtn = screen.getByText("Télécharger CSV");
		await userEvent.click(exportBtn);

		expect(mockLink.download).toBe("orders-2026.csv");
		expect(mockLink.click).toHaveBeenCalled();
		expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:url");
		expect(toast.success).toHaveBeenCalledWith("Export téléchargé");

		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("falls back to 'export.csv' when no Content-Disposition header", async () => {
		const mockBlob = new Blob(["data"]);
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			blob: () => Promise.resolve(mockBlob),
			headers: new Headers(),
		});
		vi.stubGlobal("fetch", mockFetch);

		const mockLink = { href: "", download: "", click: vi.fn() };
		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			if (tag === "a") return mockLink as unknown as HTMLAnchorElement;
			return originalCreateElement(tag);
		});
		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:url");
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

		render(<ExportOrdersButton />);
		const exportBtn = screen.getByText("Télécharger CSV");
		await userEvent.click(exportBtn);

		expect(mockLink.download).toBe("export.csv");

		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("sends year param when periodType is year", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			blob: () => Promise.resolve(new Blob(["csv"])),
			headers: new Headers(),
		});
		vi.stubGlobal("fetch", mockFetch);

		const mockLink = { href: "", download: "", click: vi.fn() };
		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			if (tag === "a") return mockLink as unknown as HTMLAnchorElement;
			return originalCreateElement(tag);
		});
		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:url");
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

		render(<ExportOrdersButton />);
		await act(() => changePeriodType("year"));

		const exportBtn = screen.getByText("Télécharger CSV");
		await userEvent.click(exportBtn);

		const fetchUrl = mockFetch.mock.calls[0]![0] as string;
		expect(fetchUrl).toContain("periodType=year");
		expect(fetchUrl).toContain("year=");

		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});
});
