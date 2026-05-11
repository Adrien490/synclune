import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialog, mockOrderNotes, mockGetOrderNotes } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: false,
		data: null as { orderId: string; orderNumber: string; [key: string]: unknown } | null,
		close: vi.fn(),
	},
	mockOrderNotes: {
		add: vi.fn(),
		remove: vi.fn(),
		isPendingAdd: false,
		isPendingDelete: false,
		isPending: false,
	},
	mockGetOrderNotes: vi.fn(),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => mockDialog,
}));

vi.mock("@/modules/orders/hooks/use-order-notes", () => ({
	useOrderNotes: () => mockOrderNotes,
}));

// Mock the server data fetcher to break the auth.ts → Stripe import chain in tests
vi.mock("@/modules/orders/data/get-order-notes", () => ({
	getOrderNotes: mockGetOrderNotes,
}));

vi.mock("date-fns", () => ({
	format: (_date: Date, _fmt: string) => "1 jan. 2026 à 10:00",
}));

vi.mock("date-fns/locale", () => ({
	fr: {},
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		onClick,
		...props
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<button disabled={disabled} onClick={onClick} {...(props as Record<string, unknown>)}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/textarea", () => ({
	Textarea: ({
		placeholder,
		value,
		onChange,
		className,
	}: {
		placeholder?: string;
		value?: string;
		onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
		className?: string;
	}) => (
		<textarea
			data-testid="note-textarea"
			placeholder={placeholder}
			value={value}
			onChange={onChange}
			className={className}
		/>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: ({ className }: { className?: string }) => (
		<svg data-testid="loader" className={className} />
	),
	MessageSquarePlus: () => <svg data-testid="icon-message-plus" />,
	StickyNote: () => <svg data-testid="icon-sticky-note" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

import { OrderNotesDialog } from "../order-notes-dialog";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function openDialog(overrides: { orderId?: string; orderNumber?: string } = {}) {
	mockDialog.isOpen = true;
	mockDialog.data = {
		orderId: "order-1",
		orderNumber: "CMD-001",
		...overrides,
	};
}

function makeNote(
	overrides: Partial<{
		id: string;
		content: string;
		authorName: string;
		createdAt: string;
	}> = {},
) {
	return {
		id: "note-1",
		content: "Test note content",
		authorName: "Admin User",
		createdAt: "2026-01-01T10:00:00Z",
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("OrderNotesDialog", () => {
	describe("visibility", () => {
		it("renders nothing when dialog is closed", () => {
			mockDialog.isOpen = false;
			mockDialog.data = null;
			render(<OrderNotesDialog />);
			expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
		});

		it("shows title 'Notes internes' when open", () => {
			openDialog();
			mockGetOrderNotes.mockResolvedValue({ notes: [] });
			render(<OrderNotesDialog />);
			expect(screen.getByText("Notes internes")).toBeInTheDocument();
		});

		it("shows order number in description", () => {
			openDialog({ orderNumber: "CMD-2026-007" });
			mockGetOrderNotes.mockResolvedValue({ notes: [] });
			render(<OrderNotesDialog />);
			expect(screen.getByText("CMD-2026-007")).toBeInTheDocument();
		});
	});

	describe("textarea", () => {
		it("shows textarea with placeholder 'Ajouter une note…'", () => {
			openDialog();
			mockGetOrderNotes.mockResolvedValue({ notes: [] });
			render(<OrderNotesDialog />);
			expect(screen.getByPlaceholderText("Ajouter une note…")).toBeInTheDocument();
		});

		it("add button is disabled when textarea is empty", () => {
			openDialog();
			mockGetOrderNotes.mockResolvedValue({ notes: [] });
			render(<OrderNotesDialog />);
			const addButton = screen.getByRole("button", { name: /Ajouter/i });
			expect(addButton).toBeDisabled();
		});
	});

	describe("notes list states (Suspense + use)", () => {
		it("shows fallback loader while the Promise is pending", () => {
			openDialog();
			mockGetOrderNotes.mockReturnValue(new Promise(() => {})); // never resolves
			render(<OrderNotesDialog />);
			expect(screen.getByTestId("loader")).toBeInTheDocument();
		});

		it("shows error message when result has an error", async () => {
			openDialog();
			mockGetOrderNotes.mockResolvedValue({ error: "Erreur de chargement des notes" });
			await act(async () => {
				render(<OrderNotesDialog />);
			});
			await waitFor(() => {
				expect(screen.getByText("Erreur de chargement des notes")).toBeInTheDocument();
			});
		});

		it("shows empty state when notes list is empty", async () => {
			openDialog();
			mockGetOrderNotes.mockResolvedValue({ notes: [] });
			await act(async () => {
				render(<OrderNotesDialog />);
			});
			await waitFor(() => {
				expect(screen.getByText("Aucune note pour cette commande")).toBeInTheDocument();
			});
		});

		it("renders note content when notes exist", async () => {
			openDialog();
			mockGetOrderNotes.mockResolvedValue({
				notes: [makeNote({ content: "Important: check address" })],
			});
			await act(async () => {
				render(<OrderNotesDialog />);
			});
			await waitFor(() => {
				expect(screen.getByText("Important: check address")).toBeInTheDocument();
			});
		});

		it("renders note author name", async () => {
			openDialog();
			mockGetOrderNotes.mockResolvedValue({
				notes: [makeNote({ authorName: "Marie Dupont" })],
			});
			await act(async () => {
				render(<OrderNotesDialog />);
			});
			await waitFor(() => {
				expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
			});
		});

		it("renders formatted note date", async () => {
			openDialog();
			mockGetOrderNotes.mockResolvedValue({ notes: [makeNote()] });
			await act(async () => {
				render(<OrderNotesDialog />);
			});
			await waitFor(() => {
				expect(screen.getByText("1 jan. 2026 à 10:00")).toBeInTheDocument();
			});
		});
	});
});
