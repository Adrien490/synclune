import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { Suspense } from "react";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockOpenDialog, mockOpenAlert, mockReorder } = vi.hoisted(() => ({
	mockOpenDialog: vi.fn(),
	mockOpenAlert: vi.fn(),
	mockReorder: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: false,
		open: mockOpenDialog,
		close: vi.fn(),
		toggle: vi.fn(),
		clearData: vi.fn(),
	}),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({
		isOpen: false,
		open: mockOpenAlert,
		close: vi.fn(),
		clearData: vi.fn(),
	}),
}));

vi.mock("@/modules/faq/hooks/use-reorder-faq-items", () => ({
	useReorderFaqItems: () => ({
		state: undefined,
		action: vi.fn(),
		isPending: false,
		reorder: mockReorder,
	}),
}));

vi.mock("@/modules/faq/constants/dialog", () => ({
	FAQ_FORM_DIALOG_ID: "faq-form",
	DELETE_FAQ_DIALOG_ID: "delete-faq",
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children }: { children: React.ReactNode }) => (
		<span data-testid="badge">{children}</span>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		...props
	}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

// ---------------------------------------------------------------------------
// We need to mock React.use() for the promise-based pattern
// ---------------------------------------------------------------------------

// Import after mocks
import { FaqList } from "../faq-list";
import type { FaqListItem } from "../../../types/faq.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createFaqItem(overrides: Partial<FaqListItem> = {}): FaqListItem {
	return {
		id: `faq-${Math.random().toString(36).slice(2)}`,
		question: "Test question?",
		answer: "Test answer",
		links: null,
		position: 0,
		isActive: true,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		...overrides,
	};
}

const faq1 = createFaqItem({
	id: "faq-1",
	question: "What is Synclune?",
	answer: "A jewelry shop",
	position: 0,
});
const faq2 = createFaqItem({
	id: "faq-2",
	question: "How to order?",
	answer: "Click buy",
	position: 1,
});
const faq3 = createFaqItem({
	id: "faq-3",
	question: "Return policy?",
	answer: "30 days",
	position: 2,
});
const faqInactive = createFaqItem({
	id: "faq-4",
	question: "Hidden FAQ?",
	answer: "Secret",
	isActive: false,
});

/**
 * FaqList uses React.use(promise), which needs a Suspense boundary.
 * We pre-resolve the promise and wrap rendering in Suspense + act.
 */
function resolvedPromise<T>(value: T): Promise<T> {
	return Promise.resolve(value) as Promise<T>;
}

