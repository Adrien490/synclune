import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/image as a plain img tag
vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		fill: _fill,
		className,
		sizes: _sizes,
		quality: _quality,
		...props
	}: {
		src: string;
		alt: string;
		fill?: boolean;
		className?: string;
		sizes?: string;
		quality?: number;
		// eslint-disable-next-line @next/next/no-img-element
	}) => <img src={src} alt={alt} className={className} {...props} />,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
	ShoppingBag: () => <svg data-testid="icon-shopping-bag" />,
}));

// Mock formatEuro to return a predictable string
vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: vi.fn((cents: number) => `${(cents / 100).toFixed(2)} €`),
}));

import { OrderItemsList } from "../order-items-list";

afterEach(cleanup);

interface TestOrderItem {
	id: string;
	productId: string | null;
	productTitle: string;
	productDescription: string | null;
	productImageUrl: string | null;
	skuColor: string | null;
	skuMaterial: string | null;
	skuSize: string | null;
	skuImageUrl: string | null;
	price: number;
	quantity: number;
}

function createItem(overrides: Partial<TestOrderItem> = {}): TestOrderItem {
	return {
		id: "item-1",
		productId: "prod-1",
		productTitle: "Bague en argent",
		productDescription: "Une bague élégante",
		productImageUrl: "https://example.com/product.jpg",
		skuColor: null,
		skuMaterial: null,
		skuSize: null,
		skuImageUrl: null,
		price: 2500,
		quantity: 1,
		...overrides,
	};
}

