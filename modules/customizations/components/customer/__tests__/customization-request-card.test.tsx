import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		...props
	}: {
		src: string;
		alt: string;
		[key: string]: unknown;
		// eslint-disable-next-line @next/next/no-img-element
	}) => <img src={src} alt={alt} {...props} />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { CustomizationRequestCard } from "../customization-request-card";

afterEach(cleanup);

// ============================================================================
// Factories
// ============================================================================

function makeRequest(overrides: Record<string, unknown> = {}) {
	return {
		id: "req-1",
		createdAt: new Date("2024-06-15"),
		productTypeLabel: "Bracelet",
		details: "Bracelet avec gravure initiales pour anniversaire de mariage",
		status: "PENDING" as const,
		respondedAt: null,
		inspirationProducts: [] as Array<{
			id: string;
			title: string;
			slug: string;
			skus: Array<{ images: Array<{ url: string }> }>;
		}>,
		...overrides,
	};
}

function makeProduct(id: string, title: string, imageUrl?: string) {
	return {
		id,
		title,
		slug: title.toLowerCase().replace(/\s+/g, "-"),
		skus: imageUrl ? [{ images: [{ url: imageUrl }] }] : [{ images: [] }],
	};
}

// ============================================================================
// Tests: CustomizationRequestCard
// ============================================================================

describe("CustomizationRequestCard", () => {
	// ──────────── Content ────────────

	it("renders the product type label", () => {
		render(<CustomizationRequestCard request={makeRequest()} />);

		expect(screen.getByText("Bracelet")).toBeInTheDocument();
	});

	it("renders 'Personnalisation' when productTypeLabel is empty", () => {
		render(<CustomizationRequestCard request={makeRequest({ productTypeLabel: "" })} />);

		expect(screen.getByText("Personnalisation")).toBeInTheDocument();
	});

	it("renders 'Personnalisation' when productTypeLabel is null", () => {
		render(<CustomizationRequestCard request={makeRequest({ productTypeLabel: null })} />);

		expect(screen.getByText("Personnalisation")).toBeInTheDocument();
	});

	it("renders the details text", () => {
		render(<CustomizationRequestCard request={makeRequest()} />);

		expect(
			screen.getByText("Bracelet avec gravure initiales pour anniversaire de mariage"),
		).toBeInTheDocument();
	});

	it("renders the creation date in French format", () => {
		render(<CustomizationRequestCard request={makeRequest()} />);

		expect(screen.getByText("15 juin 2024")).toBeInTheDocument();
	});

	// ──────────── Status badges ────────────

	it("renders PENDING status badge with label and symbol", () => {
		render(<CustomizationRequestCard request={makeRequest({ status: "PENDING" })} />);

		expect(screen.getByText("En attente")).toBeInTheDocument();
		expect(screen.getByText("⏳")).toBeInTheDocument();
	});

	it("renders IN_PROGRESS status badge", () => {
		render(<CustomizationRequestCard request={makeRequest({ status: "IN_PROGRESS" })} />);

		expect(screen.getByText("En cours")).toBeInTheDocument();
		expect(screen.getByText("⚙")).toBeInTheDocument();
	});

	it("renders COMPLETED status badge", () => {
		render(<CustomizationRequestCard request={makeRequest({ status: "COMPLETED" })} />);

		expect(screen.getByText("Terminé")).toBeInTheDocument();
		expect(screen.getByText("✓")).toBeInTheDocument();
	});

	it("renders CANCELLED status badge", () => {
		render(<CustomizationRequestCard request={makeRequest({ status: "CANCELLED" })} />);

		expect(screen.getByText("Annulé")).toBeInTheDocument();
		expect(screen.getByText("✗")).toBeInTheDocument();
	});

	// ──────────── Response date ────────────

	it("renders response date when respondedAt is set", () => {
		render(
			<CustomizationRequestCard request={makeRequest({ respondedAt: new Date("2024-06-20") })} />,
		);

		expect(screen.getByText(/Réponse le/)).toBeInTheDocument();
		expect(screen.getByText(/20 juin 2024/)).toBeInTheDocument();
	});

	it("does not render response section when respondedAt is null", () => {
		render(<CustomizationRequestCard request={makeRequest({ respondedAt: null })} />);

		expect(screen.queryByText(/Réponse le/)).toBeNull();
	});

	// ──────────── Inspiration products ────────────

	it("does not render inspiration section when no products", () => {
		render(<CustomizationRequestCard request={makeRequest({ inspirationProducts: [] })} />);

		// No product images should be present
		expect(screen.queryByRole("img")).toBeNull();
	});

	it("renders inspiration product thumbnails", () => {
		const products = [
			makeProduct("p1", "Bracelet Or", "https://example.com/img1.jpg"),
			makeProduct("p2", "Collier Argent", "https://example.com/img2.jpg"),
		];
		render(<CustomizationRequestCard request={makeRequest({ inspirationProducts: products })} />);

		expect(screen.getByAltText("Bracelet Or")).toBeInTheDocument();
		expect(screen.getByAltText("Collier Argent")).toBeInTheDocument();
	});

	it("limits displayed thumbnails to 4", () => {
		const products = Array.from({ length: 6 }, (_, i) =>
			makeProduct(`p${i}`, `Product ${i}`, `https://example.com/img${i}.jpg`),
		);
		render(<CustomizationRequestCard request={makeRequest({ inspirationProducts: products })} />);

		// Only 4 images should be rendered
		const images = screen.getAllByRole("img");
		expect(images).toHaveLength(4);
	});

	it("shows overflow counter when more than 4 products", () => {
		const products = Array.from({ length: 6 }, (_, i) =>
			makeProduct(`p${i}`, `Product ${i}`, `https://example.com/img${i}.jpg`),
		);
		render(<CustomizationRequestCard request={makeRequest({ inspirationProducts: products })} />);

		expect(screen.getByText("+2")).toBeInTheDocument();
	});

	it("does not show overflow counter when exactly 4 products", () => {
		const products = Array.from({ length: 4 }, (_, i) =>
			makeProduct(`p${i}`, `Product ${i}`, `https://example.com/img${i}.jpg`),
		);
		render(<CustomizationRequestCard request={makeRequest({ inspirationProducts: products })} />);

		expect(screen.queryByText(/\+\d/)).toBeNull();
	});

	it("renders placeholder when product has no image", () => {
		const products = [makeProduct("p1", "Bracelet Or")];
		render(<CustomizationRequestCard request={makeRequest({ inspirationProducts: products })} />);

		// The container div should exist but no img inside
		expect(screen.queryByAltText("Bracelet Or")).toBeNull();
	});
});
