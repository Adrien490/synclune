import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		variant,
		size,
		onClick,
		disabled,
	}: {
		children: React.ReactNode;
		variant?: string;
		size?: string;
		onClick?: () => void;
		disabled?: boolean;
	}) => (
		<button data-variant={variant} data-size={size} onClick={onClick} disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/dialog", () => ({
	Dialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (
		<div data-testid="dialog" data-open={open}>
			{children}
		</div>
	),
	DialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-content">{children}</div>
	),
	DialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="dialog-description">{children}</p>
	),
	DialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-footer">{children}</div>
	),
	DialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-header">{children}</div>
	),
	DialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="dialog-title">{children}</h2>
	),
	DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
		if (asChild) return <>{children}</>;
		return <div data-testid="dialog-trigger">{children}</div>;
	},
}));

vi.mock("@/shared/components/ui/select", () => ({
	Select: ({
		children,
	}: {
		children: React.ReactNode;
		value?: string;
		onValueChange?: (v: string) => void;
	}) => <div data-testid="select">{children}</div>,
	SelectContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="select-content">{children}</div>
	),
	SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<div data-testid={`select-item-${value}`}>{children}</div>
	),
	SelectTrigger: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="select-trigger">{children}</div>
	),
	SelectValue: () => <span data-testid="select-value" />,
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
		<input data-testid="input" {...props} />
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("lucide-react", () => ({
	Download: () => <svg data-testid="icon-download" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

import { ExportOrdersButton } from "../export-orders-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ExportOrdersButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without crashing", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("dialog")).toBeInTheDocument();
	});

	it("renders the trigger button with 'Exporter' text", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByText("Exporter")).toBeInTheDocument();
	});

	it("renders download icons (trigger + footer)", () => {
		render(<ExportOrdersButton />);
		const icons = screen.getAllByTestId("icon-download");
		expect(icons.length).toBeGreaterThanOrEqual(1);
	});

	it("renders dialog title 'Exporter le livre de recettes'", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("dialog-title")).toHaveTextContent("Exporter le livre de recettes");
	});

	it("renders dialog description with legal reference", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("dialog-description")).toHaveTextContent("Article 286 CGI");
	});

	it("renders period select", () => {
		render(<ExportOrdersButton />);
		const selects = screen.getAllByTestId("select");
		expect(selects.length).toBeGreaterThan(0);
	});

	it("renders 'Toutes les commandes' period option", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("select-item-all")).toHaveTextContent("Toutes les commandes");
	});

	it("renders 'Par année' period option", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("select-item-year")).toHaveTextContent("Par année");
	});

	it("renders 'Par mois' period option", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("select-item-month")).toHaveTextContent("Par mois");
	});

	it("renders 'Période personnalisée' period option", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("select-item-custom")).toHaveTextContent("Période personnalisée");
	});

	it("renders 'Télécharger CSV' button in footer", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByText("Télécharger CSV")).toBeInTheDocument();
	});

	it("renders 'Annuler' button in footer", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByText("Annuler")).toBeInTheDocument();
	});

	it("dialog starts closed", () => {
		render(<ExportOrdersButton />);
		expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "false");
	});
});
