import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

const mockHaptic = vi.fn();

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({
		children,
		open,
		direction,
		modal,
		dismissible,
		repositionInputs,
		onOpenChange,
	}: {
		children?: React.ReactNode;
		open?: boolean;
		direction?: string;
		modal?: boolean;
		dismissible?: boolean;
		repositionInputs?: boolean;
		onOpenChange?: (next: boolean) => void;
	}) =>
		open ? (
			<div
				data-testid="drawer"
				data-direction={direction}
				data-modal={String(modal)}
				data-dismissible={String(dismissible)}
				data-reposition-inputs={String(repositionInputs)}
			>
				<button
					type="button"
					data-testid="drawer-close-trigger"
					onClick={() => onOpenChange?.(false)}
				>
					close
				</button>
				{children}
			</div>
		) : null,
	DrawerContent: ({
		children,
		className,
		onCloseAutoFocus,
		id,
		"aria-modal": ariaModal,
		"data-testid": testId,
	}: {
		children?: React.ReactNode;
		className?: string;
		onCloseAutoFocus?: (e: { preventDefault: () => void }) => void;
		id?: string;
		"aria-modal"?: boolean;
		"data-testid"?: string;
	}) => (
		<div
			data-testid={testId ?? "drawer-content"}
			data-id={id}
			data-aria-modal={ariaModal === undefined ? undefined : String(ariaModal)}
			data-on-close-auto-focus={onCloseAutoFocus ? "true" : "false"}
			className={className}
		>
			{children}
		</div>
	),
	DrawerTitle: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
		<h2 data-testid="drawer-title" className={className}>
			{children}
		</h2>
	),
	DrawerClose: ({
		children,
		asChild: _asChild,
	}: {
		children?: React.ReactNode;
		asChild?: boolean;
	}) => <>{children}</>,
	DrawerHandle: ({
		className,
		"aria-label": ariaLabel,
	}: {
		className?: string;
		"aria-label"?: string;
	}) => (
		<div data-testid="drawer-handle" className={className} aria-label={ariaLabel} role="button" />
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		"aria-label": ariaLabel,
		"aria-keyshortcuts": ariaKeyshortcuts,
		className,
		type,
	}: {
		children?: React.ReactNode;
		onClick?: () => void;
		"aria-label"?: string;
		"aria-keyshortcuts"?: string;
		className?: string;
		type?: "button" | "submit";
	}) => (
		<button
			type={type}
			onClick={onClick}
			aria-label={ariaLabel}
			aria-keyshortcuts={ariaKeyshortcuts}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/search-input", () => ({
	SearchInput: ({
		paramName,
		mode,
		size,
		autoFocus,
		preventMobileBlur,
		debounceMs,
		placeholder,
		ariaLabel,
		onEscape,
	}: {
		paramName?: string;
		mode?: string;
		size?: string;
		autoFocus?: boolean;
		preventMobileBlur?: boolean;
		debounceMs?: number;
		placeholder?: string;
		ariaLabel?: string;
		onEscape?: () => void;
	}) => (
		<input
			data-testid="search-input"
			data-param={paramName}
			data-mode={mode}
			data-size={size}
			data-autofocus={String(autoFocus)}
			data-prevent-mobile-blur={String(preventMobileBlur)}
			data-debounce={String(debounceMs)}
			placeholder={placeholder}
			aria-label={ariaLabel}
			onKeyDown={(e) => {
				if (e.key === "Escape") onEscape?.();
			}}
		/>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	X: ({ className }: { className?: string }) => (
		<svg data-testid="x-icon" className={className} aria-hidden="true" />
	),
}));

