import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const mocks = vi.hoisted(() => ({
	isOpen: false,
	data: null as {
		review: {
			id: string;
			rating: number;
			title: string | null;
			content: string;
			status: string;
			createdAt: Date;
			updatedAt: Date;
			product: {
				id: string;
				title: string;
				slug: string;
				skus: Array<{
					images: Array<{
						url: string;
						blurDataUrl: string | null;
						altText: string | null;
					}>;
				}>;
			};
			medias: Array<{
				id: string;
				url: string;
				blurDataUrl: string | null;
				altText: string | null;
			}>;
			response: { content: string; authorName: string; createdAt: Date } | null;
		};
		[key: string]: unknown;
	} | null,
	close: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: mocks.isOpen,
		data: mocks.data,
		close: mocks.close,
	}),
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
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="dialog-title">{children}</h2>
	),
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="dialog-description">{children}</p>
	),
}));

vi.mock("../update-review-form", () => ({
	UpdateReviewForm: ({
		review,
	}: {
		review: { id: string };
		onSuccess?: () => void;
		onCancel?: () => void;
	}) => <div data-testid="update-review-form" data-review-id={review.id} />,
}));

import { EditReviewDialog } from "../edit-review-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("EditReviewDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.isOpen = false;
		mocks.data = null;
	});

	it("renders nothing when dialog is closed", () => {
		render(<EditReviewDialog />);
		expect(screen.queryByTestId("responsive-dialog")).toBeNull();
	});

	it("renders dialog when open", () => {
		mocks.isOpen = true;
		mocks.data = {
			review: {
				id: "rev-1",
				rating: 4,
				title: null,
				content: "Super",
				status: "PUBLISHED",
				createdAt: new Date(),
				updatedAt: new Date(),
				product: { id: "p1", title: "Bague argent", slug: "b", skus: [] },
				medias: [],
				response: null,
			},
		};
		render(<EditReviewDialog />);
		expect(screen.getByTestId("responsive-dialog")).toBeInTheDocument();
	});

	it("shows title 'Modifier mon avis' when open", () => {
		mocks.isOpen = true;
		mocks.data = {
			review: {
				id: "rev-1",
				rating: 4,
				title: null,
				content: "Super",
				status: "PUBLISHED",
				createdAt: new Date(),
				updatedAt: new Date(),
				product: { id: "p1", title: "Bague argent", slug: "b", skus: [] },
				medias: [],
				response: null,
			},
		};
		render(<EditReviewDialog />);
		expect(screen.getByText("Modifier mon avis")).toBeInTheDocument();
	});

	it("shows product title in description when open", () => {
		mocks.isOpen = true;
		mocks.data = {
			review: {
				id: "rev-1",
				rating: 4,
				title: null,
				content: "Super",
				status: "PUBLISHED",
				createdAt: new Date(),
				updatedAt: new Date(),
				product: { id: "p1", title: "Bague argent", slug: "b", skus: [] },
				medias: [],
				response: null,
			},
		};
		render(<EditReviewDialog />);
		expect(screen.getByText(/Bague argent/)).toBeInTheDocument();
	});

	it("renders UpdateReviewForm when review data is present", () => {
		mocks.isOpen = true;
		mocks.data = {
			review: {
				id: "rev-42",
				rating: 4,
				title: null,
				content: "Super",
				status: "PUBLISHED",
				createdAt: new Date(),
				updatedAt: new Date(),
				product: { id: "p1", title: "T", slug: "b", skus: [] },
				medias: [],
				response: null,
			},
		};
		render(<EditReviewDialog />);
		const form = screen.getByTestId("update-review-form");
		expect(form).toHaveAttribute("data-review-id", "rev-42");
	});
});
