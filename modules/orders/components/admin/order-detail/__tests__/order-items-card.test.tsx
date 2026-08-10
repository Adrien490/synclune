import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: any) => <div>{children}</div>,
	CardHeader: ({ children }: any) => <div>{children}</div>,
	CardTitle: ({ children }: any) => <div>{children}</div>,
	CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: () => <hr />,
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	PackageIcon: () => <svg aria-hidden="true" />,
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("next/image", () => ({
	default: ({ alt }: any) => <div data-testid="mock-image" aria-label={alt} />,
}));

import { OrderItemsCard } from "../order-items-card";

afterEach(cleanup);

// V5 : OrderItem n'a plus de colonne `id` (PK composite orderId+skuId) — la
// fixture n'en porte plus, et la key React de la carte est `item.skuId`.
function createItem(overrides = {}) {
	return {
		productId: null,
		skuId: "sku-1",
		productTitle: "Bague dorée",
		productDescription: null,
		productImageUrl: null,
		skuSku: null,
		skuColor: null,
		skuSize: null,
		skuMaterial: null,
		price: 2500,
		quantity: 1,
		// TVA par ligne (Phase 2A — franchise art. 293 B par défaut)
		taxRate: 0,
		lineTotalExcludingTax: 2500,
		lineTotalIncludingTax: 2500,
		taxCategoryCode: "ZB" as const,
		hsCode: null,
		unitCode: null,
		...overrides,
	};
}

function renderCard(itemOverrides = {}, cardOverrides = {}) {
	const items = [createItem(itemOverrides)];
	return render(
		<OrderItemsCard
			items={items}
			subtotal={2500}
			shippingCost={500}
			total={3000}
			{...cardOverrides}
		/>,
	);
}

describe("OrderItemsCard", () => {
	it("renders title with item count", () => {
		const items = [createItem(), createItem({ skuId: "sku-2", productTitle: "Collier argent" })];
		render(<OrderItemsCard items={items} subtotal={5000} shippingCost={500} total={5500} />);
		expect(screen.getByText("Articles (2)")).toBeInTheDocument();
	});

	it("renders item product title", () => {
		renderCard({ productTitle: "Bague en or 18k" });
		expect(screen.getByText("Bague en or 18k")).toBeInTheDocument();
	});

	it("shows variant when color, size and material are present", () => {
		renderCard({ skuColor: "Or", skuSize: "52", skuMaterial: "Gold" });
		expect(screen.getByText("Or / 52 / Gold")).toBeInTheDocument();
	});

	it("shows partial variant when only some fields are present", () => {
		renderCard({ skuColor: "Argent", skuSize: null, skuMaterial: null });
		expect(screen.getByText("Argent")).toBeInTheDocument();
	});

	it("shows quantity label", () => {
		renderCard({ quantity: 2 });
		expect(screen.getByText("Qté : 2")).toBeInTheDocument();
	});

	it("shows item total price as price times quantity", () => {
		renderCard({ price: 1000, quantity: 3 });
		expect(screen.getAllByText("30.00 €").length).toBeGreaterThanOrEqual(1);
	});

	it("shows unit price when quantity is greater than 1", () => {
		renderCard({ price: 1500, quantity: 2 });
		expect(screen.getByText("15.00 € / unité")).toBeInTheDocument();
	});

	it("does not show unit price when quantity is 1", () => {
		renderCard({ price: 1500, quantity: 1 });
		expect(screen.queryByText(/unité/)).toBeNull();
	});

	it("shows subtotal", () => {
		render(
			<OrderItemsCard
				items={[createItem({ price: 2000 })]}
				subtotal={2000}
				shippingCost={0}
				total={2000}
			/>,
		);
		expect(screen.getByText("Sous-total")).toBeInTheDocument();
	});

	it("shows shipping cost when non-zero", () => {
		render(
			<OrderItemsCard items={[createItem()]} subtotal={2500} shippingCost={500} total={3000} />,
		);
		expect(screen.getByText("5.00 €")).toBeInTheDocument();
	});

	it("shows Gratuite when shipping cost is 0", () => {
		render(<OrderItemsCard items={[createItem()]} subtotal={2500} shippingCost={0} total={2500} />);
		expect(screen.getByText("Gratuite")).toBeInTheDocument();
	});

	it("shows total", () => {
		render(
			<OrderItemsCard
				items={[createItem({ price: 2000 })]}
				subtotal={2000}
				shippingCost={500}
				total={2500}
			/>,
		);
		expect(screen.getByText("Total")).toBeInTheDocument();
	});

	it("hides discount when discountAmount is 0", () => {
		renderCard();
		expect(screen.queryByText("Réduction")).toBeNull();
	});
});
