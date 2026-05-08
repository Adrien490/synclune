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
			expect(screen.getByText("Téléchargement…")).toBeInTheDocument();
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

	describe("successful download", () => {
		it("creates a blob URL and triggers anchor click on successful response", async () => {
			const user = userEvent.setup();
			const fakeBlob = new Blob(["pdf content"], { type: "application/pdf" });
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				blob: vi.fn().mockResolvedValue(fakeBlob),
			} as unknown as Response);
			vi.stubGlobal("fetch", fetchMock);

			const fakeUrl = "blob:http://localhost/fake-uuid";
			const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue(fakeUrl);
			const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

			const fakeAnchor = {
				href: "",
				download: "",
				click: vi.fn(),
			};
			const originalCreateElement = document.createElement.bind(document);
			const createElementSpy = vi
				.spyOn(document, "createElement")
				.mockImplementation((tagName: string) => {
					if (tagName === "a") return fakeAnchor as unknown as HTMLElement;
					return originalCreateElement(tagName);
				});

			renderComponent("CMD-001");
			await user.click(screen.getByRole("button", { name: /Télécharger la facture/i }));

			expect(createObjectURLSpy).toHaveBeenCalledWith(fakeBlob);
			expect(fakeAnchor.href).toBe(fakeUrl);
			expect(fakeAnchor.download).toBe("facture-CMD-001.pdf");
			expect(fakeAnchor.click).toHaveBeenCalledOnce();
			expect(revokeObjectURLSpy).toHaveBeenCalledWith(fakeUrl);

			createObjectURLSpy.mockRestore();
			revokeObjectURLSpy.mockRestore();
			createElementSpy.mockRestore();
			vi.unstubAllGlobals();
		});

		it("resets loading state after successful download", async () => {
			const user = userEvent.setup();
			const fakeBlob = new Blob(["pdf"], { type: "application/pdf" });
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				blob: vi.fn().mockResolvedValue(fakeBlob),
			} as unknown as Response);
			vi.stubGlobal("fetch", fetchMock);

			vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
			vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
			const originalCreateElement2 = document.createElement.bind(document);
			vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
				if (tagName === "a")
					return { href: "", download: "", click: vi.fn() } as unknown as HTMLElement;
				return originalCreateElement2(tagName);
			});

			renderComponent("CMD-001");
			await user.click(screen.getByRole("button", { name: /Télécharger la facture/i }));

			const button = screen.getByRole("button", { name: /Télécharger la facture/i });
			expect(button).not.toBeDisabled();
			expect(button).toHaveAttribute("aria-busy", "false");

			vi.restoreAllMocks();
			vi.unstubAllGlobals();
		});
	});

	describe("error handling", () => {
		it("shows generic error toast on non-ok, non-404 response", async () => {
			const { toast } = await import("sonner");
			const user = userEvent.setup();
			const fetchMock = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
			} as unknown as Response);
			vi.stubGlobal("fetch", fetchMock);

			renderComponent("CMD-001");
			await user.click(screen.getByRole("button", { name: /Télécharger la facture/i }));

			expect(toast.error).toHaveBeenCalledWith("Erreur lors du téléchargement de la facture");

			vi.unstubAllGlobals();
		});

		it("shows 404-specific error toast when invoice is not yet available", async () => {
			const { toast } = await import("sonner");
			const user = userEvent.setup();
			const fetchMock = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
			} as unknown as Response);
			vi.stubGlobal("fetch", fetchMock);

			renderComponent("CMD-001");
			await user.click(screen.getByRole("button", { name: /Télécharger la facture/i }));

			expect(toast.error).toHaveBeenCalledWith("La facture n'est pas encore disponible");

			vi.unstubAllGlobals();
		});

		it("shows generic error toast on network failure", async () => {
			const { toast } = await import("sonner");
			const user = userEvent.setup();
			const fetchMock = vi.fn().mockRejectedValue(new Error("Network error"));
			vi.stubGlobal("fetch", fetchMock);

			renderComponent("CMD-001");
			await user.click(screen.getByRole("button", { name: /Télécharger la facture/i }));

			expect(toast.error).toHaveBeenCalledWith("Impossible de télécharger la facture");

			vi.unstubAllGlobals();
		});

		it("resets loading state after a non-ok response", async () => {
			const user = userEvent.setup();
			const fetchMock = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
			} as unknown as Response);
			vi.stubGlobal("fetch", fetchMock);

			renderComponent("CMD-001");
			await user.click(screen.getByRole("button", { name: /Télécharger la facture/i }));

			const button = screen.getByRole("button", { name: /Télécharger la facture/i });
			expect(button).not.toBeDisabled();
			expect(button).toHaveAttribute("aria-busy", "false");

			vi.unstubAllGlobals();
		});

		it("resets loading state after a network error", async () => {
			const user = userEvent.setup();
			const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
			vi.stubGlobal("fetch", fetchMock);

			renderComponent("CMD-001");
			await user.click(screen.getByRole("button", { name: /Télécharger la facture/i }));

			const button = screen.getByRole("button", { name: /Télécharger la facture/i });
			expect(button).not.toBeDisabled();
			expect(button).toHaveAttribute("aria-busy", "false");

			vi.unstubAllGlobals();
		});

		it("shows generic error toast when blob() throws", async () => {
			const { toast } = await import("sonner");
			const user = userEvent.setup();
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				blob: vi.fn().mockRejectedValue(new Error("blob failed")),
			} as unknown as Response);
			vi.stubGlobal("fetch", fetchMock);

			renderComponent("CMD-001");
			await user.click(screen.getByRole("button", { name: /Télécharger la facture/i }));

			expect(toast.error).toHaveBeenCalledWith("Erreur lors du téléchargement de la facture");

			vi.unstubAllGlobals();
		});
	});
});
