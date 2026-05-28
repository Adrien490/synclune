import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenDeleteDialog } = vi.hoisted(() => ({
	mockOpenDeleteDialog: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: mockOpenDeleteDialog }),
}));

vi.mock("@/modules/media/components/admin/delete-primary-image-alert-dialog", () => ({
	DELETE_PRIMARY_IMAGE_DIALOG_ID: "delete-primary-image",
}));

vi.mock("@/modules/media/utils/media-type-detection", () => ({
	isVideoUrl: (url: string) => url.endsWith(".mp4") || url.endsWith(".webm"),
}));

vi.mock("@/modules/media/components/media-error-fallback", () => ({
	MediaErrorFallback: ({ type, onRetry }: { type: string; onRetry?: () => void }) => (
		<div data-testid="media-error-fallback" data-type={type}>
			{onRetry && <button onClick={onRetry}>retry</button>}
		</div>
	),
}));

vi.mock("motion/react", () => ({
	m: {
		div: ({
			children,
			className,
		}: {
			children: React.ReactNode;
			className?: string;
			[key: string]: unknown;
		}) => <div className={className}>{children}</div>,
	},
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} data-testid="product-image" />
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		"aria-label": ariaLabel,
		type,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		"aria-label"?: string;
		type?: string;
		variant?: string;
		size?: string;
		className?: string;
	}) => (
		<button onClick={onClick} aria-label={ariaLabel} type={type as "button" | "submit" | "reset"}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/media-type-badge", () => ({
	MediaTypeBadge: ({ type }: { type: string; size?: string }) => (
		<span data-testid="media-type-badge" data-type={type} />
	),
}));

vi.mock("lucide-react", () => ({
	Trash2: ({ className }: { className?: string }) => (
		<svg data-testid="icon-trash" className={className} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { PrimaryImageUpload } from "../primary-image-upload";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("PrimaryImageUpload", () => {
	const defaultProps = {
		onRemove: vi.fn(),
		renderUploadZone: () => <div data-testid="upload-zone">Upload Zone</div>,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── No image ─────────────────────────────────────────────────────────────

	it("renders upload zone when no imageUrl provided", () => {
		render(<PrimaryImageUpload {...defaultProps} />);
		expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
	});

	it("does not render image when no imageUrl", () => {
		render(<PrimaryImageUpload {...defaultProps} />);
		expect(screen.queryByTestId("product-image")).not.toBeInTheDocument();
	});

	// ─── With image ───────────────────────────────────────────────────────────

	it("renders image preview when imageUrl provided", () => {
		render(
			<PrimaryImageUpload
				{...defaultProps}
				imageUrl="https://utfs.io/f/img.jpg"
				mediaType="IMAGE"
			/>,
		);
		expect(screen.getByTestId("product-image")).toBeInTheDocument();
	});

	it("renders 'Principal' badge when image is displayed", () => {
		render(
			<PrimaryImageUpload
				{...defaultProps}
				imageUrl="https://utfs.io/f/img.jpg"
				mediaType="IMAGE"
			/>,
		);
		expect(screen.getByText("Principal")).toBeInTheDocument();
	});

	it("renders delete button with aria-label", () => {
		render(
			<PrimaryImageUpload
				{...defaultProps}
				imageUrl="https://utfs.io/f/img.jpg"
				mediaType="IMAGE"
			/>,
		);
		expect(
			screen.getByRole("button", { name: /Supprimer le média principal/i }),
		).toBeInTheDocument();
	});

	it("opens delete dialog when delete button clicked", async () => {
		render(
			<PrimaryImageUpload
				{...defaultProps}
				imageUrl="https://utfs.io/f/img.jpg"
				mediaType="IMAGE"
			/>,
		);
		await userEvent.click(screen.getByRole("button", { name: /Supprimer le média principal/i }));
		expect(mockOpenDeleteDialog).toHaveBeenCalledOnce();
	});

	// ─── With video ───────────────────────────────────────────────────────────

	it("renders video element for VIDEO mediaType", () => {
		const { container } = render(
			<PrimaryImageUpload
				{...defaultProps}
				imageUrl="https://utfs.io/f/video.mp4"
				mediaType="VIDEO"
			/>,
		);
		expect(container.querySelector("video")).toBeInTheDocument();
	});

	it("renders VIDEO badge for video media", () => {
		render(
			<PrimaryImageUpload
				{...defaultProps}
				imageUrl="https://utfs.io/f/video.mp4"
				mediaType="VIDEO"
			/>,
		);
		expect(screen.getByTestId("media-type-badge")).toHaveAttribute("data-type", "VIDEO");
	});

	// ─── Auto-detect media type ───────────────────────────────────────────────

	it("auto-detects VIDEO type from URL", () => {
		const { container } = render(
			<PrimaryImageUpload {...defaultProps} imageUrl="https://utfs.io/f/video.mp4" />,
		);
		expect(container.querySelector("video")).toBeInTheDocument();
	});

	it("auto-detects IMAGE type from URL", () => {
		render(<PrimaryImageUpload {...defaultProps} imageUrl="https://utfs.io/f/photo.jpg" />);
		expect(screen.getByTestId("product-image")).toBeInTheDocument();
	});

	// ─── @regression upload-media-audit-2026-05-28-video-retry-remount ────────
	// Le retry vidéo de MediaErrorFallback appelait `videoRef.current?.load()`
	// — mais videoRef est null quand l'erreur est affichée (le <video> est
	// démonté). Le fix attache `key={videoRetryCount}` au <video> et incrémente
	// le compteur sur retry pour forcer un remount React (vide le cache d'erreur
	// du navigateur). Test JSDOM impossible (l'event "error" du <video> n'est
	// pas honoré par jsdom) — le fix est verrouillé par lecture du fichier.
	describe("regression: video retry forces a fresh mount", () => {
		it("primary-image-upload source contains key={videoRetryCount} on the <video>", async () => {
			const [{ readFile }, { resolve }] = await Promise.all([
				import("node:fs/promises"),
				import("node:path"),
			]);
			const source = await readFile(
				resolve(process.cwd(), "modules/media/components/admin/primary-image-upload.tsx"),
				"utf-8",
			);
			expect(source).toContain("key={videoRetryCount}");
			expect(source).toContain("setVideoRetryCount((n) => n + 1)");
		});
	});
});