describe("OrderItemsList", () => {
	describe("heading", () => {
		it("renders the heading with correct item count for one item", () => {
			render(<OrderItemsList items={[createItem()]} />);
			expect(screen.getByText(/Articles commandés \(1\)/)).toBeInTheDocument();
		});

		it("renders the heading with correct item count for multiple items", () => {
			render(
				<OrderItemsList
					items={[
						createItem({ id: "item-1" }),
						createItem({ id: "item-2", productTitle: "Collier doré" }),
					]}
				/>,
			);
			expect(screen.getByText(/Articles commandés \(2\)/)).toBeInTheDocument();
		});

		it("renders the heading with zero items", () => {
			render(<OrderItemsList items={[]} />);
			expect(screen.getByText(/Articles commandés \(0\)/)).toBeInTheDocument();
		});
	});

	describe("product title", () => {
		it("displays the product title for each item", () => {
			render(
				<OrderItemsList
					items={[
						createItem({ id: "item-1", productTitle: "Bague en argent" }),
						createItem({ id: "item-2", productTitle: "Collier doré" }),
					]}
				/>,
			);
			expect(screen.getByText("Bague en argent")).toBeInTheDocument();
			expect(screen.getByText("Collier doré")).toBeInTheDocument();
		});
	});

	describe("images", () => {
		it("shows the SKU image when skuImageUrl is set (priority over productImageUrl)", () => {
			render(
				<OrderItemsList
					items={[
						createItem({
							skuImageUrl: "https://example.com/sku.jpg",
							productImageUrl: "https://example.com/product.jpg",
						}),
					]}
				/>,
			);
			const img = screen.getByRole("img");
			expect(img.getAttribute("src")).toBe("https://example.com/sku.jpg");
		});

		it("falls back to the product image when skuImageUrl is null", () => {
			render(
				<OrderItemsList
					items={[
						createItem({
							skuImageUrl: null,
							productImageUrl: "https://example.com/product.jpg",
						}),
					]}
				/>,
			);
			const img = screen.getByRole("img");
			expect(img.getAttribute("src")).toBe("https://example.com/product.jpg");
		});

		it("shows the image placeholder text when both skuImageUrl and productImageUrl are null", () => {
			render(<OrderItemsList items={[createItem({ skuImageUrl: null, productImageUrl: null })]} />);
			expect(screen.queryByRole("img")).toBeNull();
			expect(screen.getByText("Image")).toBeInTheDocument();
		});

		it("uses the product title as the alt text for the image", () => {
			render(
				<OrderItemsList
					items={[
						createItem({
							productTitle: "Bague en argent",
							productImageUrl: "https://example.com/product.jpg",
						}),
					]}
				/>,
			);
			const img = screen.getByRole("img");
			expect(img.getAttribute("alt")).toBe("Bague en argent");
		});
	});

	describe("variants", () => {
		it("displays variants joined with the bullet separator", () => {
			render(
				<OrderItemsList
					items={[
						createItem({
							skuColor: "Or",
							skuMaterial: "Argent 925",
							skuSize: "52",
						}),
					]}
				/>,
			);
			expect(screen.getByText("Or • Argent 925 • 52")).toBeInTheDocument();
		});

		it("filters out null variant values", () => {
			render(
				<OrderItemsList
					items={[
						createItem({
							skuColor: "Or",
							skuMaterial: null,
							skuSize: null,
						}),
					]}
				/>,
			);
			expect(screen.getByText("Or")).toBeInTheDocument();
			// No bullet separators present when only one variant
			expect(screen.queryByText(/•/)).toBeNull();
		});

		it("filters out empty string variant values", () => {
			render(
				<OrderItemsList
					items={[
						createItem({
							skuColor: "",
							skuMaterial: "Or jaune",
							skuSize: "",
						}),
					]}
				/>,
			);
			expect(screen.getByText("Or jaune")).toBeInTheDocument();
		});

		it("does not render the variants paragraph when all variant fields are null", () => {
			render(
				<OrderItemsList
					items={[
						createItem({
							skuColor: null,
							skuMaterial: null,
							skuSize: null,
						}),
					]}
				/>,
			);
			// Verify no bullet separator text appears
			expect(screen.queryByText(/•/)).toBeNull();
		});

		it("displays two variants joined correctly", () => {
			render(
				<OrderItemsList
					items={[
						createItem({
							skuColor: "Rose",
							skuMaterial: null,
							skuSize: "M",
						}),
					]}
				/>,
			);
			expect(screen.getByText("Rose • M")).toBeInTheDocument();
		});
	});

	describe("quantity", () => {
		it("displays the quantity for each item", () => {
			render(<OrderItemsList items={[createItem({ quantity: 3 })]} />);
			expect(screen.getByText("Quantité : 3")).toBeInTheDocument();
		});

		it("displays quantity 1 correctly", () => {
			render(<OrderItemsList items={[createItem({ quantity: 1 })]} />);
			expect(screen.getByText("Quantité : 1")).toBeInTheDocument();
		});
	});

	describe("pricing", () => {
		it("shows the total price as price multiplied by quantity", () => {
			// price=2500 (25.00€), quantity=2 -> total=5000 (50.00€)
			render(<OrderItemsList items={[createItem({ price: 2500, quantity: 2 })]} />);
			expect(screen.getByText("50.00 €")).toBeInTheDocument();
		});

		it("shows the unit price when quantity is greater than 1", () => {
			render(<OrderItemsList items={[createItem({ price: 2500, quantity: 2 })]} />);
			expect(screen.getByText("25.00 € / unité")).toBeInTheDocument();
		});

		it("does not show the unit price when quantity is 1", () => {
			render(<OrderItemsList items={[createItem({ price: 2500, quantity: 1 })]} />);
			expect(screen.queryByText(/\/ unité/)).toBeNull();
		});

		it("shows total price for quantity 1 (price * 1)", () => {
			render(<OrderItemsList items={[createItem({ price: 3000, quantity: 1 })]} />);
			expect(screen.getByText("30.00 €")).toBeInTheDocument();
		});

		it("shows the correct total for quantity 3 (price * 3)", () => {
			// price=1500 (15.00€) * 3 = 4500 (45.00€)
			render(<OrderItemsList items={[createItem({ price: 1500, quantity: 3 })]} />);
			expect(screen.getByText("45.00 €")).toBeInTheDocument();
		});
	});

	describe("multiple items", () => {
		it("renders each item independently with its own details", () => {
			render(
				<OrderItemsList
					items={[
						createItem({
							id: "item-1",
							productTitle: "Bague en argent",
							price: 2500,
							quantity: 1,
						}),
						createItem({
							id: "item-2",
							productTitle: "Bracelet doré",
							price: 4000,
							quantity: 2,
						}),
					]}
				/>,
			);
			expect(screen.getByText("Bague en argent")).toBeInTheDocument();
			expect(screen.getByText("Bracelet doré")).toBeInTheDocument();
			expect(screen.getByText("25.00 €")).toBeInTheDocument();
			expect(screen.getByText("80.00 €")).toBeInTheDocument();
		});
	});
});
