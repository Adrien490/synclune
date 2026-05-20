import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PendingUploadsGrid } from "../pending-uploads-grid";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => vi.fn(),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

vi.mock("@/shared/hooks/use-touch-device", () => ({
	useIsTouchDevice: () => false,
}));

vi.mock("@/shared/components/scroll-fade", () => ({
	default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/modules/media/utils/upload-helpers", () => ({
	formatFileSize: (bytes: number) => `${bytes} o`,
}));

vi.mock("@/modules/media/hooks/use-video-thumbnail", () => ({
	getVideoMetadata: vi.fn(async () => null),
	formatVideoDuration: (seconds: number) => `0:0${seconds}`,
}));

vi.mock("@dnd-kit/react", () => ({
	DragDropProvider: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="drag-drop-provider">{children}</div>
	),
	KeyboardSensor: class KeyboardSensor {},
	PointerSensor: { configure: vi.fn(() => ({})) },
}));

vi.mock("@dnd-kit/react/sortable", () => ({
	useSortable: () => ({ ref: null, isDragging: false }),
}));

vi.mock("@dnd-kit/dom", () => ({
	PointerActivationConstraints: {
		Delay: class Delay {
			constructor(readonly config: Record<string, unknown>) {}
		},
		Distance: class Distance {
			constructor(readonly config: Record<string, unknown>) {}
		},
	},
}));

vi.mock("@dnd-kit/dom/modifiers", () => ({
	RestrictToWindow: {},
}));

vi.mock("@dnd-kit/helpers", () => ({
	arrayMove: <T,>(arr: T[]) => arr,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createFile(name: string): File {
	return new File(["content"], name, { type: "image/jpeg" });
}

const file1 = createFile("photo-1.jpg");
const file2 = createFile("photo-2.jpg");

const noopHandlers = {
	onRemove: vi.fn(),
	onConfirm: vi.fn(),
	onCancel: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("PendingUploadsGrid", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	describe("rendering", () => {
		it("ne rend rien quand la liste est vide", () => {
			const { container } = render(<PendingUploadsGrid files={[]} {...noopHandlers} />);

			expect(container.firstChild).toBeNull();
		});

		it("affiche le nombre de fichiers et le label du CTA", () => {
			render(<PendingUploadsGrid files={[file1, file2]} {...noopHandlers} />);

			expect(screen.getByText("2 fichiers en attente")).toBeTruthy();
			expect(screen.getByRole("button", { name: "Ajouter 2 fichiers" })).toBeTruthy();
		});
	});

	// -------------------------------------------------------------------------
	// P1-C — réorganisation clavier accessible
	// -------------------------------------------------------------------------
	describe("accessibilité drag clavier", () => {
		it("rend chaque item focusable et décrit quand onReorder est fourni", () => {
			render(<PendingUploadsGrid files={[file1, file2]} {...noopHandlers} onReorder={vi.fn()} />);

			// Les instructions clavier sont rendues et adressables
			expect(document.getElementById("pending-drag-instructions")).toBeInTheDocument();

			for (const label of ["Fichier 1", "Fichier 2"]) {
				const item = screen.getByRole("group", { name: label });
				expect(item).toHaveAttribute("tabindex", "0");
				expect(item).toHaveAttribute("aria-roledescription", "fichier réorganisable");
				expect(item).toHaveAttribute("aria-describedby", "pending-drag-instructions");
			}
		});

		it("ne rend aucun attribut de drag clavier quand onReorder est absent", () => {
			render(<PendingUploadsGrid files={[file1, file2]} {...noopHandlers} />);

			expect(document.getElementById("pending-drag-instructions")).toBeNull();
			expect(screen.queryByRole("group", { name: "Fichier 1" })).toBeNull();
			expect(screen.queryByRole("group", { name: "Fichier 2" })).toBeNull();
		});
	});
});
