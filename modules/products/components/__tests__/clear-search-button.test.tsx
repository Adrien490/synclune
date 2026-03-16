import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReplace, mockSearchParams } = vi.hoisted(() => ({
	mockReplace: vi.fn(),
	mockSearchParams: new URLSearchParams(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
	useSearchParams: () => mockSearchParams,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		"aria-label": ariaLabel,
		"aria-busy": ariaBusy,
		...props
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		"aria-label"?: string;
		"aria-busy"?: boolean;
		[key: string]: unknown;
	}) => (
		<button
			onClick={onClick}
			disabled={disabled}
			aria-label={ariaLabel}
			aria-busy={ariaBusy}
			{...props}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/spinner", () => ({
	Spinner: ({ className }: { className?: string }) => (
		<span data-testid="spinner" className={className} />
	),
}));

vi.mock("lucide-react", () => ({
	X: ({ className }: { className?: string }) => <span data-testid="x-icon" className={className} />,
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ClearSearchButton } from "../clear-search-button";

// ============================================================================
// HELPERS
// ============================================================================

function setSearch(term: string) {
	mockSearchParams.set("search", term);
}

function clearSearch() {
	mockSearchParams.delete("search");
	mockSearchParams.delete("cursor");
	mockSearchParams.delete("direction");
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	clearSearch();
});

describe("ClearSearchButton", () => {
	describe("hidden when no search", () => {
		it("renders nothing when no search param is present", () => {
			clearSearch();
			const { container } = render(<ClearSearchButton />);
			expect(container.firstChild).toBeNull();
		});

		it("renders nothing when search param is empty string", () => {
			mockSearchParams.set("search", "");
			const { container } = render(<ClearSearchButton />);
			// An empty search term still causes null return (searchTerm is falsy)
			expect(container.firstChild).toBeNull();
		});
	});

	describe("visible when search is active", () => {
		beforeEach(() => {
			setSearch("bague");
		});

		it("renders the clear button when a search term is present", () => {
			render(<ClearSearchButton />);
			expect(screen.getByRole("button")).toBeInTheDocument();
		});

		it("renders the X icon inside the button", () => {
			render(<ClearSearchButton />);
			expect(screen.getByTestId("x-icon")).toBeInTheDocument();
		});

		it("has an aria-label that includes the search term", () => {
			render(<ClearSearchButton />);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-label", 'Effacer la recherche "bague"');
		});
	});

	describe("click behavior", () => {
		it("calls router.replace to remove the search param when clicked", () => {
			setSearch("collier");
			render(<ClearSearchButton />);
			fireEvent.click(screen.getByRole("button"));
			expect(mockReplace).toHaveBeenCalledOnce();
			const callArg = mockReplace.mock.calls[0]?.[0] as string;
			// The resulting URL should not contain 'search'
			expect(callArg).not.toContain("search=");
		});

		it("also removes cursor and direction params when clearing search", () => {
			setSearch("bague");
			mockSearchParams.set("cursor", "abc123");
			mockSearchParams.set("direction", "next");
			render(<ClearSearchButton />);
			fireEvent.click(screen.getByRole("button"));
			const callArg = mockReplace.mock.calls[0]?.[0] as string;
			expect(callArg).not.toContain("cursor=");
			expect(callArg).not.toContain("direction=");
			// Cleanup
			mockSearchParams.delete("cursor");
			mockSearchParams.delete("direction");
		});

		it("preserves non-search params like color when clearing search", () => {
			setSearch("bague");
			mockSearchParams.set("color", "or");
			render(<ClearSearchButton />);
			fireEvent.click(screen.getByRole("button"));
			const callArg = mockReplace.mock.calls[0]?.[0] as string;
			expect(callArg).toContain("color=or");
			mockSearchParams.delete("color");
		});

		it("calls router.replace with scroll:false option", () => {
			setSearch("anneau");
			render(<ClearSearchButton />);
			fireEvent.click(screen.getByRole("button"));
			expect(mockReplace).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ scroll: false }),
			);
		});
	});

	describe("accessibility", () => {
		it("button is not disabled initially", () => {
			setSearch("pendentif");
			render(<ClearSearchButton />);
			expect(screen.getByRole("button")).not.toBeDisabled();
		});

		it("button has correct aria-busy=false initially", () => {
			setSearch("pendentif");
			render(<ClearSearchButton />);
			const button = screen.getByRole("button");
			expect(button.getAttribute("aria-busy")).toBe("false");
		});
	});
});
