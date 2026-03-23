import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/animations", () => ({
	Fade: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	HandDrawnUnderline: () => <div data-testid="underline" />,
	Reveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		section: {
			title: { y: 20, duration: 0.5 },
			subtitle: { y: 15, delay: 0.1, duration: 0.4 },
			carousel: { y: 20, delay: 0.2, duration: 0.5 },
			cta: { y: 10, delay: 0.1, duration: 0.4 },
		},
	},
}));

vi.mock("@/shared/components/section-title", () => ({
	SectionTitle: ({
		children,
		id,
	}: {
		children: React.ReactNode;
		id?: string;
		[key: string]: unknown;
	}) => <h2 id={id}>{children}</h2>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		...props
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[key: string]: unknown;
	}) => (asChild ? <>{children}</> : <button {...(props as object)}>{children}</button>),
}));

vi.mock("@/shared/components/ui/carousel", () => ({
	Carousel: ({
		children,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<div data-testid="carousel" aria-label={ariaLabel}>
			{children}
		</div>
	),
	CarouselContent: ({ children }: { children: React.ReactNode; [key: string]: unknown }) => (
		<div data-testid="carousel-content">{children}</div>
	),
	CarouselItem: ({ children }: { children: React.ReactNode; [key: string]: unknown }) => (
		<div data-testid="carousel-item">{children}</div>
	),
	CarouselDots: () => <div data-testid="carousel-dots" />,
	CarouselNext: ({
		"aria-label": ariaLabel,
	}: {
		"aria-label"?: string;
		[key: string]: unknown;
	}) => <button data-testid="carousel-next" aria-label={ariaLabel} />,
	CarouselPrevious: ({
		"aria-label": ariaLabel,
	}: {
		"aria-label"?: string;
		[key: string]: unknown;
	}) => <button data-testid="carousel-prev" aria-label={ariaLabel} />,
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}) => (
		<a href={href} {...(props as object)}>
			{children}
		</a>
	),
}));

vi.mock("lucide-react", () => ({
	Heart: (props: Record<string, unknown>) => (
		<svg data-testid="heart-icon" aria-hidden={props["aria-hidden"] as boolean} />
	),
}));

vi.mock("@/shared/constants/spacing", () => ({
	SECTION_SPACING: { section: "py-16" },
	CONTAINER_CLASS: "container",
}));

vi.mock("@/app/generated/prisma/client", () => ({
	CollectionStatus: { PUBLIC: "PUBLIC" },
}));

const mockGetCollections = vi.fn();

vi.mock("@/modules/collections/data/get-collections", () => ({
	getCollections: (...args: unknown[]) => mockGetCollections(...args),
}));

vi.mock("@/modules/collections/components/collection-card", () => ({
	CollectionCard: ({ name }: { name: string; [key: string]: unknown }) => (
		<div data-testid={`collection-card-${name}`}>CollectionCard</div>
	),
}));

vi.mock("@/modules/collections/utils/collection-images.utils", () => ({
	extractCollectionImages: vi.fn(() => [{ url: "/img.jpg", alt: "Alt" }]),
	extractPriceRange: vi.fn(() => ({ min: 10, max: 50 })),
}));

import { CollectionsSection } from "../collections-section";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const makeCollections = (count: number) =>
	Array.from({ length: count }, (_, i) => ({
		id: `c${i + 1}`,
		slug: `collection-${i + 1}`,
		name: `Collection ${i + 1}`,
		description: `Description ${i + 1}`,
		_count: { products: 3 },
		products: [{ media: [{ url: "/img.jpg" }], skus: [{ price: 2500 }] }],
	}));

const mockReturn = (collections: ReturnType<typeof makeCollections>) => ({
	collections,
	pagination: { nextCursor: null, prevCursor: null, hasNextPage: false, hasPreviousPage: false },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CollectionsSection", () => {
	it("renders section with correct id and aria attributes", async () => {
		mockGetCollections.mockResolvedValue(mockReturn(makeCollections(4)));
		render(await CollectionsSection());

		const section = document.getElementById("collections");
		expect(section).not.toBeNull();
		expect(section?.getAttribute("aria-labelledby")).toBe("collections-title");
		expect(section?.getAttribute("aria-describedby")).toBe("collections-subtitle");
	});

	it("renders h2 title 'Les dernières collections'", async () => {
		mockGetCollections.mockResolvedValue(mockReturn(makeCollections(4)));
		render(await CollectionsSection());

		const heading = screen.getByRole("heading", { level: 2 });
		expect(heading).toBeInTheDocument();
		expect(heading.id).toBe("collections-title");
		expect(heading.textContent).toContain("Les dernières collections");
	});

	it("renders subtitle with Heart icon", async () => {
		mockGetCollections.mockResolvedValue(mockReturn(makeCollections(4)));
		render(await CollectionsSection());

		const subtitle = document.getElementById("collections-subtitle");
		expect(subtitle).not.toBeNull();
		expect(subtitle?.textContent).toContain("Je rajoute une petite touche personnelle");
		expect(screen.getByTestId("heart-icon")).toBeInTheDocument();
	});

	it("returns null when collections array is empty", async () => {
		mockGetCollections.mockResolvedValue(mockReturn([]));
		const result = await CollectionsSection();

		expect(result).toBeNull();
	});

	it("renders correct number of CollectionCard components", async () => {
		const collections = makeCollections(4);
		mockGetCollections.mockResolvedValue(mockReturn(collections));
		render(await CollectionsSection());

		for (const collection of collections) {
			expect(screen.getByTestId(`collection-card-${collection.name}`)).toBeInTheDocument();
		}
	});

	it("skip link present and targets #collections-cta", async () => {
		mockGetCollections.mockResolvedValue(mockReturn(makeCollections(4)));
		render(await CollectionsSection());

		const skipLink = screen.getByText("Passer au bouton Explorer");
		expect(skipLink).toBeInTheDocument();
		expect(skipLink.getAttribute("href")).toBe("#collections-cta");
	});

	it("CTA links to /collections", async () => {
		mockGetCollections.mockResolvedValue(mockReturn(makeCollections(4)));
		render(await CollectionsSection());

		const ctaLink = screen.getByText("Explorer les collections");
		expect(ctaLink.closest("a")).toHaveAttribute("href", "/collections");
	});

	it("carousel has aria-label 'Carrousel de collections'", async () => {
		mockGetCollections.mockResolvedValue(mockReturn(makeCollections(4)));
		render(await CollectionsSection());

		const carousel = screen.getByTestId("carousel");
		expect(carousel.getAttribute("aria-label")).toBe("Carrousel de collections");
	});

	it("shows navigation arrows when >3 collections, hides when <=3", async () => {
		// With 4 collections — arrows should be visible
		mockGetCollections.mockResolvedValue(mockReturn(makeCollections(4)));
		const { unmount } = render(await CollectionsSection());

		expect(screen.getByTestId("carousel-prev")).toBeInTheDocument();
		expect(screen.getByTestId("carousel-next")).toBeInTheDocument();

		unmount();

		// With 3 collections — no arrows
		mockGetCollections.mockResolvedValue(mockReturn(makeCollections(3)));
		render(await CollectionsSection());

		expect(screen.queryByTestId("carousel-prev")).not.toBeInTheDocument();
		expect(screen.queryByTestId("carousel-next")).not.toBeInTheDocument();
	});
});
