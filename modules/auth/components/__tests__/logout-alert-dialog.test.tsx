import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockLogout } = vi.hoisted(() => ({
	mockLogout: {
		action: vi.fn(),
		isPending: false,
		isLoggedOut: false,
	},
}));

vi.mock("@/modules/auth/hooks/use-logout", () => ({
	useLogout: () => mockLogout,
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({ children, open }: any) =>
		open ? <div data-testid="dialog">{children}</div> : <div>{children}</div>,
	AlertDialogTrigger: (props: RenderPropMockProps) =>
		renderPropMock("div", { "data-testid": "trigger", ...props }),
	AlertDialogContent: ({ children }: any) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
	AlertDialogCancel: ({ children, disabled }: any) => (
		<button disabled={disabled} data-testid="cancel">
			{children}
		</button>
	),
	AlertDialogAction: ({ children, disabled }: any) => (
		<button disabled={disabled} data-testid="submit">
			{children}
		</button>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	SpinnerIcon: () => <svg data-testid="loader" />,
}));

import { LogoutAlertDialog } from "../logout-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("LogoutAlertDialog", () => {
	beforeEach(() => {
		mockLogout.action = vi.fn();
		mockLogout.isPending = false;
		mockLogout.isLoggedOut = false;
	});

	afterEach(cleanup);

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("should render trigger children when provided", () => {
		render(
			<LogoutAlertDialog>
				<button>Open</button>
			</LogoutAlertDialog>,
		);

		expect(screen.getByTestId("trigger")).toBeInTheDocument();
		expect(screen.getByText("Open")).toBeInTheDocument();
	});

	it("should show title 'Se déconnecter ?' when controlled open=true", () => {
		render(<LogoutAlertDialog open={true} onOpenChange={vi.fn()} />);

		expect(screen.getByText("Se déconnecter ?")).toBeInTheDocument();
	});

	// ─── Button text states ───────────────────────────────────────────────────

	it("should show 'Se déconnecter' button text when idle", () => {
		render(<LogoutAlertDialog open={true} onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("submit")).toHaveTextContent("Se déconnecter");
	});

	it("should show 'Déconnexion…' when isPending", () => {
		mockLogout.isPending = true;

		render(<LogoutAlertDialog open={true} onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("submit")).toHaveTextContent("Déconnexion…");
	});

	it("should show 'Déconnecté !' when isLoggedOut", () => {
		mockLogout.isLoggedOut = true;

		render(<LogoutAlertDialog open={true} onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("submit")).toHaveTextContent("Déconnecté !");
	});

	// ─── Cancel button ────────────────────────────────────────────────────────

	it("should disable cancel button when isPending", () => {
		mockLogout.isPending = true;

		render(<LogoutAlertDialog open={true} onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("cancel")).toBeDisabled();
	});

	it("should disable cancel button when isLoggedOut", () => {
		mockLogout.isLoggedOut = true;

		render(<LogoutAlertDialog open={true} onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("cancel")).toBeDisabled();
	});

	it("should show 'Annuler' cancel button text", () => {
		render(<LogoutAlertDialog open={true} onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("cancel")).toHaveTextContent("Annuler");
	});

	// ─── Loader icon ──────────────────────────────────────────────────────────

	it("should show loader icon when isPending", () => {
		mockLogout.isPending = true;

		render(<LogoutAlertDialog open={true} onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("loader")).toBeInTheDocument();
	});

	it("should show loader icon when isLoggedOut", () => {
		mockLogout.isLoggedOut = true;

		render(<LogoutAlertDialog open={true} onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("loader")).toBeInTheDocument();
	});

	it("should not show loader icon when idle", () => {
		render(<LogoutAlertDialog open={true} onOpenChange={vi.fn()} />);

		expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
	});

	// ─── Submit button disabled states ────────────────────────────────────────

	it("should disable submit button when isPending", () => {
		mockLogout.isPending = true;

		render(<LogoutAlertDialog open={true} onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("submit")).toBeDisabled();
	});

	it("should disable submit button when isLoggedOut", () => {
		mockLogout.isLoggedOut = true;

		render(<LogoutAlertDialog open={true} onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("submit")).toBeDisabled();
	});

	it("should not disable submit button when idle", () => {
		render(<LogoutAlertDialog open={true} onOpenChange={vi.fn()} />);

		expect(screen.getByTestId("submit")).not.toBeDisabled();
	});

	// ─── Description text ─────────────────────────────────────────────────────

	it("should show description text about logging out", () => {
		render(<LogoutAlertDialog open={true} onOpenChange={vi.fn()} />);

		expect(screen.getByText(/voulez-vous vraiment vous déconnecter/i)).toBeInTheDocument();
	});
});
