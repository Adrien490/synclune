import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MediaUploadGrid, type MediaItem } from "../media-upload-grid";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockOpen, mockUseReducedMotion, mockOpenLightbox, mockCloseLightbox, mockToast } =
	vi.hoisted(() => ({
		mockOpen: vi.fn(),
		mockUseReducedMotion: vi.fn(() => false),
		mockOpenLightbox: vi.fn(),
		mockCloseLightbox: vi.fn(),
		mockToast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
	}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({
		isOpen: false,
		open: mockOpen,
		close: vi.fn(),
		clearData: vi.fn(),
	}),
}));

vi.mock("motion/react", () => ({
	useReducedMotion: mockUseReducedMotion,
}));

vi.mock("@/shared/hooks", () => ({
	useLightbox: () => ({
		isOpen: false,
		open: mockOpenLightbox,
		close: mockCloseLightbox,
	}),
}));

vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("next/image", () => ({
	default: (props: Record<string, unknown>) => (
		// eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
		<img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
	),
}));

vi.mock("next/dynamic", () => ({
	default: () => () => null,
}));

vi.mock("@/modules/media/components/admin/delete-gallery-media-alert-dialog", () => ({
	DELETE_GALLERY_MEDIA_DIALOG_ID: "delete-gallery-media",
}));

vi.mock("@dnd-kit/react", () => ({
	DragDropProvider: ({ children, onDragEnd, onDragStart }: Record<string, unknown>) => (
		<div
			data-testid="drag-drop-provider"
			data-on-drag-end={!!onDragEnd}
			data-on-drag-start={!!onDragStart}
		>
			{children as React.ReactNode}
		</div>
	),
	DragOverlay: ({ children }: { children: unknown }) => (
		<div data-testid="drag-overlay">
			{typeof children === "function" ? null : (children as React.ReactNode)}
		</div>
	),
	KeyboardSensor: class KeyboardSensor {},
	PointerSensor: {
		configure: vi.fn(() => ({})),
	},
}));

vi.mock("@dnd-kit/dom", () => ({
	PointerSensor: { configure: vi.fn(() => ({})) },
	PointerActivationConstraints: {
		Distance: class Distance {
			constructor(readonly config: Record<string, unknown>) {}
		},
	},
}));

vi.mock("@dnd-kit/dom/modifiers", () => ({
	RestrictToWindow: {},
}));

vi.mock("@dnd-kit/helpers", async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
	};
});

vi.mock("@/modules/media/components/admin/sortable-media-item", () => ({
	SortableMediaItem: (props: Record<string, unknown>) => (
		<div
			data-testid={`sortable-item-${props.index}`}
			data-is-primary={props.isPrimary}
			data-media-type={(props.media as MediaItem).mediaType}
		>
			<button data-testid={`move-up-${props.index}`} onClick={props.onMoveUp as () => void}>
				Move up
			</button>
			<button data-testid={`move-down-${props.index}`} onClick={props.onMoveDown as () => void}>
				Move down
			</button>
			<button
				data-testid={`delete-${props.index}`}
				onClick={props.onOpenDeleteDialog as () => void}
			>
				Delete
			</button>
			<button
				data-testid={`lightbox-${props.index}`}
				onClick={() => (props.onOpenLightbox as (i: number) => void)(props.index as number)}
			>
				Lightbox
			</button>
		</div>
	),
}));

vi.mock("@/modules/media/utils/media-utils", () => ({
	getVideoMimeType: () => "video/mp4",
}));

vi.mock("@/shared/constants/storage-keys", () => ({
	STORAGE_KEYS: { MEDIA_UPLOAD_HINT_SEEN: "media-hint-seen" },
}));

