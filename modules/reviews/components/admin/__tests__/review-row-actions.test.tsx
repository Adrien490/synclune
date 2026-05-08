import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockOpenAlertDialog } = vi.hoisted(() => ({
	mockOpenAlertDialog: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: mockOpenAlertDialog, close: vi.fn(), isOpen: false, data: null }),
}));

vi.mock("../toggle-review-status-alert-dialog", () => ({
	TOGGLE_REVIEW_STATUS_DIALOG_ID: "toggle-review-status",
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		"aria-label": ariaLabel,
		onClick,
		disabled,
		variant,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		onClick?: () => void;
		disabled?: boolean;
		variant?: string;
	}) => (
		<button aria-label={ariaLabel} onClick={onClick} disabled={disabled} data-variant={variant}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/responsive-action-menu", async () => {
	const { buildResponsiveActionMenuMock } =
		await import("@/shared/components/responsive-action-menu/test-mock");
	return buildResponsiveActionMenuMock();
});

vi.mock("lucide-react", () => ({
	Eye: () => <svg data-testid="icon-eye" />,
	EyeOff: () => <svg data-testid="icon-eye-off" />,
	ExternalLink: () => <svg data-testid="icon-external-link" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
}));

import { ReviewRowActions } from "../review-row-actions";
import type { ReviewAdmin } from "@/modules/reviews/types/review.types";

function createReview(overrides: Partial<ReviewAdmin> = {}): ReviewAdmin {
	return {
		id: "rev-1",
		rating: 4,
		title: "Super produit",
		content: "Très bien",
		status: "PUBLISHED",
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		user: {
			id: "user-1",
			name: "Marie Dupont",
			email: "marie@example.com",
			image: null,
		},
		product: {
			id: "prod-1",
			title: "Bague argent",
			slug: "bague-argent",
		},
		medias: [],
		response: null,
		...overrides,
	};
}

afterEach(cleanup);

describe("ReviewRowActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the trigger button with aria-label 'Actions'", () => {
		render(<ReviewRowActions review={createReview()} />);
		expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
	});

	it("renders 'Voir le détail' as a link to the detail page", () => {
		render(<ReviewRowActions review={createReview()} />);
		const link = screen.getByRole("menuitem", { name: "Voir le détail" });
		expect(link).toHaveAttribute("href", "/admin/marketing/avis/rev-1");
	});

	it("renders 'Voir le produit' as an external link", () => {
		render(<ReviewRowActions review={createReview()} />);
		const link = screen.getByRole("menuitem", { name: "Voir le produit" });
		expect(link).toHaveAttribute("href", "/creations/bague-argent");
		expect(link).toHaveAttribute("target", "_blank");
	});

	it("groups actions into navigate + moderation sections", () => {
		render(<ReviewRowActions review={createReview()} />);
		expect(document.querySelectorAll("[data-section]").length).toBeGreaterThanOrEqual(2);
	});

	it("shows 'Masquer' when review is PUBLISHED", () => {
		render(<ReviewRowActions review={createReview({ status: "PUBLISHED" })} />);
		expect(screen.getByText("Masquer")).toBeInTheDocument();
	});

	it("shows 'Publier' when review is HIDDEN", () => {
		render(<ReviewRowActions review={createReview({ status: "HIDDEN" })} />);
		expect(screen.getByText("Publier")).toBeInTheDocument();
	});
});
