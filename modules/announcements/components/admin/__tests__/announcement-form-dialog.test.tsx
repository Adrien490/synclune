import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { AnnouncementListItem } from "../../../types/announcement.types";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockReset } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockReset: vi.fn(),
}));

let mockDialogState: {
	isOpen: boolean;
	close: typeof mockClose;
	data: { announcement?: AnnouncementListItem } | null;
} = {
	isOpen: true,
	close: mockClose,
	data: null,
};

let mockCreatePending = false;
let mockUpdatePending = false;

vi.mock("react", async () => {
	const actual = await vi.importActual("react");
	return {
		...actual,
		useActionState: (_action: unknown, _initial: unknown) => {
			// Return different pending states based on which action is passed
			const isPending = mockCreatePending || mockUpdatePending;
			return [undefined, vi.fn(), isPending];
		},
	};
});

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => mockDialogState,
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: () => ({
		reset: mockReset,
		AppField: ({
			children,
			name,
		}: {
			children: (field: Record<string, unknown>) => React.ReactNode;
			name: string;
		}) => (
			<div data-testid={`field-${name}`}>
				{children({
					TextareaField: (props: Record<string, unknown>) => (
						<textarea data-testid={`textarea-${name}`} placeholder={props.placeholder as string} />
					),
					InputField: (props: Record<string, unknown>) => (
						<input data-testid={`input-${name}`} placeholder={props.placeholder as string} />
					),
					DateTimeField: (props: Record<string, unknown>) => (
						<input
							data-testid={`datetime-${name}`}
							type="datetime-local"
							placeholder={props.placeholder as string}
						/>
					),
				})}
			</div>
		),
		Subscribe: ({
			children,
		}: {
			children: (values: unknown[]) => React.ReactNode;
			selector: (state: Record<string, unknown>) => unknown[];
		}) => <>{children(["Test message", "Test link"])}</>,
	}),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
	}) => (
		<button disabled={disabled} type={type as "button" | "submit" | undefined}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/required-fields-note", () => ({
	RequiredFieldsNote: () => <div data-testid="required-fields-note" />,
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown) => action,
}));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({}),
}));

vi.mock("../../../actions/create-announcement", () => ({
	createAnnouncement: vi.fn(),
}));

vi.mock("../../../actions/update-announcement", () => ({
	updateAnnouncement: vi.fn(),
}));

vi.mock("../announcement-preview", () => ({
	AnnouncementPreview: ({ message, linkText }: { message: string; linkText?: string | null }) => (
		<div data-testid="preview">
			{message} {linkText}
		</div>
	),
}));

import { AnnouncementFormDialog } from "../announcement-form-dialog";

// ============================================================================
// HELPERS
// ============================================================================

function createAnnouncement(overrides: Partial<AnnouncementListItem> = {}): AnnouncementListItem {
	return {
		id: "ann_1",
		message: "Promo été",
		link: "/soldes",
		linkText: "En profiter",
		startsAt: new Date("2026-04-01T10:00:00Z"),
		endsAt: new Date("2026-05-01T10:00:00Z"),
		isActive: true,
		dismissDurationHours: 48,
		createdAt: new Date("2026-03-01"),
		updatedAt: new Date("2026-03-01"),
		...overrides,
	} as AnnouncementListItem;
}

// ============================================================================
// TESTS
// ============================================================================

describe("AnnouncementFormDialog", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockCreatePending = false;
		mockUpdatePending = false;
		mockDialogState = {
			isOpen: true,
			close: mockClose,
			data: null,
		};
	});

	// ─── Dialog rendering ─────────────────────────────────────────────────────

	it("should render when dialog is open", () => {
		render(<AnnouncementFormDialog />);

		expect(screen.getByTestId("dialog")).toBeInTheDocument();
	});

	it("should not render when dialog is closed", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };

		render(<AnnouncementFormDialog />);

		expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
	});

	// ─── Create mode ──────────────────────────────────────────────────────────

	it("should show 'Nouvelle annonce' title in create mode", () => {
		render(<AnnouncementFormDialog />);

		expect(screen.getByText("Nouvelle annonce")).toBeInTheDocument();
	});

	it("should show 'Créer l'annonce' button in create mode", () => {
		render(<AnnouncementFormDialog />);

		expect(screen.getByText("Créer l'annonce")).toBeInTheDocument();
	});

	it("should not render hidden ID input in create mode", () => {
		render(<AnnouncementFormDialog />);

		expect(document.querySelector('input[name="id"]')).not.toBeTruthy();
	});

	// ─── Update mode ──────────────────────────────────────────────────────────

	it("should show 'Modifier l'annonce' title in update mode", () => {
		mockDialogState = {
			...mockDialogState,
			data: { announcement: createAnnouncement() },
		};

		render(<AnnouncementFormDialog />);

		expect(screen.getByText("Modifier l'annonce")).toBeInTheDocument();
	});

	it("should show 'Enregistrer' button in update mode", () => {
		mockDialogState = {
			...mockDialogState,
			data: { announcement: createAnnouncement() },
		};

		render(<AnnouncementFormDialog />);

		expect(screen.getByText("Enregistrer")).toBeInTheDocument();
	});

	it("should render hidden ID input in update mode", () => {
		mockDialogState = {
			...mockDialogState,
			data: { announcement: createAnnouncement({ id: "ann_42" }) },
		};

		render(<AnnouncementFormDialog />);

		const hiddenInput = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(hiddenInput).toBeTruthy();
		expect(hiddenInput.value).toBe("ann_42");
	});

	// ─── Form fields ──────────────────────────────────────────────────────────

	it("should render all form fields", () => {
		render(<AnnouncementFormDialog />);

		expect(screen.getByTestId("field-message")).toBeInTheDocument();
		expect(screen.getByTestId("field-link")).toBeInTheDocument();
		expect(screen.getByTestId("field-linkText")).toBeInTheDocument();
		expect(screen.getByTestId("field-startsAt")).toBeInTheDocument();
		expect(screen.getByTestId("field-endsAt")).toBeInTheDocument();
		expect(screen.getByTestId("field-dismissDurationHours")).toBeInTheDocument();
	});

	it("should render required fields note", () => {
		render(<AnnouncementFormDialog />);

		expect(screen.getByTestId("required-fields-note")).toBeInTheDocument();
	});

	// ─── Preview ──────────────────────────────────────────────────────────────

	it("should render live preview", () => {
		render(<AnnouncementFormDialog />);

		expect(screen.getByTestId("preview")).toBeInTheDocument();
	});

	// ─── Loading state ────────────────────────────────────────────────────────

	it("should show 'Enregistrement...' when pending", () => {
		mockCreatePending = true;

		render(<AnnouncementFormDialog />);

		expect(screen.getByText("Enregistrement...")).toBeInTheDocument();
	});

	it("should disable submit button when pending", () => {
		mockCreatePending = true;

		render(<AnnouncementFormDialog />);

		expect(screen.getByText("Enregistrement...")).toBeDisabled();
	});
});
