import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockShare, mockTriggerHaptic, canShareRef } = vi.hoisted(() => ({
	mockShare: vi.fn().mockResolvedValue("shared" as const),
	mockTriggerHaptic: vi.fn(),
	canShareRef: { current: true as boolean },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/hooks/use-web-share", () => ({
	useWebShare: () => ({
		get canShare() {
			return canShareRef.current;
		},
		share: mockShare,
	}),
}));

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

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockShare.mockResolvedValue("shared" as const);
	canShareRef.current = true;
});

describe("ShareButton", () => {
	describe("rendering", () => {
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
		it("calls share hook with correct data when button is clicked", async () => {
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(mockShare).toHaveBeenCalledOnce();
			});
			const callArg = mockShare.mock.calls[0]?.[0] as {
				title: string;
				text?: string;
				url: string;
			};
			expect(callArg.title).toBe("Bague Lune Argent");
			expect(callArg.text).toBe("Découvrez ce bijou");
		});

		it("shows check icon feedback after successful share", async () => {
			mockShare.mockResolvedValue("shared" as const);
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(screen.getByTestId("check-icon")).toBeInTheDocument();
			});
		});

		it("updates button aria-label to 'Lien copié' after clipboard copy", async () => {
			mockShare.mockResolvedValue("copied" as const);
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Lien copié");
			});
		});

		it("shows copy icon feedback when result is 'copied'", async () => {
			mockShare.mockResolvedValue("copied" as const);
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(screen.getByTestId("copy-icon")).toBeInTheDocument();
			});
		});

		it("does not change feedback state when share returns 'dismissed'", async () => {
			mockShare.mockResolvedValue("dismissed" as const);
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				// After dismissed, the button reverts to share2-icon (no feedback)
				expect(screen.getByTestId("share2-icon")).toBeInTheDocument();
			});
		});
	});

	describe("feedback feedback timeout", () => {
		it("reverts to default Share2 icon after the feedback timeout", async () => {
			vi.useFakeTimers({ shouldAdvanceTime: true });
			mockShare.mockResolvedValue("shared" as const);
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			// Allow the share promise microtask to resolve
			await Promise.resolve();
			// Advance past the 2000ms feedback duration
			vi.advanceTimersByTime(2100);
			await waitFor(() => {
				expect(screen.getByTestId("share2-icon")).toBeInTheDocument();
			});
			vi.useRealTimers();
		});
	});

	describe("tooltip content", () => {
		it("shows 'Lien copié !' in tooltip when result is 'copied'", async () => {
			mockShare.mockResolvedValue("copied" as const);
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(screen.getByTestId("tooltip-content").textContent).toBe("Lien copié !");
			});
		});
	});

	describe("haptic feedback", () => {
		it("triggers success haptic when share succeeds", async () => {
			mockShare.mockResolvedValue("shared" as const);
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(mockTriggerHaptic).toHaveBeenCalledWith("success");
			});
		});

		it("triggers success haptic when clipboard copy succeeds", async () => {
			mockShare.mockResolvedValue("copied" as const);
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(mockTriggerHaptic).toHaveBeenCalledWith("success");
			});
		});

		it("does not trigger haptic when share is dismissed", async () => {
			mockShare.mockResolvedValue("dismissed" as const);
			renderDefault();
			fireEvent.click(screen.getByRole("button"));
			await waitFor(() => {
				expect(mockShare).toHaveBeenCalled();
			});
			expect(mockTriggerHaptic).not.toHaveBeenCalled();
		});
	});

	describe("desktop fallback (no Web Share API)", () => {
		it("renders a dropdown menu trigger when Web Share is unavailable", () => {
			canShareRef.current = false;
			renderDefault();
			expect(screen.getByTestId("share-button-trigger")).toBeInTheDocument();
			// Dropdown content is mounted in tests (mocked Radix portal)
			expect(screen.getByTestId("dropdown-content")).toBeInTheDocument();
		});

		it("includes a Pinterest share link with encoded URL and title", () => {
			canShareRef.current = false;
			renderDefault({ url: "/creations/bague-lune" });
			const pinterestLink = screen.getByRole("link", { name: /pinterest/i });
			const href = pinterestLink.getAttribute("href") ?? "";
			expect(href).toContain("pinterest.com/pin/create/button/");
			expect(href).toContain("url=");
			expect(href).toContain("description=Bague");
		});

		it("includes media param when media prop is provided", () => {
			canShareRef.current = false;
			renderDefault({ media: "https://cdn.example.com/bague.jpg" });
			const pinterestLink = screen.getByRole("link", { name: /pinterest/i });
			expect(pinterestLink.getAttribute("href")).toContain("media=");
		});

		it("omits media param when no media prop", () => {
			canShareRef.current = false;
			renderDefault();
			const pinterestLink = screen.getByRole("link", { name: /pinterest/i });
			expect(pinterestLink.getAttribute("href")).not.toContain("media=");
		});

		it("includes a mailto: link with subject and body", () => {
			canShareRef.current = false;
			renderDefault();
			const mailLink = screen.getByRole("link", { name: /envoyer par e-mail/i });
			const href = mailLink.getAttribute("href") ?? "";
			expect(href).toMatch(/^mailto:/);
			expect(href).toContain("subject=");
			expect(href).toContain("body=");
		});

		it("renders a copy-link menu item", () => {
			canShareRef.current = false;
			renderDefault();
			expect(screen.getByText(/copier le lien/i)).toBeInTheDocument();
		});

		it("does not call the native share hook when canShare=false", () => {
			canShareRef.current = false;
			renderDefault();
			fireEvent.click(screen.getByTestId("share-button-trigger"));
			expect(mockShare).not.toHaveBeenCalled();
		});
	});
});
