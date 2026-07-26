import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("../polaroid-illustrations-map", () => ({
	POLAROID_ILLUSTRATIONS: {
		hands: () => <div data-testid="polaroid-illustration" data-scene="hands" />,
		materials: () => <div data-testid="polaroid-illustration" data-scene="materials" />,
		inspiration: () => <div data-testid="polaroid-illustration" data-scene="inspiration" />,
		workspace: () => <div data-testid="polaroid-illustration" data-scene="workspace" />,
	},
}));

vi.mock("@/shared/components/polaroid-frame", () => ({
	PolaroidFrame: ({ children, caption }: { children: React.ReactNode; caption: string }) => {
		return (
			<div data-testid="polaroid-frame" data-caption={caption}>
				{children}
			</div>
		);
	},
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
			name: "Galerie illustrée de l'atelier Synclune",
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

	it("renders the 4 illustrated scenes inside frames (one per polaroid id)", () => {
		render(<PolaroidGallery />);

		const illustrations = screen.getAllByTestId("polaroid-illustration");
		expect(illustrations).toHaveLength(4);

		const scenes = illustrations.map((el) => el.getAttribute("data-scene"));
		expect(scenes).toEqual(
			expect.arrayContaining(["hands", "materials", "inspiration", "workspace"]),
		);
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

	it("renders polaroids directly inside the grid without a Stagger wrapper", () => {
		render(<PolaroidGallery />);

		const frames = screen.getAllByTestId("polaroid-frame");
		const parent = frames[0]?.parentElement;
		expect(parent).not.toBeNull();
		// Grid container holds the 4 frames directly — no intermediary motion wrapper
		expect(parent?.children).toHaveLength(4);
		expect(parent?.className).toContain("grid");
		expect(parent?.className).toContain("min-[340px]:grid-cols-2");
		expect(parent?.className).toContain("lg:grid-cols-4");
	});
});
