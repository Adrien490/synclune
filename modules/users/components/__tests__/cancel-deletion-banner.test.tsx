import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { useCancelAccountDeletionMock } = vi.hoisted(() => ({
	useCancelAccountDeletionMock: vi.fn(() => ({
		action: vi.fn(),
		isPending: false,
	})),
}));

vi.mock("@/modules/users/hooks/use-cancel-account-deletion", () => ({
	useCancelAccountDeletion: useCancelAccountDeletionMock,
}));

vi.mock("lucide-react", () => ({
	AlertTriangle: () => <span data-testid="alert-icon" />,
	Loader2: () => <span data-testid="loader-icon" />,
}));

import { CancelDeletionBanner } from "../cancel-deletion-banner";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	useCancelAccountDeletionMock.mockReturnValue({ action: vi.fn(), isPending: false });
});

describe("CancelDeletionBanner", () => {
	it("renders with daysRemaining=15 showing plural", () => {
		render(<CancelDeletionBanner daysRemaining={15} />);
		expect(document.body.textContent).toContain("15 jours");
	});

	it("renders with daysRemaining=1 showing singular", () => {
		render(<CancelDeletionBanner daysRemaining={1} />);
		expect(document.body.textContent).toContain("1 jour");
		expect(document.body.textContent).not.toContain("1 jours");
	});

	it("shows the cancel deletion button", () => {
		render(<CancelDeletionBanner daysRemaining={10} />);
		expect(screen.getByRole("button", { name: /Annuler la suppression/i })).toBeInTheDocument();
	});

	it("shows pending state: button disabled with 'Annulation...' text", () => {
		useCancelAccountDeletionMock.mockReturnValue({ action: vi.fn(), isPending: true });
		render(<CancelDeletionBanner daysRemaining={10} />);

		const btn = screen.getByRole("button");
		expect(btn).toBeDisabled();
		expect(btn.textContent).toContain("Annulation...");
	});
});
