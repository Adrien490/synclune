import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockHaptic } = vi.hoisted(() => ({
	mockHaptic: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

vi.mock("motion/react", () => {
	const { createElement, forwardRef } = require("react");

	const m = new Proxy(
		{},
		{
			get: (_target: object, tag: string) => {
				const Component = forwardRef(
					(
						{
							children,
							initial: _i,
							animate: _a,
							exit: _e,
							transition: _t,
							...props
						}: Record<string, unknown> & { children?: unknown },
						ref: unknown,
					) => createElement(tag, { ref, ...props }, children),
				);
				Component.displayName = `m.${tag}`;
				return Component;
			},
		},
	);

	return { m };
});

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		fill: _fill,
		sizes: _sizes,
		quality: _quality,
		placeholder: _placeholder,
		blurDataURL: _blurDataURL,
		className,
	}: {
		src: string;
		alt: string;
		fill?: boolean;
		sizes?: string;
		quality?: number;
		placeholder?: string;
		blurDataURL?: string;
		className?: string;
		// eslint-disable-next-line @next/next/no-img-element
	}) => <img data-testid="next-image" src={src} alt={alt} className={className} />,
}));

vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({ children }: { children: React.ReactNode }) => <div data-testid="empty">{children}</div>,
	EmptyHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="empty-header">{children}</div>
	),
	EmptyMedia: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="empty-media">{children}</div>
	),
	EmptyTitle: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="empty-title">{children}</div>
	),
	EmptyDescription: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="empty-description">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
		<div data-testid="skeleton" className={className} style={style} />
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		variant,
		size,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		variant?: string;
		size?: string;
	}) => (
		<button data-testid="retry-button" onClick={onClick} data-variant={variant} data-size={size}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	WarningCircleIcon: ({ className }: { className?: string }) => (
		<svg data-testid="alert-circle-icon" className={className} />
	),
	MagnifyingGlassIcon: ({ className }: { className?: string }) => (
		<svg data-testid="search-icon" className={className} />
	),
}));

