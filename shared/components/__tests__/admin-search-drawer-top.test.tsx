import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({
		children,
		open,
		direction,
		modal,
		dismissible,
	}: {
		children?: React.ReactNode;
		open?: boolean;
		direction?: string;
		modal?: boolean;
		dismissible?: boolean;
	}) =>
		open ? (
			<div
				data-testid="drawer"
				data-direction={direction}
				data-modal={String(modal)}
				data-dismissible={String(dismissible)}
			>
				{children}
			</div>
		) : null,
	DrawerContent: ({
		children,
		className,
		onCloseAutoFocus,
	}: {
		children?: React.ReactNode;
		className?: string;
		onCloseAutoFocus?: (e: { preventDefault: () => void }) => void;
	}) => (
		<div
			data-testid="drawer-content"
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
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		"aria-label": ariaLabel,
		className,
		type,
	}: {
		children?: React.ReactNode;
		onClick?: () => void;
		"aria-label"?: string;
		className?: string;
		type?: "button" | "submit";
	}) => (
		<button type={type} onClick={onClick} aria-label={ariaLabel} className={className}>
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

	it("renders drawer with direction=top, modal=false, dismissible when open", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		const drawer = screen.getByTestId("drawer");
		expect(drawer).toBeInTheDocument();
		expect(drawer).toHaveAttribute("data-direction", "top");
		expect(drawer).toHaveAttribute("data-modal", "false");
		expect(drawer).toHaveAttribute("data-dismissible", "true");
	});

	it("renders sr-only title 'Rechercher' for a11y", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		const title = screen.getByTestId("drawer-title");
		expect(title).toHaveTextContent("Rechercher");
		expect(title.className).toContain("sr-only");
	});

	it("renders SearchInput with mode=live, autoFocus, preventMobileBlur, debounce 300", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		const input = screen.getByTestId("search-input");
		expect(input).toHaveAttribute("data-param", "search");
		expect(input).toHaveAttribute("data-mode", "live");
		expect(input).toHaveAttribute("data-size", "sm");
		expect(input).toHaveAttribute("data-autofocus", "true");
		expect(input).toHaveAttribute("data-prevent-mobile-blur", "true");
		expect(input).toHaveAttribute("data-debounce", "300");
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

	it("renders close button with aria-label 'Fermer la recherche'", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		expect(screen.getByRole("button", { name: "Fermer la recherche" })).toBeInTheDocument();
	});

	it("calls onEscape -> onOpenChange(false) when SearchInput receives Escape", () => {
		const onOpenChange = vi.fn();
		render(<AdminSearchDrawerTop open onOpenChange={onOpenChange} />);

		fireEvent.keyDown(screen.getByTestId("search-input"), { key: "Escape" });

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("wires onCloseAutoFocus on DrawerContent for focus restore", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("drawer-content")).toHaveAttribute(
			"data-on-close-auto-focus",
			"true",
		);
	});

	it("hides drawer content on desktop via md:hidden class", () => {
		render(<AdminSearchDrawerTop open onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("drawer-content").className).toContain("md:hidden");
	});
});
