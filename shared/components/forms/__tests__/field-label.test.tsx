import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ htmlFor, className, children, ...props }: any) => (
		<label htmlFor={htmlFor} className={className} {...props}>
			{children}
		</label>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, "aria-label": ariaLabel, type, ...props }: any) => (
		<button type={type} aria-label={ariaLabel} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	TooltipProvider: ({ children }: any) => <>{children}</>,
	Tooltip: ({ children }: any) => <>{children}</>,
	TooltipTrigger: ({ children, asChild: _asChild }: any) => <>{children}</>,
	TooltipContent: ({ children }: any) => <div role="tooltip">{children}</div>,
}));

vi.mock("lucide-react", () => ({
	CircleHelp: () => <svg data-testid="help-icon" />,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { FieldLabel } from "../field-label";

// ============================================================================
// TESTS
// ============================================================================

describe("FieldLabel", () => {
	afterEach(cleanup);

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders label with children text", () => {
		render(<FieldLabel>Nom du produit</FieldLabel>);
		expect(screen.getByText("Nom du produit")).toBeInTheDocument();
	});

	it("renders label element with correct htmlFor attribute", () => {
		render(<FieldLabel htmlFor="product-name">Nom</FieldLabel>);
		const label = screen.getByText("Nom").closest("label");
		expect(label).toHaveAttribute("for", "product-name");
	});

	// ============================================================================
	// REQUIRED INDICATOR
	// ============================================================================

	it("renders required asterisk when required is true", () => {
		render(<FieldLabel required>Champ requis</FieldLabel>);
		expect(screen.getByText("*")).toBeInTheDocument();
	});

	it("required asterisk has aria-hidden='true'", () => {
		render(<FieldLabel required>Champ requis</FieldLabel>);
		const asterisk = screen.getByText("*");
		expect(asterisk).toHaveAttribute("aria-hidden", "true");
	});

	it("does not render asterisk when required is false", () => {
		render(<FieldLabel>Champ optionnel</FieldLabel>);
		expect(screen.queryByText("*")).toBeNull();
	});

	// ============================================================================
	// OPTIONAL INDICATOR
	// ============================================================================

	it("renders '(Optionnel)' when optional is true", () => {
		render(<FieldLabel optional>Description</FieldLabel>);
		expect(screen.getByText("(Optionnel)")).toBeInTheDocument();
	});

	it("does not render '(Optionnel)' when required is true even if optional is also true", () => {
		render(
			<FieldLabel required optional>
				Champ
			</FieldLabel>,
		);
		expect(screen.queryByText("(Optionnel)")).toBeNull();
		expect(screen.getByText("*")).toBeInTheDocument();
	});

	it("does not render '(Optionnel)' by default", () => {
		render(<FieldLabel>Champ</FieldLabel>);
		expect(screen.queryByText("(Optionnel)")).toBeNull();
	});

	// ============================================================================
	// TOOLTIP
	// ============================================================================

	it("renders tooltip trigger button with aria-label when tooltip is provided", () => {
		render(<FieldLabel tooltip="Aide contextuelle">Champ</FieldLabel>);
		const button = screen.getByRole("button", { name: "Plus d'informations" });
		expect(button).toBeInTheDocument();
	});

	it("renders help icon when tooltip is provided", () => {
		render(<FieldLabel tooltip="Aide contextuelle">Champ</FieldLabel>);
		expect(screen.getByTestId("help-icon")).toBeInTheDocument();
	});

	it("does not render tooltip button when no tooltip is provided", () => {
		render(<FieldLabel>Champ</FieldLabel>);
		expect(screen.queryByRole("button")).toBeNull();
	});
});
