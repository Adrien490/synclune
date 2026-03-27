import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/generated/prisma/enums", () => ({
	RefundReason: {
		CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
		DEFECTIVE: "DEFECTIVE",
		WRONG_ITEM: "WRONG_ITEM",
	},
}));

vi.mock("@/modules/refunds/actions/request-return", () => ({
	requestReturn: vi.fn(),
}));

vi.mock("@/modules/refunds/constants/refund.constants", () => ({
	REFUND_REASON_LABELS: {
		CUSTOMER_REQUEST: "Demande client",
		DEFECTIVE: "Défectueux",
		WRONG_ITEM: "Mauvais article",
	},
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown) => action,
}));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({}),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		type,
		variant: _variant,
		...props
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		type?: "button" | "submit" | "reset";
		variant?: string;
		[key: string]: unknown;
	}) => (
		<button
			onClick={onClick}
			disabled={disabled}
			type={type}
			{...(props as Record<string, unknown>)}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
		<label htmlFor={htmlFor}>{children}</label>
	),
}));

vi.mock("@/shared/components/ui/textarea", () => ({
	Textarea: ({
		id,
		name,
		placeholder,
		disabled,
		...props
	}: {
		id?: string;
		name?: string;
		placeholder?: string;
		disabled?: boolean;
		[key: string]: unknown;
	}) => (
		<textarea
			id={id}
			name={name}
			placeholder={placeholder}
			disabled={disabled}
			{...(props as Record<string, unknown>)}
		/>
	),
}));

vi.mock("@/shared/components/ui/select", () => ({
	Select: ({
		children,
		value,
		onValueChange: _onValueChange,
		disabled,
	}: {
		children: React.ReactNode;
		value?: string;
		onValueChange?: (val: string) => void;
		disabled?: boolean;
	}) => (
		<div data-testid="select" data-value={value} data-disabled={disabled}>
			{children}
		</div>
	),
	SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
		<div data-testid="select-trigger" id={id}>
			{children}
		</div>
	),
	SelectValue: ({ placeholder }: { placeholder?: string }) => (
		<span data-testid="select-value">{placeholder}</span>
	),
	SelectContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="select-content">{children}</div>
	),
	SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<div data-testid={`select-item-${value}`}>{children}</div>
	),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => (
		<div data-testid="responsive-dialog-content" className={className}>
			{children}
		</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-dialog-header">{children}</div>
	),
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="responsive-dialog-title">{children}</h2>
	),
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="responsive-dialog-description">{children}</p>
	),
	ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-dialog-footer">{children}</div>
	),
}));

vi.mock("lucide-react", () => ({
	RotateCcw: () => <svg data-testid="icon-rotate-ccw" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

import { RequestReturnButton } from "../request-return-button";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function renderComponent(props: { orderId?: string; daysRemaining?: number } = {}) {
	return render(
		<RequestReturnButton
			orderId={props.orderId ?? "order-1"}
			daysRemaining={props.daysRemaining ?? 14}
		/>,
	);
}

// ============================================================================
// TESTS
// ============================================================================

describe("RequestReturnButton", () => {
	describe("static rendering", () => {
		it("renders section with 'Retour' heading", () => {
			renderComponent();
			expect(screen.getByRole("heading", { name: "Retour" })).toBeInTheDocument();
		});

		it("shows 'Demander un retour' button", () => {
			renderComponent();
			expect(screen.getByRole("button", { name: /Demander un retour/i })).toBeInTheDocument();
		});

		it("does not show dialog initially", () => {
			renderComponent();
			expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
		});
	});

	describe("dialog interaction", () => {
		it("opens dialog when button is clicked", async () => {
			const user = userEvent.setup();
			renderComponent();
			await user.click(screen.getByRole("button", { name: /Demander un retour/i }));
			expect(screen.getByTestId("responsive-dialog")).toBeInTheDocument();
		});

		it("shows dialog title 'Demander un retour'", async () => {
			const user = userEvent.setup();
			renderComponent();
			await user.click(screen.getByRole("button", { name: /Demander un retour/i }));
			expect(screen.getByTestId("responsive-dialog-title")).toHaveTextContent("Demander un retour");
		});

		it("shows daysRemaining in dialog description", async () => {
			const user = userEvent.setup();
			renderComponent({ daysRemaining: 7 });
			await user.click(screen.getByRole("button", { name: /Demander un retour/i }));
			expect(screen.getByTestId("responsive-dialog-description")).toHaveTextContent("7");
		});
	});

	describe("form elements", () => {
		it("shows reason select label 'Motif du retour'", async () => {
			const user = userEvent.setup();
			renderComponent();
			await user.click(screen.getByRole("button", { name: /Demander un retour/i }));
			expect(screen.getByText("Motif du retour")).toBeInTheDocument();
		});

		it("shows message textarea with label for optional message", async () => {
			const user = userEvent.setup();
			renderComponent();
			await user.click(screen.getByRole("button", { name: /Demander un retour/i }));
			expect(screen.getByText(/Précisions sur votre demande/i)).toBeInTheDocument();
		});

		it("shows reason select options from CUSTOMER_REASONS", async () => {
			const user = userEvent.setup();
			renderComponent();
			await user.click(screen.getByRole("button", { name: /Demander un retour/i }));
			expect(screen.getByTestId("select-item-CUSTOMER_REQUEST")).toHaveTextContent(
				"Demande client",
			);
			expect(screen.getByTestId("select-item-DEFECTIVE")).toHaveTextContent("Défectueux");
			expect(screen.getByTestId("select-item-WRONG_ITEM")).toHaveTextContent("Mauvais article");
		});

		it("shows 'Envoyer la demande' submit button", async () => {
			const user = userEvent.setup();
			renderComponent();
			await user.click(screen.getByRole("button", { name: /Demander un retour/i }));
			expect(screen.getByRole("button", { name: "Envoyer la demande" })).toBeInTheDocument();
		});

		it("submit button is disabled when no reason is selected", async () => {
			const user = userEvent.setup();
			renderComponent();
			await user.click(screen.getByRole("button", { name: /Demander un retour/i }));
			const submitButton = screen.getByRole("button", { name: "Envoyer la demande" });
			expect(submitButton).toBeDisabled();
		});
	});
});
