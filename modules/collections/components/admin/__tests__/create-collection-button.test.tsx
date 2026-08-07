import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpen, mockIsMobile, mockRouterPush } = vi.hoisted(() => ({
	mockOpen: vi.fn(),
	mockIsMobile: { current: false },
	mockRouterPush: vi.fn(),
}));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useDialog: () => ({ open: mockOpen }),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile.current,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@/modules/collections/components/admin/collection-form-dialog", () => ({
	COLLECTION_DIALOG_ID: "collection-form",
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		...rest
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<button onClick={onClick} {...rest}>
			{children}
		</button>
	),
}));

import { CreateCollectionButton } from "../create-collection-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CreateCollectionButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsMobile.current = false;
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders button with text 'Créer une collection'", () => {
		render(<CreateCollectionButton />);
		expect(screen.getByRole("button", { name: "Créer une collection" })).toBeInTheDocument();
	});

	// ─── Desktop behavior ─────────────────────────────────────────────────────

	it("calls open() when clicked on desktop", async () => {
		mockIsMobile.current = false;
		const user = userEvent.setup();
		render(<CreateCollectionButton />);
		await user.click(screen.getByRole("button", { name: "Créer une collection" }));
		expect(mockOpen).toHaveBeenCalledOnce();
		expect(mockRouterPush).not.toHaveBeenCalled();
	});

	// ─── Mobile behavior ──────────────────────────────────────────────────────

	it("calls router.push() when clicked on mobile", async () => {
		mockIsMobile.current = true;
		const user = userEvent.setup();
		render(<CreateCollectionButton />);
		await user.click(screen.getByRole("button", { name: "Créer une collection" }));
		expect(mockRouterPush).toHaveBeenCalledWith("/admin/catalogue/collections/nouveau");
		expect(mockOpen).not.toHaveBeenCalled();
	});
});
