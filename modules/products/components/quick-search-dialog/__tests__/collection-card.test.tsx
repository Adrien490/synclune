import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		onClick,
		...rest
	}: {
		children: React.ReactNode;
		href: string;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<a href={href} onClick={onClick} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string; [key: string]: unknown }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("@/shared/components/animations/tap", () => ({
	Tap: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/shared/utils/with-view-transition", () => ({
	withViewTransition: (cb: () => void) => cb(),
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { CollectionCard } from "../collection-card";
import type { QuickSearchCollection } from "../constants";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const collectionWithImage: QuickSearchCollection = {
	slug: "bagues",
	name: "Bagues",
	productCount: 12,
	image: { url: "/img/bagues.jpg", blurDataUrl: null },
};

const collectionWithoutImage: QuickSearchCollection = {
	slug: "colliers",
	name: "Colliers",
	productCount: 1,
	image: null,
};

afterEach(() => {
	cleanup();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CollectionCard", () => {
	let onSelect: () => void;

	beforeEach(() => {
		onSelect = vi.fn();
	});

	it("renders a link with the correct href", () => {
		const { container } = render(
			<CollectionCard collection={collectionWithImage} onSelect={onSelect} />,
		);
		expect(container.querySelector("a")).toHaveAttribute("href", "/collections/bagues");
	});

	it("calls onSelect when the link is clicked", async () => {
		const { container } = render(
			<CollectionCard collection={collectionWithImage} onSelect={onSelect} />,
		);
		await userEvent.click(container.querySelector("a")!);
		expect(onSelect).toHaveBeenCalledOnce();
	});

	describe("full variant (default)", () => {
		it("displays collection name in full variant", () => {
			render(<CollectionCard collection={collectionWithImage} onSelect={onSelect} />);
			expect(screen.getByText("Bagues")).toBeInTheDocument();
		});

		it("shows pluralized product count when count > 1", () => {
			render(<CollectionCard collection={collectionWithImage} onSelect={onSelect} />);
			expect(screen.getByText("12 produits")).toBeInTheDocument();
		});

		it("shows singular product count when count === 1", () => {
			render(<CollectionCard collection={collectionWithoutImage} onSelect={onSelect} />);
			expect(screen.getByText("1 produit")).toBeInTheDocument();
		});

		it("renders Image when collection has an image in full variant", () => {
			const { container } = render(
				<CollectionCard collection={collectionWithImage} onSelect={onSelect} />,
			);
			expect(container.querySelector("img")).toBeInTheDocument();
			expect(container.querySelector("img")).toHaveAttribute("src", "/img/bagues.jpg");
		});

		it("renders Layers icon fallback when collection has no image in full variant", () => {
			const { container } = render(
				<CollectionCard collection={collectionWithoutImage} onSelect={onSelect} />,
			);
			expect(container.querySelector("img")).not.toBeInTheDocument();
			expect(container.querySelector("svg")).toBeInTheDocument();
		});
	});

	describe("compact variant", () => {
		it("displays collection name in compact variant", () => {
			render(
				<CollectionCard collection={collectionWithImage} onSelect={onSelect} variant="compact" />,
			);
			expect(screen.getByText("Bagues")).toBeInTheDocument();
		});

		it("displays product count as number in compact variant", () => {
			render(
				<CollectionCard collection={collectionWithImage} onSelect={onSelect} variant="compact" />,
			);
			expect(screen.getByText("12")).toBeInTheDocument();
		});

		it("renders Image when collection has an image in compact variant", () => {
			const { container } = render(
				<CollectionCard collection={collectionWithImage} onSelect={onSelect} variant="compact" />,
			);
			expect(container.querySelector("img")).toBeInTheDocument();
		});

		it("renders Layers icon fallback when no image in compact variant", () => {
			const { container } = render(
				<CollectionCard
					collection={collectionWithoutImage}
					onSelect={onSelect}
					variant="compact"
				/>,
			);
			expect(container.querySelector("img")).not.toBeInTheDocument();
			expect(container.querySelector("svg")).toBeInTheDocument();
		});

		it("Layers icon has aria-hidden in compact variant without image", () => {
			const { container } = render(
				<CollectionCard
					collection={collectionWithoutImage}
					onSelect={onSelect}
					variant="compact"
				/>,
			);
			const svg = container.querySelector("svg");
			expect(svg).toHaveAttribute("aria-hidden", "true");
		});

		it("highlights query match in name via HighlightMatch in compact variant", () => {
			const { container } = render(
				<CollectionCard
					collection={collectionWithImage}
					onSelect={onSelect}
					variant="compact"
					query="bag"
				/>,
			);
			const marks = container.querySelectorAll("mark");
			expect(marks.length).toBeGreaterThanOrEqual(1);
		});

		it("does not render marks when no query provided in compact variant", () => {
			const { container } = render(
				<CollectionCard collection={collectionWithImage} onSelect={onSelect} variant="compact" />,
			);
			expect(container.querySelectorAll("mark")).toHaveLength(0);
		});

		it("applies justify-between in compact variant", () => {
			const { container } = render(
				<CollectionCard collection={collectionWithImage} onSelect={onSelect} variant="compact" />,
			);
			const link = container.querySelector("a");
			expect(link).toHaveClass("justify-between");
		});
	});

	it("link has focus-visible ring classes for accessibility", () => {
		const { container } = render(
			<CollectionCard collection={collectionWithImage} onSelect={onSelect} />,
		);
		const link = container.querySelector("a");
		expect(link).toHaveClass("focus-ring");
	});

	it("link is out of the Tab order (combobox option, reached via arrow keys)", () => {
		const { container } = render(
			<CollectionCard collection={collectionWithImage} onSelect={onSelect} />,
		);
		expect(container.querySelector("a")).toHaveAttribute("tabindex", "-1");
	});

	it("renders with the correct href for a different slug", () => {
		const { container } = render(
			<CollectionCard collection={collectionWithoutImage} onSelect={onSelect} />,
		);
		expect(container.querySelector("a")).toHaveAttribute("href", "/collections/colliers");
	});
});