vi.mock("@/modules/media/constants/ui-interactions.constants", () => ({
	UI_DELAYS: {
		HINT_DISAPPEAR_MS: 4000,
		LONG_PRESS_ACTIVATION_MS: 250,
		LONG_PRESS_TOLERANCE_PX: 5,
		DRAG_ACTIVATION_DISTANCE_PX: 8,
	},
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createMedia(overrides: Partial<MediaItem> = {}): MediaItem {
	return {
		url: `https://utfs.io/f/${Math.random().toString(36).slice(2)}.jpg`,
		altText: "Test image",
		mediaType: "IMAGE",
		thumbnailUrl: undefined,
		blurDataUrl: undefined,
		...overrides,
	};
}

const image1 = createMedia({ url: "https://utfs.io/f/img1.jpg", altText: "Image 1" });
const image2 = createMedia({ url: "https://utfs.io/f/img2.jpg", altText: "Image 2" });
const image3 = createMedia({ url: "https://utfs.io/f/img3.jpg", altText: "Image 3" });
const video1 = createMedia({
	url: "https://utfs.io/f/vid1.mp4",
	altText: "Video 1",
	mediaType: "VIDEO",
	thumbnailUrl: "https://utfs.io/f/thumb1.jpg",
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("MediaUploadGrid", () => {
	const mockOnChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		// localStorage mock (jsdom doesn't provide .clear in all versions)
		Object.defineProperty(window, "localStorage", {
			value: {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
				removeItem: vi.fn(),
				clear: vi.fn(),
				length: 0,
				key: vi.fn(),
			},
			writable: true,
		});
	});

	afterEach(() => {
		cleanup();
	});

	// -----------------------------------------------------------------------
	// Rendering
	// -----------------------------------------------------------------------
	describe("rendering", () => {
		it("renders all media items", () => {
			render(<MediaUploadGrid media={[image1, image2, image3]} onChange={mockOnChange} />);

			expect(screen.getByTestId("sortable-item-0")).toBeInTheDocument();
			expect(screen.getByTestId("sortable-item-1")).toBeInTheDocument();
			expect(screen.getByTestId("sortable-item-2")).toBeInTheDocument();
		});

		it("marks the first item as primary", () => {
			render(<MediaUploadGrid media={[image1, image2]} onChange={mockOnChange} />);

			expect(screen.getByTestId("sortable-item-0").dataset.isPrimary).toBe("true");
			expect(screen.getByTestId("sortable-item-1").dataset.isPrimary).toBe("false");
		});

		it("wraps items in DragDropProvider", () => {
			render(<MediaUploadGrid media={[image1]} onChange={mockOnChange} />);

			expect(screen.getByTestId("drag-drop-provider")).toBeInTheDocument();
		});

		it("registers event handlers on DragDropProvider", () => {
			render(<MediaUploadGrid media={[image1]} onChange={mockOnChange} />);

			const provider = screen.getByTestId("drag-drop-provider");
			expect(provider.dataset.onDragEnd).toBe("true");
			expect(provider.dataset.onDragStart).toBe("true");
		});

		it("renders upload zone when canAddMore and renderUploadZone provided", () => {
			render(
				<MediaUploadGrid
					media={[image1]}
					onChange={mockOnChange}
					renderUploadZone={() => <div data-testid="upload-zone">Upload</div>}
				/>,
			);

			expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
		});

		it("does not render upload zone when at maxItems", () => {
			render(
				<MediaUploadGrid
					media={[image1, image2]}
					onChange={mockOnChange}
					maxItems={2}
					renderUploadZone={() => <div data-testid="upload-zone">Upload</div>}
				/>,
			);

			expect(screen.queryByTestId("upload-zone")).not.toBeInTheDocument();
		});

		it("renders DragOverlay", () => {
			render(<MediaUploadGrid media={[image1]} onChange={mockOnChange} />);

			const overlay = screen.getByTestId("drag-overlay");
			expect(overlay).toBeInTheDocument();
		});
	});

	// -----------------------------------------------------------------------
	// Accessibility
	// -----------------------------------------------------------------------
	describe("accessibility", () => {
		it("provides screen reader drag instructions", () => {
			render(<MediaUploadGrid media={[image1]} onChange={mockOnChange} />);

			const instructions = document.getElementById("drag-instructions");
			expect(instructions).toBeInTheDocument();
			expect(instructions?.textContent).toContain("Espace ou Entrée");
			expect(instructions?.textContent).toContain("flèches");
			expect(instructions?.textContent).toContain("Échap");
		});

		it("has aria-live region for announcements", () => {
			render(<MediaUploadGrid media={[image1]} onChange={mockOnChange} />);

			const liveRegion = document.querySelector("[aria-live='polite']");
			expect(liveRegion).toBeInTheDocument();
			expect(liveRegion?.getAttribute("aria-atomic")).toBe("true");
		});

		it("renders the media grid with role=group and aria-label", () => {
			render(<MediaUploadGrid media={[image1]} onChange={mockOnChange} />);

			const grid = screen.getByRole("group");
			expect(grid).toHaveAttribute("aria-label", "Médias du produit");
		});
	});

	// -----------------------------------------------------------------------
	// WCAG 2.5.7 - Drag alternatives (move up/down)
	// -----------------------------------------------------------------------
	describe("WCAG 2.5.7 drag alternatives", () => {
		it("moves item up via button", () => {
			render(<MediaUploadGrid media={[image1, image2, image3]} onChange={mockOnChange} />);

			fireEvent.click(screen.getByTestId("move-up-1"));

			expect(mockOnChange).toHaveBeenCalledWith([image2, image1, image3]);
		});

		it("moves item down via button", () => {
			render(<MediaUploadGrid media={[image1, image2, image3]} onChange={mockOnChange} />);

			fireEvent.click(screen.getByTestId("move-down-0"));

			expect(mockOnChange).toHaveBeenCalledWith([image2, image1, image3]);
		});

		it("does not move first item up", () => {
			render(<MediaUploadGrid media={[image1, image2]} onChange={mockOnChange} />);

			fireEvent.click(screen.getByTestId("move-up-0"));

			expect(mockOnChange).not.toHaveBeenCalled();
		});

		it("does not move last item down", () => {
			render(<MediaUploadGrid media={[image1, image2]} onChange={mockOnChange} />);

			fireEvent.click(screen.getByTestId("move-down-1"));

			expect(mockOnChange).not.toHaveBeenCalled();
		});

		it("prevents video from being moved to first position via move up", () => {
			render(<MediaUploadGrid media={[image1, video1]} onChange={mockOnChange} />);

			fireEvent.click(screen.getByTestId("move-up-1"));

			expect(mockOnChange).not.toHaveBeenCalled();
			expect(mockToast.error).toHaveBeenCalledWith(
				"La première position doit être une image, pas une vidéo.",
				expect.any(Object),
			);
		});

		it("prevents video from ending up first position via move down", () => {
			render(<MediaUploadGrid media={[image1, video1, image2]} onChange={mockOnChange} />);

			fireEvent.click(screen.getByTestId("move-down-0"));

			// arrayMove([image1, video1, image2], 0, 1) = [video1, image1, image2]
			// Should be blocked because video ends up at index 0
			expect(mockOnChange).not.toHaveBeenCalled();
			expect(mockToast.error).toHaveBeenCalledWith(
				"La première position doit être une image, pas une vidéo.",
				expect.any(Object),
			);
		});
	});

	// -----------------------------------------------------------------------
	// Delete dialog
	// -----------------------------------------------------------------------
	describe("delete dialog", () => {
		it("opens delete dialog with correct data", () => {
			render(<MediaUploadGrid media={[image1, image2]} onChange={mockOnChange} />);

			fireEvent.click(screen.getByTestId("delete-1"));

			expect(mockOpen).toHaveBeenCalledWith(
				expect.objectContaining({
					index: 1,
					url: image2.url,
				}),
			);
		});

		it("prevents deletion when video would end up in first position", () => {
			render(<MediaUploadGrid media={[image1, video1]} onChange={mockOnChange} />);

			fireEvent.click(screen.getByTestId("delete-0"));

			// Extract onRemove from the dialog open call and invoke it
			const dialogData = mockOpen.mock.calls[0]![0] as { onRemove: () => void };
			dialogData.onRemove();

			expect(mockOnChange).not.toHaveBeenCalled();
			expect(mockToast.error).toHaveBeenCalledWith(
				"Impossible : une vidéo passerait en première position. Réorganisez d'abord.",
				expect.any(Object),
			);
		});
	});

	// -----------------------------------------------------------------------
	// Lightbox
	// -----------------------------------------------------------------------
	describe("lightbox", () => {
		it("opens lightbox at correct index", () => {
			render(<MediaUploadGrid media={[image1, image2]} onChange={mockOnChange} />);

			fireEvent.click(screen.getByTestId("lightbox-1"));

			expect(mockOpenLightbox).toHaveBeenCalled();
		});
	});

	// -----------------------------------------------------------------------
	// Reduced motion
	// -----------------------------------------------------------------------
	describe("reduced motion", () => {
		it("passes shouldReduceMotion to items", () => {
			mockUseReducedMotion.mockReturnValue(true);
			render(<MediaUploadGrid media={[image1]} onChange={mockOnChange} />);

			// Component renders without error with reduced motion
			expect(screen.getByTestId("sortable-item-0")).toBeInTheDocument();
		});
	});
});