async function renderFaqList(items: FaqListItem[]) {
	let result: ReturnType<typeof render>;
	await act(async () => {
		result = render(
			<Suspense fallback={<div>Loading...</div>}>
				<FaqList faqItemsPromise={resolvedPromise(items)} />
			</Suspense>,
		);
	});
	return result!;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("FaqList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	// -----------------------------------------------------------------------
	// Rendering
	// -----------------------------------------------------------------------
	describe("rendering", () => {
		it("renders all FAQ items", async () => {
			await renderFaqList([faq1, faq2, faq3]);

			expect(screen.getByText("What is Synclune?")).toBeInTheDocument();
			expect(screen.getByText("How to order?")).toBeInTheDocument();
			expect(screen.getByText("Return policy?")).toBeInTheDocument();
		});

		it("renders empty state when no items", async () => {
			await renderFaqList([]);

			expect(screen.getByText("Aucune question FAQ pour le moment")).toBeInTheDocument();
		});

		it("shows inactive badge for hidden items", async () => {
			await renderFaqList([faqInactive]);

			expect(screen.getByText("Masquée")).toBeInTheDocument();
		});

		it("does not show inactive badge for active items", async () => {
			await renderFaqList([faq1]);

			expect(screen.queryByText("Masquée")).not.toBeInTheDocument();
		});

		it("strips link placeholders from answer preview", async () => {
			const faqWithLink = createFaqItem({ answer: "Visit {{link1}} for more info {{link2}}" });
			await renderFaqList([faqWithLink]);

			expect(screen.getByText("Visit [lien] for more info [lien]")).toBeInTheDocument();
		});
	});

	// -----------------------------------------------------------------------
	// Drag & drop (native HTML5)
	// -----------------------------------------------------------------------
	describe("native drag and drop", () => {
		it("marks each item as draggable", async () => {
			await renderFaqList([faq1, faq2]);

			const items = screen.getByText("What is Synclune?").closest("[draggable]");
			expect(items).toHaveAttribute("draggable", "true");
		});

		it("applies opacity on drag start", async () => {
			await renderFaqList([faq1, faq2]);

			const item = screen.getByText("What is Synclune?").closest("[draggable]")!;
			fireEvent.dragStart(item);

			expect(item.className).toContain("opacity-50");
		});

		it("calls reorder on drag end", async () => {
			await renderFaqList([faq1, faq2]);

			const item1 = screen.getByText("What is Synclune?").closest("[draggable]")!;
			fireEvent.dragStart(item1);
			fireEvent.dragEnd(item1);

			expect(mockReorder).toHaveBeenCalledWith([
				{ id: "faq-1", position: 0 },
				{ id: "faq-2", position: 1 },
			]);
		});
	});

	// -----------------------------------------------------------------------
	// Accessibility
	// -----------------------------------------------------------------------
	describe("accessibility", () => {
		it("has aria-live region for announcements", async () => {
			await renderFaqList([faq1]);

			const liveRegion = document.querySelector("[aria-live='polite']");
			expect(liveRegion).toBeInTheDocument();
			expect(liveRegion?.getAttribute("aria-atomic")).toBe("true");
		});

		it("drag handle has aria-label", async () => {
			await renderFaqList([faq1]);

			expect(screen.getByLabelText("Réordonner")).toBeInTheDocument();
		});

		it("move up button has aria-label with question text", async () => {
			await renderFaqList([faq1, faq2]);

			expect(screen.getByLabelText('Monter "How to order?"')).toBeInTheDocument();
		});

		it("move down button has aria-label with question text", async () => {
			await renderFaqList([faq1, faq2]);

			expect(screen.getByLabelText('Descendre "What is Synclune?"')).toBeInTheDocument();
		});

		it("announces position after move up", async () => {
			await renderFaqList([faq1, faq2, faq3]);

			fireEvent.click(screen.getByLabelText('Monter "How to order?"'));

			const liveRegion = document.querySelector("[aria-live='polite']");
			expect(liveRegion?.textContent).toContain("déplacé en position");
		});

		it("announces position after move down", async () => {
			await renderFaqList([faq1, faq2, faq3]);

			fireEvent.click(screen.getByLabelText('Descendre "What is Synclune?"'));

			const liveRegion = document.querySelector("[aria-live='polite']");
			expect(liveRegion?.textContent).toContain("déplacé en position");
		});
	});

	// -----------------------------------------------------------------------
	// WCAG 2.5.7 - Move up/down buttons
	// -----------------------------------------------------------------------
	describe("WCAG 2.5.7 drag alternatives", () => {
		it("disables move up for first item", async () => {
			await renderFaqList([faq1, faq2]);

			const moveUp = screen.getByLabelText('Monter "What is Synclune?"');
			expect(moveUp).toBeDisabled();
		});

		it("disables move down for last item", async () => {
			await renderFaqList([faq1, faq2]);

			const moveDown = screen.getByLabelText('Descendre "How to order?"');
			expect(moveDown).toBeDisabled();
		});

		it("moves item up and calls reorder", async () => {
			await renderFaqList([faq1, faq2, faq3]);

			fireEvent.click(screen.getByLabelText('Monter "How to order?"'));

			expect(mockReorder).toHaveBeenCalledWith([
				{ id: "faq-2", position: 0 },
				{ id: "faq-1", position: 1 },
				{ id: "faq-3", position: 2 },
			]);
		});

		it("moves item down and calls reorder", async () => {
			await renderFaqList([faq1, faq2, faq3]);

			fireEvent.click(screen.getByLabelText('Descendre "What is Synclune?"'));

			expect(mockReorder).toHaveBeenCalledWith([
				{ id: "faq-2", position: 0 },
				{ id: "faq-1", position: 1 },
				{ id: "faq-3", position: 2 },
			]);
		});

		it("does not move when index is 0 and move up clicked", async () => {
			await renderFaqList([faq1, faq2]);

			const moveUp = screen.getByLabelText('Monter "What is Synclune?"');
			expect(moveUp).toBeDisabled();
		});
	});

	// -----------------------------------------------------------------------
	// Edit & Delete
	// -----------------------------------------------------------------------
	describe("edit and delete", () => {
		it("opens edit dialog with faq item data", async () => {
			await renderFaqList([faq1]);

			fireEvent.click(screen.getByLabelText('Modifier "What is Synclune?"'));

			expect(mockOpenDialog).toHaveBeenCalledWith({ faqItem: faq1 });
		});

		it("opens delete dialog with faq item id and question", async () => {
			await renderFaqList([faq1]);

			fireEvent.click(screen.getByLabelText('Supprimer "What is Synclune?"'));

			expect(mockOpenAlert).toHaveBeenCalledWith({
				faqItemId: "faq-1",
				faqItemQuestion: "What is Synclune?",
			});
		});
	});
});
