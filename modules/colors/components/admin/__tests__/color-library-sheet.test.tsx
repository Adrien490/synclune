import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockHaptic, mockUseIsMobile } = vi.hoisted(() => ({
	mockHaptic: vi.fn(),
	mockUseIsMobile: vi.fn(() => false),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
	__resetHapticCooldown: () => undefined,
}));

vi.mock("@/shared/hooks/use-mobile", () => ({ useIsMobile: mockUseIsMobile }));

// Replace ResponsiveDialog with a plain visible wrapper so the content always
// renders, simplifying interaction tests.
vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-dialog-content">{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import { ColorLibrarySheet } from "../color-library-sheet";
import { COLOR_LIBRARY } from "../../../constants/color-library";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("ColorLibrarySheet", () => {
	it("renders the trigger button with the expected label", () => {
		render(<ColorLibrarySheet onSelect={vi.fn()} />);
		expect(
			screen.getByRole("button", { name: /Choisir depuis le catalogue/i }),
		).toBeInTheDocument();
	});

	it("renders all library entries by default (category 'all')", () => {
		render(<ColorLibrarySheet onSelect={vi.fn()} />);
		const tiles = screen.getAllByRole("button", { name: /^Utiliser / });
		expect(tiles).toHaveLength(COLOR_LIBRARY.length);
	});

	it("filters by category when a category button is clicked", () => {
		render(<ColorLibrarySheet onSelect={vi.fn()} />);
		const metauxButton = screen.getByRole("button", { name: "Métaux" });
		expect(metauxButton).toHaveAttribute("aria-pressed", "false");
		fireEvent.click(metauxButton);
		expect(metauxButton).toHaveAttribute("aria-pressed", "true");
		const tiles = screen.getAllByRole("button", { name: /^Utiliser / });
		const metauxCount = COLOR_LIBRARY.filter((e) => e.category === "metaux").length;
		expect(tiles).toHaveLength(metauxCount);
	});

	it("announces the result count via an sr-only status region", () => {
		render(<ColorLibrarySheet onSelect={vi.fn()} />);
		expect(screen.getByRole("status")).toHaveTextContent(
			`${COLOR_LIBRARY.length} couleurs trouvées.`,
		);
		const input = screen.getByPlaceholderText(/Rechercher/i);
		fireEvent.change(input, { target: { value: "xyzzz-nothing" } });
		expect(screen.getByRole("status")).toHaveTextContent("Aucune couleur trouvée.");
	});

	it("filters by search query (name)", () => {
		render(<ColorLibrarySheet onSelect={vi.fn()} />);
		const input = screen.getByPlaceholderText(/Rechercher/i);
		fireEvent.change(input, { target: { value: "or rose" } });
		const tiles = screen.getAllByRole("button", { name: /^Utiliser / });
		expect(tiles.some((t) => /Or rose/.test(t.getAttribute("aria-label") ?? ""))).toBe(true);
	});

	it("filters by search query (description)", () => {
		render(<ColorLibrarySheet onSelect={vi.fn()} />);
		const input = screen.getByPlaceholderText(/Rechercher/i);
		fireEvent.change(input, { target: { value: "hypoallergénique" } });
		const tiles = screen.getAllByRole("button", { name: /^Utiliser / });
		// "Acier inox" has the hypoallergénique description
		expect(tiles.some((t) => /Acier inox/.test(t.getAttribute("aria-label") ?? ""))).toBe(true);
	});

	it("shows empty state when no entries match", () => {
		render(<ColorLibrarySheet onSelect={vi.fn()} />);
		const input = screen.getByPlaceholderText(/Rechercher/i);
		fireEvent.change(input, { target: { value: "xyzzz-nothing" } });
		expect(screen.getByText(/Aucune couleur ne correspond/i)).toBeInTheDocument();
	});

	it("clicking a tile invokes onSelect with the entry payload and triggers haptic", () => {
		const onSelect = vi.fn();
		render(<ColorLibrarySheet onSelect={onSelect} />);
		const orJaune = screen.getByRole("button", { name: /^Utiliser Or jaune 18K/ });
		fireEvent.click(orJaune);
		expect(mockHaptic).toHaveBeenCalledWith("selection");
		expect(onSelect).toHaveBeenCalledWith({
			name: "Or jaune 18K",
			hex: "#D4AF37",
			description: "Or 18 carats, fini brillant classique",
		});
	});

	it("disables the trigger button when `disabled` prop is true", () => {
		render(<ColorLibrarySheet onSelect={vi.fn()} disabled />);
		const trigger = screen.getByRole("button", { name: /Choisir depuis le catalogue/i });
		expect(trigger).toBeDisabled();
	});
});
