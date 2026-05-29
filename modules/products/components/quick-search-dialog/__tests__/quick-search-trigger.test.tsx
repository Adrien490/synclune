import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module mocks ────────────────────────────────────────────────────────────

const mockOpen = vi.hoisted(() => vi.fn());
const mockIsOpen = vi.hoisted(() => ({ value: false }));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: vi.fn(() => ({
		open: mockOpen,
		isOpen: mockIsOpen.value,
	})),
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { QuickSearchTrigger } from "../quick-search-trigger";
import { useDialog } from "@/shared/providers/dialog-store-provider";

afterEach(() => {
	cleanup();
	vi.resetAllMocks();
	mockIsOpen.value = false;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("QuickSearchTrigger", () => {
	beforeEach(() => {
		vi.mocked(useDialog).mockReturnValue({
			open: mockOpen,
			isOpen: false,
			close: vi.fn(),
			toggle: vi.fn(),
			data: undefined,
			clearData: vi.fn(),
		});
	});

	it("renders a button", () => {
		render(<QuickSearchTrigger />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("has correct aria-label", () => {
		render(<QuickSearchTrigger />);
		expect(screen.getByRole("button", { name: "Ouvrir la recherche rapide" })).toBeInTheDocument();
	});

	it("has aria-haspopup='dialog'", () => {
		render(<QuickSearchTrigger />);
		expect(screen.getByRole("button")).toHaveAttribute("aria-haspopup", "dialog");
	});

	it("has aria-expanded='false' when dialog is closed", () => {
		render(<QuickSearchTrigger />);
		expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
	});

	it("has aria-expanded='true' when dialog is open", () => {
		vi.mocked(useDialog).mockReturnValue({
			open: mockOpen,
			isOpen: true,
			close: vi.fn(),
			toggle: vi.fn(),
			data: undefined,
			clearData: vi.fn(),
		});
		render(<QuickSearchTrigger />);
		expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
	});

	it("calls open() when clicked", async () => {
		render(<QuickSearchTrigger />);
		await userEvent.click(screen.getByRole("button"));
		expect(mockOpen).toHaveBeenCalledOnce();
	});

	it("renders a Search icon inside the button", () => {
		const { container } = render(<QuickSearchTrigger />);
		expect(container.querySelector("svg")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		render(<QuickSearchTrigger className="my-custom-class" />);
		expect(screen.getByRole("button")).toHaveClass("my-custom-class");
	});

	it("uses QUICK_SEARCH_DIALOG_ID to call useDialog", () => {
		render(<QuickSearchTrigger />);
		expect(vi.mocked(useDialog)).toHaveBeenCalledWith("quick-search");
	});

	describe("bar variant (F5)", () => {
		it("renders a button with the same accessible name and dialog semantics", () => {
			render(<QuickSearchTrigger variant="bar" />);
			const button = screen.getByRole("button", { name: "Ouvrir la recherche rapide" });
			expect(button).toHaveAttribute("aria-haspopup", "dialog");
			expect(button).toHaveAttribute("aria-expanded", "false");
		});

		it("surfaces the 'Rechercher' label and a keyboard shortcut hint", () => {
			const { container } = render(<QuickSearchTrigger variant="bar" />);
			expect(screen.getByText("Rechercher")).toBeInTheDocument();
			expect(container.querySelector("kbd")).toBeInTheDocument();
		});

		it("opens the dialog when clicked", async () => {
			render(<QuickSearchTrigger variant="bar" />);
			await userEvent.click(screen.getByRole("button"));
			expect(mockOpen).toHaveBeenCalledOnce();
		});

		it("applies custom className", () => {
			render(<QuickSearchTrigger variant="bar" className="my-bar-class" />);
			expect(screen.getByRole("button")).toHaveClass("my-bar-class");
		});
	});
});