vi.mock("./constants", () => ({
	AUTOCOMPLETE_ANIMATIONS: {
		item: {
			initial: { opacity: 0 },
			animate: { opacity: 1 },
			maxDelay: 0.3,
			delayMultiplier: 0.03,
		},
	},
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { AutocompleteListContent } from "../autocomplete-list-content";

// ============================================================================
// HELPERS
// ============================================================================

type TestItem = { id: string; name: string };

const defaultProps = {
	items: [] as TestItem[],
	activeIndex: -1,
	error: null,
	isLoading: false,
	hasResults: false,
	showResultsCount: false,
	showEmptyState: false,
	noResultsMessage: "Aucun résultat trouvé",
	noResultsDescription: "Essayez de modifier votre recherche",
	onRetry: undefined,
	getItemLabel: (item: TestItem) => item.name,
	getItemKey: (item: TestItem) => item.id,
	effectiveImageSize: 56,
	onItemSelect: vi.fn(),
	onItemHover: vi.fn(),
	getItemId: (index: number) => `item-${index}`,
	loadingSkeletonCount: 3,
	hapticOnRetry: "light" as const,
};

const mockItems: TestItem[] = [
	{ id: "1", name: "Bague en or" },
	{ id: "2", name: "Collier argent" },
	{ id: "3", name: "Bracelet doré" },
];

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	mockHaptic.mockClear();
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("AutocompleteListContent", () => {
	// ─── Null state ────────────────────────────────────────────────────────

	it("returns null when no state applies", () => {
		const { container } = render(<AutocompleteListContent {...defaultProps} />);

		expect(container.firstChild).toBeNull();
	});

	// ─── Error state ───────────────────────────────────────────────────────

	it("renders error message when error prop is set", () => {
		render(<AutocompleteListContent {...defaultProps} error="Erreur de connexion" />);

		expect(screen.getByTestId("empty-title")).toHaveTextContent("Erreur de connexion");
	});

	it("renders retry button when onRetry is provided with error", () => {
		const onRetry = vi.fn();
		render(<AutocompleteListContent {...defaultProps} error="Erreur réseau" onRetry={onRetry} />);

		expect(screen.getByTestId("retry-button")).toBeInTheDocument();
		expect(screen.getByText("Réessayer")).toBeInTheDocument();
	});

	it("does not render retry button when onRetry is not provided", () => {
		render(<AutocompleteListContent {...defaultProps} error="Erreur réseau" onRetry={undefined} />);

		expect(screen.queryByTestId("retry-button")).toBeNull();
	});

	// ─── Loading state ─────────────────────────────────────────────────────

	it("renders loading skeletons when isLoading=true", () => {
		render(<AutocompleteListContent {...defaultProps} isLoading={true} loadingSkeletonCount={3} />);

		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("renders the correct number of loading skeleton rows", () => {
		render(<AutocompleteListContent {...defaultProps} isLoading={true} loadingSkeletonCount={4} />);

		// Each skeleton row contains one text skeleton (and optionally image + description)
		// With no getItemImage/getItemDescription: each row has 1 skeleton (the text line h-4 w-3/4)
		const skeletons = screen.getAllByTestId("skeleton");
		// 4 rows × 1 skeleton (text only, no image, no description) = 4
		expect(skeletons.length).toBe(4);
	});

	// ─── Results state ─────────────────────────────────────────────────────

	it("renders items when hasResults=true", () => {
		render(<AutocompleteListContent {...defaultProps} items={mockItems} hasResults={true} />);

		expect(screen.getByText("Bague en or")).toBeInTheDocument();
		expect(screen.getByText("Collier argent")).toBeInTheDocument();
		expect(screen.getByText("Bracelet doré")).toBeInTheDocument();
	});

	it("items have role='option'", () => {
		render(<AutocompleteListContent {...defaultProps} items={mockItems} hasResults={true} />);

		const options = screen.getAllByRole("option");
		expect(options.length).toBe(3);
	});

	it("items have aria-selected='false' by default", () => {
		render(
			<AutocompleteListContent
				{...defaultProps}
				items={mockItems}
				hasResults={true}
				activeIndex={-1}
			/>,
		);

		const options = screen.getAllByRole("option");
		options.forEach((option) => {
			expect(option).toHaveAttribute("aria-selected", "false");
		});
	});

	it("active item has aria-selected='true'", () => {
		render(
			<AutocompleteListContent
				{...defaultProps}
				items={mockItems}
				hasResults={true}
				activeIndex={1}
			/>,
		);

		const options = screen.getAllByRole("option");
		expect(options[0]).toHaveAttribute("aria-selected", "false");
		expect(options[1]).toHaveAttribute("aria-selected", "true");
		expect(options[2]).toHaveAttribute("aria-selected", "false");
	});

	// ─── Empty state ───────────────────────────────────────────────────────

	it("renders empty state when showEmptyState=true", () => {
		render(
			<AutocompleteListContent
				{...defaultProps}
				showEmptyState={true}
				noResultsMessage="Aucun bijou trouvé"
			/>,
		);

		expect(screen.getByTestId("empty-title")).toHaveTextContent("Aucun bijou trouvé");
	});

	it("renders search icon in empty state", () => {
		render(<AutocompleteListContent {...defaultProps} showEmptyState={true} />);

		expect(screen.getByTestId("search-icon")).toBeInTheDocument();
	});

	it("renders noResultsDescription text in empty state", () => {
		render(
			<AutocompleteListContent
				{...defaultProps}
				showEmptyState={true}
				noResultsDescription="Essayez avec un autre nom de rue"
			/>,
		);

		expect(screen.getByTestId("empty-description")).toHaveTextContent(
			"Essayez avec un autre nom de rue",
		);
	});

	it("renders emptyStateAction slot when provided", () => {
		render(
			<AutocompleteListContent
				{...defaultProps}
				showEmptyState={true}
				emptyStateAction={<button data-testid="custom-cta">Saisir manuellement</button>}
			/>,
		);

		expect(screen.getByTestId("custom-cta")).toBeInTheDocument();
		expect(screen.getByText("Saisir manuellement")).toBeInTheDocument();
	});

	it("does not render emptyStateAction when not provided", () => {
		render(<AutocompleteListContent {...defaultProps} showEmptyState={true} />);

		expect(screen.queryByTestId("custom-cta")).toBeNull();
	});

	// ─── Error takes priority ──────────────────────────────────────────────

	it("renders error state instead of loading when both error and isLoading are set", () => {
		render(
			<AutocompleteListContent
				{...defaultProps}
				error="Une erreur s'est produite"
				isLoading={true}
			/>,
		);

		expect(screen.getByTestId("alert-circle-icon")).toBeInTheDocument();
		expect(screen.queryByTestId("skeleton")).toBeNull();
	});

	// ─── Touch ergonomics (WCAG 2.5.5) ─────────────────────────────────────

	it("items expose min-h-11 and touch-manipulation for mobile tap targets", () => {
		render(<AutocompleteListContent {...defaultProps} items={mockItems} hasResults={true} />);

		const options = screen.getAllByRole("option");
		options.forEach((option) => {
			expect(option.className).toContain("min-h-11");
			expect(option.className).toContain("touch-manipulation");
		});
	});

	it("skeleton rows expose min-h-11 on mobile", () => {
		render(<AutocompleteListContent {...defaultProps} isLoading={true} loadingSkeletonCount={2} />);
		const items = document.querySelectorAll("li");
		items.forEach((li) => {
			expect(li.className).toContain("min-h-11");
		});
	});

	it("retry button triggers 'light' haptic before onRetry", () => {
		const onRetry = vi.fn();
		render(<AutocompleteListContent {...defaultProps} error="Erreur" onRetry={onRetry} />);
		fireEvent.click(screen.getByTestId("retry-button"));
		expect(mockHaptic).toHaveBeenCalledWith("light");
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("retry button does NOT trigger haptic when hapticOnRetry=false", () => {
		const onRetry = vi.fn();
		render(
			<AutocompleteListContent
				{...defaultProps}
				error="Erreur"
				onRetry={onRetry}
				hapticOnRetry={false}
			/>,
		);
		fireEvent.click(screen.getByTestId("retry-button"));
		expect(mockHaptic).not.toHaveBeenCalled();
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("onItemHover is NOT called for touch pointer enter", () => {
		const onItemHover = vi.fn();
		render(
			<AutocompleteListContent
				{...defaultProps}
				items={mockItems}
				hasResults={true}
				onItemHover={onItemHover}
			/>,
		);
		const option = screen.getAllByRole("option")[0]!;
		fireEvent.pointerEnter(option, { pointerType: "touch" });
		expect(onItemHover).not.toHaveBeenCalled();
	});

	it("onItemHover IS called for non-touch pointer enter", () => {
		const onItemHover = vi.fn();
		render(
			<AutocompleteListContent
				{...defaultProps}
				items={mockItems}
				hasResults={true}
				onItemHover={onItemHover}
			/>,
		);
		const option = screen.getAllByRole("option")[1]!;
		// jsdom-dispatched pointer events without explicit pointerType default to ""
		// which our guard treats as non-touch (desktop/mouse path)
		fireEvent.pointerEnter(option);
		expect(onItemHover).toHaveBeenCalledWith(1);
	});
});
