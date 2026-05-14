import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SortableMediaItem, type SortableMediaItemProps } from "../sortable-media-item";
import type { MediaItem } from "@/modules/media/types/hooks.types";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockUseSortable, mockUseIsTouchDevice } = vi.hoisted(() => ({
	mockUseSortable: vi.fn(() => ({
		ref: vi.fn(),
		handleRef: vi.fn(),
		isDragSource: false,
	})),
	mockUseIsTouchDevice: vi.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("@dnd-kit/react/sortable", () => ({
	useSortable: mockUseSortable,
}));

vi.mock("@/shared/hooks/use-touch-device", () => ({
	useIsTouchDevice: mockUseIsTouchDevice,
}));

vi.mock("next/image", () => ({
	default: (props: Record<string, unknown>) => (
		// eslint-disable-next-line @next/next/no-img-element, jsx-a11y/no-noninteractive-element-interactions
		<img
			src={props.src as string}
			alt={props.alt as string}
			data-testid="next-image"
			onLoad={props.onLoad as () => void}
		/>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, ...props }: Record<string, unknown>) => (
		<button {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
			{children as React.ReactNode}
		</button>
	),
}));

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="drawer">{children}</div>
	),
	DrawerContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="drawer-content">{children}</div>
	),
	DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	DrawerTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	DrawerClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipContent: ({ children }: { children: React.ReactNode }) => (
		<span>{children as React.ReactNode}</span>
	),
	TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// EditAltTextDialog depends on ResponsiveDialog + dialog/drawer providers; stub for unit-test isolation.
vi.mock("@/modules/media/components/admin/edit-alt-text-dialog", () => ({
	EditAltTextDialog: ({ open }: { open: boolean }) =>
		open ? <div data-testid="edit-alt-text-dialog" /> : null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const imageMedia: MediaItem = {
	url: "https://utfs.io/f/img1.jpg",
	altText: "Test image",
	mediaType: "IMAGE",
	thumbnailUrl: undefined,
	blurDataUrl: undefined,
};

const videoMedia: MediaItem = {
	url: "https://utfs.io/f/vid1.mp4",
	altText: "Test video",
	mediaType: "VIDEO",
	thumbnailUrl: "https://utfs.io/f/thumb1.jpg",
	blurDataUrl: undefined,
};

const videoNoThumb: MediaItem = {
	url: "https://utfs.io/f/vid2.mp4",
	altText: "Video no thumb",
	mediaType: "VIDEO",
	thumbnailUrl: undefined,
	blurDataUrl: undefined,
};

function renderItem(overrides: Partial<SortableMediaItemProps> = {}) {
	const defaultProps: SortableMediaItemProps = {
		media: imageMedia,
		index: 0,
		isPrimary: false,
		isImageLoaded: true,
		shouldReduceMotion: false,
		isDraggingAny: false,
		onImageLoaded: vi.fn(),
		onOpenLightbox: vi.fn(),
		onOpenDeleteDialog: vi.fn(),
		onMoveUp: vi.fn(),
		onMoveDown: vi.fn(),
		totalCount: 3,
		...overrides,
	};
	return render(<SortableMediaItem {...defaultProps} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SortableMediaItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseSortable.mockReturnValue({
			ref: vi.fn(),
			handleRef: vi.fn(),
			isDragSource: false,
		});
		mockUseIsTouchDevice.mockReturnValue(false);
	});

	afterEach(() => {
		cleanup();
	});

	// -----------------------------------------------------------------------
	// Rendering
	// -----------------------------------------------------------------------
	describe("rendering", () => {
		it("renders an image item", () => {
			renderItem();

			const img = screen.getAllByTestId("next-image")[0];
			expect(img).toHaveAttribute("src", imageMedia.url);
			expect(img).toHaveAttribute("alt", "Test image");
		});

		it("renders a video item with thumbnail", () => {
			renderItem({ media: videoMedia });

			const img = screen.getAllByTestId("next-image")[0];
			expect(img).toHaveAttribute("src", videoMedia.thumbnailUrl);
		});

		it("renders a video item without thumbnail as <video>", () => {
			renderItem({ media: videoNoThumb });

			const video = document.querySelector("video");
			expect(video).toBeInTheDocument();
			expect(video).toHaveAttribute("src", videoNoThumb.url);
		});

		it("shows primary badge when isPrimary", () => {
			renderItem({ isPrimary: true });

			expect(screen.getByText("Principal")).toBeInTheDocument();
		});

		it("does not show primary badge when not primary", () => {
			renderItem({ isPrimary: false });

			expect(screen.queryByText("Principal")).not.toBeInTheDocument();
		});

		it("shows skeleton when image not loaded", () => {
			const { container } = renderItem({ isImageLoaded: false });

			const skeleton = container.querySelector("[class*='animate-pulse']");
			expect(skeleton).toBeInTheDocument();
		});

		it("does not show skeleton when image loaded", () => {
			const { container } = renderItem({ isImageLoaded: true });

			const skeleton = container.querySelector("[class*='animate-pulse']");
			expect(skeleton).not.toBeInTheDocument();
		});
	});

	// -----------------------------------------------------------------------
	// useSortable integration
	// -----------------------------------------------------------------------
	describe("useSortable", () => {
		it("passes media.url and index as sortable id and index", () => {
			renderItem({ index: 2 });

			expect(mockUseSortable).toHaveBeenCalledWith(
				expect.objectContaining({ id: imageMedia.url, index: 2 }),
			);
		});

		it("applies reduced opacity when isDragSource", () => {
			mockUseSortable.mockReturnValue({
				ref: vi.fn(),
				handleRef: vi.fn(),
				isDragSource: true,
			});

			const { container } = renderItem();

			expect(container.firstElementChild).toHaveClass("opacity-30");
		});

		it("passes null transition when shouldReduceMotion is true", () => {
			renderItem({ shouldReduceMotion: true });

			expect(mockUseSortable).toHaveBeenCalledWith(expect.objectContaining({ transition: null }));
		});

		it("passes transition config when shouldReduceMotion is false", () => {
			renderItem({ shouldReduceMotion: false });

			expect(mockUseSortable).toHaveBeenCalledWith(
				expect.objectContaining({
					transition: { duration: 200, easing: "ease" },
				}),
			);
		});
	});

	// -----------------------------------------------------------------------
	// Accessibility
	// -----------------------------------------------------------------------
	describe("accessibility", () => {
		it("has aria-label with image type and position", () => {
			renderItem({ index: 2 });

			expect(screen.getByRole("group")).toHaveAttribute("aria-label", "Image 3");
		});

		it("has aria-label with video type", () => {
			renderItem({ media: videoMedia, index: 0 });

			expect(screen.getByRole("group")).toHaveAttribute("aria-label", "Vidéo 1");
		});

		it("includes (principale) in label when primary", () => {
			renderItem({ isPrimary: true, index: 0 });

			expect(screen.getByRole("group")).toHaveAttribute("aria-label", "Image 1 (principale)");
		});

		it("drag handle has aria-label", () => {
			renderItem({ index: 1 });

			const handle = screen.getByLabelText("Réorganiser l'image 2");
			expect(handle).toBeInTheDocument();
		});

		it("drag handle has aria-describedby referencing instructions", () => {
			renderItem();

			const handle = screen.getByLabelText(/Réorganiser/);
			expect(handle).toHaveAttribute("aria-describedby", "drag-instructions");
		});

		it("drag handle uses cursor-grab class", () => {
			renderItem();

			const handle = screen.getByLabelText(/Réorganiser/);
			expect(handle).toHaveClass("cursor-grab");
		});
	});

	// -----------------------------------------------------------------------
	// Keyboard
	// -----------------------------------------------------------------------
	describe("keyboard interactions", () => {
		it("calls onOpenDeleteDialog on Delete key", () => {
			const onDelete = vi.fn();
			renderItem({ onOpenDeleteDialog: onDelete });

			fireEvent.keyDown(screen.getByRole("group"), { key: "Delete" });

			expect(onDelete).toHaveBeenCalledOnce();
		});

		it("calls onOpenDeleteDialog on Backspace key", () => {
			const onDelete = vi.fn();
			renderItem({ onOpenDeleteDialog: onDelete });

			fireEvent.keyDown(screen.getByRole("group"), { key: "Backspace" });

			expect(onDelete).toHaveBeenCalledOnce();
		});

		it("does not call onOpenDeleteDialog on other keys", () => {
			const onDelete = vi.fn();
			renderItem({ onOpenDeleteDialog: onDelete });

			fireEvent.keyDown(screen.getByRole("group"), { key: "Enter" });

			expect(onDelete).not.toHaveBeenCalled();
		});
	});

	// -----------------------------------------------------------------------
	// WCAG 2.5.7 drag alternatives — reorder options live in the touch-device drawer
	// -----------------------------------------------------------------------
	describe("WCAG 2.5.7 drag alternatives", () => {
		beforeEach(() => {
			mockUseIsTouchDevice.mockReturnValue(true);
		});

		it("renders move up option when canMoveUp", () => {
			renderItem({ index: 1, totalCount: 3 });

			expect(screen.getByText("Déplacer vers le haut")).toBeInTheDocument();
		});

		it("renders move down option when canMoveDown", () => {
			renderItem({ index: 0, totalCount: 3 });

			expect(screen.getByText("Déplacer vers le bas")).toBeInTheDocument();
		});

		it("does not render move up for first item", () => {
			renderItem({ index: 0, totalCount: 3 });

			expect(screen.queryByText("Déplacer vers le haut")).not.toBeInTheDocument();
		});

		it("does not render move down for last item", () => {
			renderItem({ index: 2, totalCount: 3 });

			expect(screen.queryByText("Déplacer vers le bas")).not.toBeInTheDocument();
		});
	});

	// -----------------------------------------------------------------------
	// Hydration safety — both desktop & mobile controls must be in the DOM
	// regardless of useIsTouchDevice (CSS chooses via @media can-hover)
	// -----------------------------------------------------------------------
	describe("hydration safety (CSS can-hover variant)", () => {
		it("renders mobile drawer trigger AND desktop drag handle when isTouchDevice is false (SSR-like)", () => {
			mockUseIsTouchDevice.mockReturnValue(false);
			renderItem();

			expect(screen.getByLabelText(/Actions pour le média/)).toBeInTheDocument();
			expect(screen.getByLabelText(/Réorganiser/)).toBeInTheDocument();
		});

		it("renders mobile drawer trigger AND desktop drag handle when isTouchDevice is true", () => {
			mockUseIsTouchDevice.mockReturnValue(true);
			renderItem();

			expect(screen.getByLabelText(/Actions pour le média/)).toBeInTheDocument();
			expect(screen.getByLabelText(/Réorganiser/)).toBeInTheDocument();
		});

		it("no longer renders the legacy long-press hint", () => {
			mockUseIsTouchDevice.mockReturnValue(true);
			renderItem();

			expect(screen.queryByText("Maintenez pour réordonner")).not.toBeInTheDocument();
		});
	});

	// -----------------------------------------------------------------------
	// Set-as-primary — Star outline button (inline) + drawer entry
	// -----------------------------------------------------------------------
	describe("set-as-primary", () => {
		it("renders inline Star button when !isPrimary && onSetAsPrimary provided", () => {
			renderItem({ index: 1, onSetAsPrimary: vi.fn() });

			expect(screen.getByLabelText(/Définir l'image 2 comme principale/)).toBeInTheDocument();
		});

		it("does not render inline Star button when isPrimary", () => {
			renderItem({ isPrimary: true, index: 0, onSetAsPrimary: vi.fn() });

			expect(screen.queryByLabelText(/Définir .* comme principale/)).not.toBeInTheDocument();
		});

		it("does not render inline Star button when onSetAsPrimary is undefined (video case)", () => {
			renderItem({ index: 1, media: videoMedia, onSetAsPrimary: undefined });

			expect(screen.queryByLabelText(/Définir .* comme principale/)).not.toBeInTheDocument();
		});

		it("calls onSetAsPrimary on inline Star click and stops propagation (no lightbox)", () => {
			const onSetAsPrimary = vi.fn();
			const onLightbox = vi.fn();
			renderItem({ index: 1, onSetAsPrimary, onOpenLightbox: onLightbox });

			fireEvent.click(screen.getByLabelText(/Définir l'image 2 comme principale/));

			expect(onSetAsPrimary).toHaveBeenCalledOnce();
			expect(onLightbox).not.toHaveBeenCalled();
		});

		it("renders 'Définir comme principale' in drawer when eligible", () => {
			renderItem({ index: 1, onSetAsPrimary: vi.fn() });

			expect(screen.getByText("Définir comme principale")).toBeInTheDocument();
		});

		it("does not render drawer entry when isPrimary", () => {
			renderItem({ isPrimary: true, index: 0, onSetAsPrimary: vi.fn() });

			expect(screen.queryByText("Définir comme principale")).not.toBeInTheDocument();
		});

		it("calls onSetAsPrimary when drawer entry clicked", () => {
			const onSetAsPrimary = vi.fn();
			renderItem({ index: 1, onSetAsPrimary });

			fireEvent.click(screen.getByText("Définir comme principale"));

			expect(onSetAsPrimary).toHaveBeenCalledOnce();
		});

		it("inline Star button is size-11 (WCAG 2.5.5 44px touch target)", () => {
			renderItem({ index: 1, onSetAsPrimary: vi.fn() });

			const starBtn = screen.getByLabelText(/Définir l'image 2 comme principale/);
			expect(starBtn).toHaveClass("size-11");
		});
	});

	// -----------------------------------------------------------------------
	// Edit alt text — drawer entry, desktop button, dialog trigger
	// -----------------------------------------------------------------------
	describe("edit alt text", () => {
		it("renders drawer entry button when onUpdateAltText is provided", () => {
			renderItem({ onUpdateAltText: vi.fn() });

			// Drawer button accessible name = visible text (no aria-label) → exact match
			expect(screen.getByRole("button", { name: "Modifier la description" })).toBeInTheDocument();
		});

		it("does not render drawer entry when onUpdateAltText is undefined", () => {
			renderItem({ onUpdateAltText: undefined });

			expect(
				screen.queryByRole("button", { name: "Modifier la description" }),
			).not.toBeInTheDocument();
		});

		it("renders desktop FileText button when onUpdateAltText is provided", () => {
			renderItem({ onUpdateAltText: vi.fn() });

			expect(screen.getByLabelText(/Modifier la description du média/)).toBeInTheDocument();
		});

		it("opens the EditAltTextDialog when desktop edit button is clicked", () => {
			renderItem({ onUpdateAltText: vi.fn() });

			expect(screen.queryByTestId("edit-alt-text-dialog")).not.toBeInTheDocument();

			fireEvent.click(screen.getByLabelText(/Modifier la description du média/));

			expect(screen.getByTestId("edit-alt-text-dialog")).toBeInTheDocument();
		});

		it("opens the EditAltTextDialog when drawer entry is clicked", () => {
			renderItem({ onUpdateAltText: vi.fn() });

			fireEvent.click(screen.getByRole("button", { name: "Modifier la description" }));

			expect(screen.getByTestId("edit-alt-text-dialog")).toBeInTheDocument();
		});
	});

	// -----------------------------------------------------------------------
	// Accessibility — sortable item semantics + saturation reduction
	// -----------------------------------------------------------------------
	describe("a11y polish", () => {
		it("has aria-roledescription='élément réorganisable'", () => {
			renderItem();

			expect(screen.getByRole("group")).toHaveAttribute(
				"aria-roledescription",
				"élément réorganisable",
			);
		});

		it("hides the permanent GripVertical hint on the primary image (saturation reduction)", () => {
			const { container, rerender } = renderItem({ isPrimary: true, index: 0 });

			// Mobile GripVertical (size-3.5) should not exist on primary
			const gripIcons = container.querySelectorAll(".lucide-grip-vertical");
			// Desktop drag handle still present (size-5), so we check by container:
			// the permanent indicator div has class "opacity-40"
			expect(container.querySelector(".opacity-40")).not.toBeInTheDocument();

			rerender(
				<SortableMediaItem
					media={imageMedia}
					index={1}
					isPrimary={false}
					isImageLoaded={true}
					shouldReduceMotion={false}
					isDraggingAny={false}
					onImageLoaded={vi.fn()}
					onOpenLightbox={vi.fn()}
					onOpenDeleteDialog={vi.fn()}
					totalCount={3}
				/>,
			);
			expect(container.querySelector(".opacity-40")).toBeInTheDocument();
			// silence the unused var lint:
			expect(gripIcons.length).toBeGreaterThanOrEqual(0);
		});
	});

	// -----------------------------------------------------------------------
	// Actions
	// -----------------------------------------------------------------------
	describe("actions", () => {
		it("calls onOpenLightbox when expand button clicked", () => {
			const onLightbox = vi.fn();
			renderItem({ onOpenLightbox: onLightbox, index: 2 });

			const expandBtn = screen.getByLabelText("Agrandir le média 3");
			fireEvent.click(expandBtn);

			expect(onLightbox).toHaveBeenCalledWith(2);
		});

		it("calls onOpenDeleteDialog when delete button clicked", () => {
			const onDelete = vi.fn();
			renderItem({ onOpenDeleteDialog: onDelete });

			const deleteBtn = screen.getByLabelText("Supprimer le média 1");
			fireEvent.click(deleteBtn);

			expect(onDelete).toHaveBeenCalledOnce();
		});

		it("video play button opens lightbox", () => {
			const onLightbox = vi.fn();
			renderItem({ media: videoMedia, index: 1, onOpenLightbox: onLightbox });

			const playBtn = screen.getByLabelText("Lire la vidéo 2");
			fireEvent.click(playBtn);

			expect(onLightbox).toHaveBeenCalledWith(1);
		});
	});
});
