import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({
		children,
		role,
		"aria-live": ariaLive,
	}: {
		children: React.ReactNode;
		variant?: string;
		role?: string;
		"aria-live"?: string;
	}) => (
		<div
			data-testid="alert"
			role={role as React.AriaRole}
			aria-live={ariaLive as React.AriaAttributes["aria-live"]}
		>
			{children}
		</div>
	),
	AlertTitle: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-title">{children}</div>
	),
	AlertDescription: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-description">{children}</div>
	),
}));

vi.mock("lucide-react", () => ({
	CircleAlert: ({ className }: { className?: string }) => (
		<svg data-testid="icon-circle-alert" className={className} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CheckoutErrorSummary } from "../checkout-error-summary";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("CheckoutErrorSummary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders null when fieldErrors is empty", () => {
		const { container } = render(<CheckoutErrorSummary fieldErrors={[]} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders alert when there are errors", () => {
		render(
			<CheckoutErrorSummary
				fieldErrors={[{ name: "email", label: "Adresse email", message: "Champ requis" }]}
			/>,
		);
		expect(screen.getByTestId("alert")).toBeInTheDocument();
	});

	it("has role=alert and aria-live=assertive", () => {
		render(
			<CheckoutErrorSummary fieldErrors={[{ name: "email", label: "Email", message: "Requis" }]} />,
		);
		const alert = screen.getByRole("alert");
		expect(alert).toHaveAttribute("aria-live", "assertive");
	});

	it("shows singular title for 1 error", () => {
		render(
			<CheckoutErrorSummary fieldErrors={[{ name: "email", label: "Email", message: "Requis" }]} />,
		);
		expect(screen.getByTestId("alert-title")).toHaveTextContent("1 erreur trouvée");
	});

	it("shows plural title for multiple errors", () => {
		render(
			<CheckoutErrorSummary
				fieldErrors={[
					{ name: "email", label: "Email", message: "Requis" },
					{ name: "fullName", label: "Nom complet", message: "Requis" },
					{ name: "city", label: "Ville", message: "Requis" },
				]}
			/>,
		);
		expect(screen.getByTestId("alert-title")).toHaveTextContent("3 erreurs trouvées");
	});

	it("renders a list item per error", () => {
		render(
			<CheckoutErrorSummary
				fieldErrors={[
					{ name: "email", label: "Email", message: "Requis" },
					{ name: "city", label: "Ville", message: "Invalide" },
				]}
			/>,
		);
		const items = screen.getAllByRole("listitem");
		expect(items).toHaveLength(2);
	});

	it("renders field label as a button in each error item", () => {
		render(
			<CheckoutErrorSummary
				fieldErrors={[{ name: "email", label: "Adresse email", message: "Format invalide" }]}
			/>,
		);
		expect(screen.getByRole("button", { name: "Adresse email" })).toBeInTheDocument();
	});

	it("renders error message next to label", () => {
		render(
			<CheckoutErrorSummary
				fieldErrors={[{ name: "email", label: "Email", message: "Format invalide" }]}
			/>,
		);
		expect(screen.getByText(/Format invalide/)).toBeInTheDocument();
	});

	it("focuses target element when label button clicked", async () => {
		const input = document.createElement("input");
		input.id = "email";
		// Mock scrollIntoView and focus (jsdom doesn't implement them fully)
		input.scrollIntoView = vi.fn();
		document.body.appendChild(input);
		const focusSpy = vi.spyOn(input, "focus");

		render(
			<CheckoutErrorSummary fieldErrors={[{ name: "email", label: "Email", message: "Requis" }]} />,
		);
		await userEvent.click(screen.getByRole("button", { name: "Email" }));
		expect(focusSpy).toHaveBeenCalled();

		document.body.removeChild(input);
	});
});
