import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockTriggerHaptic } = vi.hoisted(() => ({
	mockTriggerHaptic: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipTrigger: ({
		children,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <>{children}</>,
	TooltipContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="tooltip-content">{children}</div>
	),
}));

vi.mock("lucide-react", () => ({
	Share2: ({ size }: { size?: number }) => <span data-testid="share2-icon" data-size={size} />,
	Check: ({ size }: { size?: number }) => <span data-testid="check-icon" data-size={size} />,
	Copy: ({ size }: { size?: number }) => <span data-testid="copy-icon" data-size={size} />,
	Mail: ({ size }: { size?: number }) => <span data-testid="mail-icon" data-size={size} />,
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	DropdownMenuTrigger: ({
		children,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <>{children}</>,
	DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dropdown-content">{children}</div>
	),
	DropdownMenuItem: ({
		children,
		asChild: _asChild,
		onSelect,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		onSelect?: () => void;
	}) => (
		<button type="button" role="menuitem" onClick={onSelect}>
			{children}
		</button>
	),
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ShareButton } from "../share-button";

// ============================================================================
// navigator.share / navigator.clipboard helpers
// ============================================================================

const mockNavigatorShare = vi.fn();
const mockClipboardWriteText = vi.fn();

function setNavigatorShareAvailable(available: boolean) {
	if (available) {
		Object.defineProperty(navigator, "share", {
			value: mockNavigatorShare,
			configurable: true,
			writable: true,
		});
	} else {
		// @ts-expect-error removing optional property
		delete (navigator as Navigator & { share?: unknown }).share;
	}
}

function setupClipboard() {
	Object.defineProperty(navigator, "clipboard", {
		value: { writeText: mockClipboardWriteText },
		configurable: true,
		writable: true,
	});
}

// ============================================================================
// HELPERS
// ============================================================================

function renderDefault(props: Partial<React.ComponentProps<typeof ShareButton>> = {}) {
	return render(
		<ShareButton
			title="Bague Lune Argent"
			text="Découvrez ce bijou"
			url="/creations/bague-lune-argent"
			{...props}
		/>,
	);
}

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
	setupClipboard();
	mockNavigatorShare.mockReset();
	mockClipboardWriteText.mockReset();
	mockClipboardWriteText.mockResolvedValue(undefined);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	setNavigatorShareAvailable(false);
});

describe("ShareButton", () => {
	describe("rendering", () => {
		beforeEach(() => setNavigatorShareAvailable(true));

		it("renders a button with aria-label 'Partager'", () => {
			renderDefault();
			expect(screen.getByRole("button", { name: "Partager" })).toBeInTheDocument();
		});

		it("renders the Share2 icon by default", () => {
			renderDefault();
			expect(screen.getByTestId("share2-icon")).toBeInTheDocument();
		});

		it("renders tooltip content with 'Partager' text", () => {
			renderDefault();
			expect(screen.getByTestId("tooltip-content").textContent).toBe("Partager");
		});

		it("uses smaller icon size when size='sm' prop is provided", () => {
			renderDefault({ size: "sm" });
			const icon = screen.getByTestId("share2-icon");
			expect(icon).toHaveAttribute("data-size", "16");
		});

		it("uses larger icon size by default (size='lg')", () => {
			renderDefault();
			const icon = screen.getByTestId("share2-icon");
			expect(icon).toHaveAttribute("data-size", "20");
		});
	});

	describe("Web Share API", () => {
		beforeEach(() => {
			setNavigatorShareAvailable(true);
			mockNavigatorShare.mockResolvedValue(undefined);
		});

		it("calls navigator.share with correct data when button is clicked", async () => {
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(mockNavigatorShare).toHaveBeenCalledOnce();
			});
			const callArg = mockNavigatorShare.mock.calls[0]?.[0] as {
				title: string;
				text?: string;
				url: string;
			};
			expect(callArg.title).toBe("Bague Lune Argent");
			expect(callArg.text).toBe("Découvrez ce bijou");
		});

		it("shows check icon feedback after successful share", async () => {
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(screen.getByTestId("check-icon")).toBeInTheDocument();
			});
		});

		it("falls back to clipboard copy when navigator.share rejects (non-abort)", async () => {
			mockNavigatorShare.mockRejectedValue(new Error("unknown"));
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(mockClipboardWriteText).toHaveBeenCalled();
			});
			await waitFor(() => {
				expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Lien copié");
			});
		});

		it("shows copy icon feedback when falling back to clipboard", async () => {
			mockNavigatorShare.mockRejectedValue(new Error("unknown"));
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(screen.getByTestId("copy-icon")).toBeInTheDocument();
			});
		});

		it("does not change feedback state when share is dismissed (AbortError)", async () => {
			const abortErr = new Error("cancelled");
			abortErr.name = "AbortError";
			mockNavigatorShare.mockRejectedValue(abortErr);
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(mockNavigatorShare).toHaveBeenCalled();
			});
			expect(screen.getByTestId("share2-icon")).toBeInTheDocument();
		});
	});

	describe("haptic feedback", () => {
		beforeEach(() => setNavigatorShareAvailable(true));

		it("triggers success haptic when share succeeds", async () => {
			mockNavigatorShare.mockResolvedValue(undefined);
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(mockTriggerHaptic).toHaveBeenCalledWith("success");
			});
		});

		it("triggers success haptic on clipboard fallback", async () => {
			mockNavigatorShare.mockRejectedValue(new Error("unknown"));
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(mockTriggerHaptic).toHaveBeenCalledWith("success");
			});
		});

		it("does not trigger haptic when share is dismissed", async () => {
			const abortErr = new Error("cancelled");
			abortErr.name = "AbortError";
			mockNavigatorShare.mockRejectedValue(abortErr);
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(mockNavigatorShare).toHaveBeenCalled();
			});
			expect(mockTriggerHaptic).not.toHaveBeenCalled();
		});
	});

	describe("desktop fallback (no Web Share API)", () => {
		beforeEach(() => setNavigatorShareAvailable(false));

		it("renders a dropdown menu trigger when Web Share is unavailable", () => {
			renderDefault();
			expect(screen.getByTestId("share-button-trigger")).toBeInTheDocument();
			expect(screen.getByTestId("dropdown-content")).toBeInTheDocument();
		});

		it("includes a Pinterest share link with encoded URL and title", () => {
			renderDefault({ url: "/creations/bague-lune" });
			const pinterestLink = screen.getByRole("link", { name: /pinterest/i });
			const href = pinterestLink.getAttribute("href") ?? "";
			expect(href).toContain("pinterest.com/pin/create/button/");
			expect(href).toContain("url=");
			expect(href).toContain("description=Bague");
		});

		it("includes media param when media prop is provided", () => {
			renderDefault({ media: "https://cdn.example.com/bague.jpg" });
			const pinterestLink = screen.getByRole("link", { name: /pinterest/i });
			expect(pinterestLink.getAttribute("href")).toContain("media=");
		});

		it("omits media param when no media prop", () => {
			renderDefault();
			const pinterestLink = screen.getByRole("link", { name: /pinterest/i });
			expect(pinterestLink.getAttribute("href")).not.toContain("media=");
		});

		it("includes a mailto: link with subject and body", () => {
			renderDefault();
			const mailLink = screen.getByRole("link", { name: /envoyer par e-mail/i });
			const href = mailLink.getAttribute("href") ?? "";
			expect(href).toMatch(/^mailto:/);
			expect(href).toContain("subject=");
			expect(href).toContain("body=");
		});

		it("renders a copy-link menu item", () => {
			renderDefault();
			expect(screen.getByText(/copier le lien/i)).toBeInTheDocument();
		});

		it("does not call navigator.share when canShare=false", () => {
			renderDefault();
			fireEvent.click(screen.getByTestId("share-button-trigger"));
			expect(mockNavigatorShare).not.toHaveBeenCalled();
		});
	});
});
