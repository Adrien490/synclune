import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("lucide-react", () => ({
	Search: (props: Record<string, unknown>) => <svg data-testid="icon-search" {...props} />,
	X: (props: Record<string, unknown>) => <svg data-testid="icon-x" {...props} />,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
		className,
	}: {
		children: React.ReactNode;
		variant?: string;
		className?: string;
	}) => (
		<span data-testid="badge" data-variant={variant} className={className}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: ({
		value,
		onChange,
		placeholder,
		className,
		type,
	}: {
		value: string;
		onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
		placeholder?: string;
		className?: string;
		type?: string;
	}) => (
		<input
			data-testid="search-input"
			type={type}
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			className={className}
		/>
	),
}));

import { SectionHeader, SectionSearch } from "../products-filter-sheet-ui";

afterEach(cleanup);

// ============================================================================
// TESTS - SectionHeader
// ============================================================================

describe("SectionHeader", () => {
	describe("rendering", () => {
		it("renders label", () => {
			render(<SectionHeader label="Statut" />);
			expect(screen.getByText("Statut")).toBeInTheDocument();
		});

		it("does not show badge when count is 0", () => {
			render(<SectionHeader label="Statut" count={0} />);
			expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
		});

		it("does not show badge when count is undefined", () => {
			render(<SectionHeader label="Statut" />);
			expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
		});

		it("shows badge with count when count > 0", () => {
			render(<SectionHeader label="Statut" count={3} />);
			expect(screen.getByTestId("badge")).toHaveTextContent("3");
		});

		it("shows badgeContent instead of count when provided", () => {
			render(<SectionHeader label="Prix" count={1} badgeContent="10€ - 50€" />);
			expect(screen.getByTestId("badge")).toHaveTextContent("10€ - 50€");
		});
	});

	describe("reset button", () => {
		it("does not show reset when no onReset", () => {
			render(<SectionHeader label="Statut" count={2} />);
			expect(screen.queryByRole("button")).not.toBeInTheDocument();
		});

		it("does not show reset when count is 0", () => {
			const onReset = vi.fn();
			render(<SectionHeader label="Statut" count={0} onReset={onReset} />);
			expect(screen.queryByRole("button")).not.toBeInTheDocument();
		});

		it("shows reset button when count > 0 and onReset provided", () => {
			const onReset = vi.fn();
			render(<SectionHeader label="Statut" count={2} onReset={onReset} />);
			expect(screen.getByRole("button")).toBeInTheDocument();
		});

		it("calls onReset when clicked", () => {
			const onReset = vi.fn();
			render(<SectionHeader label="Statut" count={2} onReset={onReset} />);
			fireEvent.click(screen.getByRole("button"));
			expect(onReset).toHaveBeenCalledTimes(1);
		});

		it("stops propagation on click", () => {
			const onReset = vi.fn();
			const onParentClick = vi.fn();
			render(
				// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
				<div onClick={onParentClick}>
					<SectionHeader label="Statut" count={2} onReset={onReset} />
				</div>,
			);
			fireEvent.click(screen.getByRole("button"));
			expect(onReset).toHaveBeenCalled();
			expect(onParentClick).not.toHaveBeenCalled();
		});

		it("has correct aria-label", () => {
			const onReset = vi.fn();
			render(<SectionHeader label="Statut" count={1} onReset={onReset} />);
			expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Effacer le filtre Statut");
		});
	});
});

// ============================================================================
// TESTS - SectionSearch
// ============================================================================

describe("SectionSearch", () => {
	it("renders input with placeholder", () => {
		render(<SectionSearch value="" onChange={vi.fn()} placeholder="Rechercher..." />);
		expect(screen.getByTestId("search-input")).toHaveAttribute("placeholder", "Rechercher...");
	});

	it("uses default placeholder when not specified", () => {
		render(<SectionSearch value="" onChange={vi.fn()} />);
		expect(screen.getByTestId("search-input")).toHaveAttribute("placeholder", "Rechercher...");
	});

	it("displays current value", () => {
		render(<SectionSearch value="test" onChange={vi.fn()} />);
		expect(screen.getByTestId("search-input")).toHaveValue("test");
	});

	it("calls onChange with new value", () => {
		const onChange = vi.fn();
		render(<SectionSearch value="" onChange={onChange} />);
		fireEvent.change(screen.getByTestId("search-input"), { target: { value: "foo" } });
		expect(onChange).toHaveBeenCalledWith("foo");
	});

	it("renders search icon", () => {
		render(<SectionSearch value="" onChange={vi.fn()} />);
		expect(screen.getByTestId("icon-search")).toBeInTheDocument();
	});
});
