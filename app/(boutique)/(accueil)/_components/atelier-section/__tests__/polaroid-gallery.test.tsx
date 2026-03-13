import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/animations", () => ({
	Reveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	Stagger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		section: {
			title: { duration: 0 },
			grid: { y: 0 },
		},
		stagger: { slow: 0 },
	},
}));

vi.mock("@/shared/components/placeholder-image", () => ({
	PlaceholderImage: ({ label, className }: { label: string; className?: string }) => (
		<div data-testid="placeholder-image" aria-label={label} className={className} />
	),
}));

vi.mock("@/shared/components/polaroid-frame", () => ({
	PolaroidFrame: ({
		children,
		caption,
	}: {
		children: React.ReactNode;
		caption: string;
		[key: string]: unknown;
	}) => (
		<div data-testid="polaroid-frame" data-caption={caption}>
			{children}
		</div>
	),
}));

vi.mock("../polaroid-doodles", () => ({
	PolaroidDoodles: () => <div data-testid="polaroid-doodles" />,
}));

// ---------------------------------------------------------------------------

afterEach(() => {
	cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PolaroidGallery", () => {
	let PolaroidGallery: React.ComponentType;

	beforeAll(async () => {
		({ PolaroidGallery } = await import("../polaroid-gallery"));
	});

	it("renders a region with correct aria-label", () => {
		render(<PolaroidGallery />);

		const region = screen.getByRole("region", {
			name: "Galerie photos de l'atelier Synclune",
		});
		expect(region).toBeInTheDocument();
	});

	it("renders PolaroidDoodles", () => {
		render(<PolaroidGallery />);

		expect(screen.getByTestId("polaroid-doodles")).toBeInTheDocument();
	});

	it("renders exactly 4 PolaroidFrame components", () => {
		render(<PolaroidGallery />);

		const frames = screen.getAllByTestId("polaroid-frame");
		expect(frames).toHaveLength(4);
	});

	it("renders 4 PlaceholderImage components inside frames", () => {
		render(<PolaroidGallery />);

		const images = screen.getAllByTestId("placeholder-image");
		expect(images).toHaveLength(4);
	});

	it("each polaroid has a descriptive label", () => {
		render(<PolaroidGallery />);

		const images = screen.getAllByTestId("placeholder-image");
		const labels = images.map((img) => img.getAttribute("aria-label"));

		expect(labels).toContain("Mains de Léane assemblant un bijou");
		expect(labels).toContain("Perles et matériaux colorés Synclune");
		expect(labels).toContain("Carnet d'inspiration de Léane, créatrice Synclune");
		expect(labels).toContain("Vue de l'atelier Synclune");
	});

	it("each polaroid frame has a caption", () => {
		render(<PolaroidGallery />);

		const frames = screen.getAllByTestId("polaroid-frame");
		const captions = frames.map((f) => f.getAttribute("data-caption"));

		expect(captions).toContain("Les mains dans les perles !");
		expect(captions).toContain("Mes petits trésors");
		expect(captions).toContain("L'inspiration du jour");
		expect(captions).toContain("Mon coin créatif");
	});
});
