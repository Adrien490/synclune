import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpen, mockPush, mockIsMobile } = vi.hoisted(() => ({
	mockOpen: vi.fn(),
	mockPush: vi.fn(),
	mockIsMobile: { current: false },
}));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useDialog: () => ({ open: mockOpen }),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile.current,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/modules/colors/components/color-form-dialog", () => ({
	COLOR_DIALOG_ID: "color-form",
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<button data-testid="create-color-button" onClick={onClick}>
			{children}
		</button>
	),
}));

import { CreateTaxonomyButton } from "@/modules/taxonomies/components/taxonomy-list-controls";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CreateTaxonomyButton — color", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsMobile.current = false;
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the button", () => {
		render(<CreateTaxonomyButton kind="color" />);
		expect(screen.getByTestId("create-color-button")).toBeInTheDocument();
	});

	it("shows 'Créer une couleur' text", () => {
		render(<CreateTaxonomyButton kind="color" />);
		expect(screen.getByText("Créer une couleur")).toBeInTheDocument();
	});

	// ─── Desktop (default) ────────────────────────────────────────────────────

	it("opens the dialog on desktop", async () => {
		const user = userEvent.setup();
		render(<CreateTaxonomyButton kind="color" />);
		await user.click(screen.getByTestId("create-color-button"));
		expect(mockOpen).toHaveBeenCalledTimes(1);
		expect(mockOpen).toHaveBeenCalledWith();
		expect(mockPush).not.toHaveBeenCalled();
	});

	// ─── Mobile ───────────────────────────────────────────────────────────────

	it("navigates to the dedicated page on mobile instead of opening the dialog", async () => {
		mockIsMobile.current = true;
		const user = userEvent.setup();
		render(<CreateTaxonomyButton kind="color" />);
		await user.click(screen.getByTestId("create-color-button"));
		expect(mockPush).toHaveBeenCalledWith("/admin/catalogue/couleurs/nouveau");
		expect(mockOpen).not.toHaveBeenCalled();
	});
});
