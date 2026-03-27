import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		"aria-busy": ariaBusy,
		...props
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		"aria-busy"?: boolean;
		[key: string]: unknown;
	}) => (
		<button
			onClick={onClick}
			disabled={disabled}
			aria-busy={ariaBusy}
			{...(props as Record<string, unknown>)}
		>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Download: () => <svg data-testid="icon-download" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn() },
}));

import { DownloadInvoiceButton } from "../download-invoice-button";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function renderComponent(orderNumber = "CMD-001") {
	return render(<DownloadInvoiceButton orderNumber={orderNumber} />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("DownloadInvoiceButton", () => {
	describe("static rendering", () => {
		it("renders section with 'Facture' heading", () => {
			renderComponent();
			expect(screen.getByRole("heading", { name: "Facture" })).toBeInTheDocument();
		});

		it("shows 'Télécharger la facture' button", () => {
			renderComponent();
			expect(screen.getByRole("button", { name: /Télécharger la facture/i })).toBeInTheDocument();
		});

		it("button is not disabled initially", () => {
			renderComponent();
			expect(screen.getByRole("button", { name: /Télécharger la facture/i })).not.toBeDisabled();
		});

		it("button has aria-busy=false initially", () => {
			renderComponent();
			const button = screen.getByRole("button", { name: /Télécharger la facture/i });
			expect(button).toHaveAttribute("aria-busy", "false");
		});

		it("shows download icon initially", () => {
			renderComponent();
			expect(screen.getByTestId("icon-download")).toBeInTheDocument();
		});
	});

	describe("download interaction", () => {
		it("shows loading state while downloading", async () => {
			const user = userEvent.setup();
			// Mock fetch to return a pending promise so the loading state persists
			const fetchMock = vi.fn(
				() =>
					new Promise<Response>(() => {
						// never resolves during this test
					}),
			);
			vi.stubGlobal("fetch", fetchMock);

			renderComponent("CMD-001");
			await user.click(screen.getByRole("button", { name: /Télécharger la facture/i }));

			expect(screen.getByRole("button")).toBeDisabled();
			expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
			expect(screen.getByText("Téléchargement...")).toBeInTheDocument();
			expect(screen.getByTestId("icon-loader")).toBeInTheDocument();

			vi.unstubAllGlobals();
		});

		it("calls the correct invoice API endpoint on click", async () => {
			const user = userEvent.setup();
			const fetchMock = vi.fn(
				() =>
					new Promise<Response>(() => {
						// never resolves
					}),
			);
			vi.stubGlobal("fetch", fetchMock);

			renderComponent("CMD-042");
			await user.click(screen.getByRole("button", { name: /Télécharger la facture/i }));

			expect(fetchMock).toHaveBeenCalledWith("/api/orders/CMD-042/invoice");

			vi.unstubAllGlobals();
		});
	});
});