// Import AFTER mocks
import { AdminSearchDrawerTop } from "../admin-search-drawer-top";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("AdminSearchDrawerTop", () => {
	it("does not render when closed", () => {
		render(<AdminSearchDrawerTop open={false} onOpenChange={vi.fn()} />);

		expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
	});

	it("renders drawer with direction=top, modal=false, dismissible, repositionInputs when open", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		const drawer = screen.getByTestId("drawer");
		expect(drawer).toBeInTheDocument();
		expect(drawer).toHaveAttribute("data-direction", "top");
		expect(drawer).toHaveAttribute("data-modal", "false");
		expect(drawer).toHaveAttribute("data-dismissible", "true");
		expect(drawer).toHaveAttribute("data-reposition-inputs", "true");
	});

	it("renders sr-only DrawerTitle 'Rechercher' by default", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		const title = screen.getByTestId("drawer-title");
		expect(title).toHaveTextContent("Rechercher");
		expect(title.className).toContain("sr-only");
	});

	it("passes autoFocus=true to SearchInput by default", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		const input = screen.getByTestId("search-input");
		expect(input).toHaveAttribute("data-param", "search");
		expect(input).toHaveAttribute("data-mode", "live");
		expect(input).toHaveAttribute("data-size", "sm");
		expect(input).toHaveAttribute("data-autofocus", "true");
		expect(input).toHaveAttribute("data-prevent-mobile-blur", "true");
		expect(input).toHaveAttribute("data-debounce", "300");
	});

	it("respects explicit autoFocus={false} prop", () => {
		render(
			// eslint-disable-next-line jsx-a11y/no-autofocus
			<AdminSearchDrawerTop open onOpenChange={vi.fn()} autoFocus={false} />,
		);

		expect(screen.getByTestId("search-input")).toHaveAttribute("data-autofocus", "false");
	});

	it("uses custom paramName, placeholder and ariaLabel", () => {
		render(
			<AdminSearchDrawerTop
				open
				onOpenChange={vi.fn()}
				paramName="q"
				placeholder="Trouver un produit"
				ariaLabel="Rechercher un produit par titre"
			/>,
		);

		const input = screen.getByTestId("search-input");
		expect(input).toHaveAttribute("data-param", "q");
		expect(input).toHaveAttribute("placeholder", "Trouver un produit");
		expect(input).toHaveAttribute("aria-label", "Rechercher un produit par titre");
	});

	it("falls back ariaLabel to placeholder when not provided", () => {
		render(
			<AdminSearchDrawerTop open onOpenChange={vi.fn()} placeholder="Rechercher un produit…" />,
		);

		expect(screen.getByTestId("search-input")).toHaveAttribute(
			"aria-label",
			"Rechercher un produit…",
		);
	});

	it("renders close button with aria-label and aria-keyshortcuts", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		const closeBtn = screen.getByRole("button", { name: "Fermer la recherche (Échap)" });
		expect(closeBtn).toBeInTheDocument();
		expect(closeBtn).toHaveAttribute("aria-keyshortcuts", "Escape");
	});

	it("applies active:scale + touch-manipulation classes on close button", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		const closeBtn = screen.getByRole("button", { name: "Fermer la recherche (Échap)" });
		expect(closeBtn.className).toContain("motion-safe:active:scale-[0.98]");
		expect(closeBtn.className).toContain("touch-manipulation");
	});

	it("calls onEscape -> onOpenChange(false) when SearchInput receives Escape", () => {
		const onOpenChange = vi.fn();
		render(<AdminSearchDrawerTop open onOpenChange={onOpenChange} />);

		fireEvent.keyDown(screen.getByTestId("search-input"), { key: "Escape" });

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("triggers haptic 'selection' on close", () => {
		const onOpenChange = vi.fn();
		render(<AdminSearchDrawerTop open onOpenChange={onOpenChange} />);

		fireEvent.click(screen.getByTestId("drawer-close-trigger"));

		expect(mockHaptic).toHaveBeenCalledWith("selection");
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("does not trigger haptic when opening (delegated to StickyActionBar)", () => {
		// Re-render simulating open: useEffect runs but no haptic on open path
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		expect(mockHaptic).not.toHaveBeenCalled();
	});

	it("wires onCloseAutoFocus on DrawerContent for focus restore", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("admin-search-drawer-top")).toHaveAttribute(
			"data-on-close-auto-focus",
			"true",
		);
	});

	it("hides drawer content on desktop via md:hidden class", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("admin-search-drawer-top").className).toContain("md:hidden");
	});

	it("applies overscroll-contain class", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("admin-search-drawer-top").className).toContain("overscroll-contain");
	});

	it("explicitly sets aria-modal=false on content", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("admin-search-drawer-top")).toHaveAttribute(
			"data-aria-modal",
			"false",
		);
	});

	it("renders DrawerHandle as visible affordance for swipe-up close", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		const handle = screen.getByTestId("drawer-handle");
		expect(handle).toBeInTheDocument();
		expect(handle).toHaveAttribute("aria-label", "Glisser vers le haut pour fermer");
		expect(handle.className).toContain("!block");
	});

	it("exposes id on DrawerContent for aria-controls wiring", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} id="admin-orders-search-drawer" />);

		expect(screen.getByTestId("admin-search-drawer-top")).toHaveAttribute(
			"data-id",
			"admin-orders-search-drawer",
		);
	});

	it("renders visible title above input + uses it as DrawerTitle text", () => {
		const { container } = render(
			<AdminSearchDrawerTop open onOpenChange={vi.fn()} title="Filtrer les commandes" />,
		);

		expect(screen.getByTestId("drawer-title")).toHaveTextContent("Filtrer les commandes");

		// Visible paragraph rendered above the input (separate from sr-only DrawerTitle)
		const paragraph = container.querySelector("p");
		expect(paragraph).not.toBeNull();
		expect(paragraph).toHaveTextContent("Filtrer les commandes");
		expect(paragraph).toHaveAttribute("aria-hidden", "true");
	});

	it("does not render visible title paragraph when title is omitted", () => {
		const { container } = render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		const paragraphs = container.querySelectorAll("p");
		expect(paragraphs.length).toBe(0);
	});

	it("renders resultCount chip when provided", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} resultCount={12} />);

		const chip = screen.getByTestId("admin-search-drawer-top-count");
		expect(chip).toHaveTextContent("12");
		expect(chip).toHaveAttribute("aria-live", "polite");
	});

	it("renders resultCount chip with '0' when count is zero", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} resultCount={0} />);

		expect(screen.getByTestId("admin-search-drawer-top-count")).toHaveTextContent("0");
	});

	it("caps resultCount chip at '99+' when count exceeds 99", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} resultCount={250} />);

		expect(screen.getByTestId("admin-search-drawer-top-count")).toHaveTextContent("99+");
	});

	it("does not render resultCount chip when prop is undefined", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		expect(screen.queryByTestId("admin-search-drawer-top-count")).not.toBeInTheDocument();
	});

	it("exposes data-testid='admin-search-drawer-top' on DrawerContent", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("admin-search-drawer-top")).toBeInTheDocument();
	});
});
