import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockGetAvailableQty } = vi.hoisted(() => ({
	mockGetAvailableQty: vi.fn().mockReturnValue(2),
}));

vi.mock("@/modules/refunds/services/refund-calculation.service", () => ({
	getAvailableQuantity: mockGetAvailableQty,
}));

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({ id, checked, disabled, onCheckedChange }: any) => (
		<input
			type="checkbox"
			id={id}
			checked={checked}
			disabled={disabled}
			onChange={(e) => onCheckedChange?.(e.target.checked)}
		/>
	),
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: ({ id, value, onChange, disabled, min, max, ...props }: any) => (
		<input
			id={id}
			value={value}
			onChange={onChange}
			disabled={disabled}
			min={min}
			max={max}
			{...props}
		/>
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, htmlFor, ...props }: any) => (
		<label htmlFor={htmlFor} {...props}>
			{children}
		</label>
	),
}));

vi.mock("@/shared/components/ui/switch", () => ({
	Switch: ({ id, checked, disabled, onCheckedChange }: any) => (
		<input
			type="checkbox"
			role="switch"
			id={id}
			checked={checked}
			disabled={disabled}
			onChange={(e) => onCheckedChange?.(e.target.checked)}
		/>
	),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

import { RefundItemRow } from "../refund-item-row";

afterEach(cleanup);

function createOrderItem(overrides = {}) {
	return {
		id: "item-1",
		productTitle: "Bague dorée",
		productImageUrl: null,
		skuImageUrl: null,
		skuColor: null,
		skuMaterial: null,
		skuSize: null,
		price: 3000,
		quantity: 2,
		refundItems: [],
		...overrides,
	} as any;
}

function createItemState(overrides = {}) {
	return {
		selected: false,
		quantity: 1,
		restock: true,
		...overrides,
	} as any;
}

describe("RefundItemRow", () => {
	it("renders product title", () => {
		render(
			<RefundItemRow
				orderItem={createOrderItem({ productTitle: "Collier argent" })}
				itemState={createItemState()}
				isPending={false}
				onToggle={vi.fn()}
				onQuantityChange={vi.fn()}
				onRestockToggle={vi.fn()}
			/>,
		);
		expect(screen.getByText("Collier argent")).toBeInTheDocument();
	});

	it("shows checkbox", () => {
		render(
			<RefundItemRow
				orderItem={createOrderItem()}
				itemState={createItemState()}
				isPending={false}
				onToggle={vi.fn()}
				onQuantityChange={vi.fn()}
				onRestockToggle={vi.fn()}
			/>,
		);
		expect(screen.getByRole("checkbox", { name: /Bague dorée/ })).toBeInTheDocument();
	});

	it("disables checkbox when availableQty is 0", () => {
		mockGetAvailableQty.mockReturnValueOnce(0);
		render(
			<RefundItemRow
				orderItem={createOrderItem()}
				itemState={createItemState()}
				isPending={false}
				onToggle={vi.fn()}
				onQuantityChange={vi.fn()}
				onRestockToggle={vi.fn()}
			/>,
		);
		const checkbox = screen.getByRole("checkbox", { name: /Bague dorée/ });
		expect(checkbox).toBeDisabled();
	});

	it("shows variant parts when present", () => {
		render(
			<RefundItemRow
				orderItem={createOrderItem({ skuColor: "Or", skuMaterial: "Gold", skuSize: "52" })}
				itemState={createItemState()}
				isPending={false}
				onToggle={vi.fn()}
				onQuantityChange={vi.fn()}
				onRestockToggle={vi.fn()}
			/>,
		);
		expect(screen.getByText("Or / Gold / 52")).toBeInTheDocument();
	});

	it("shows price and quantity", () => {
		render(
			<RefundItemRow
				orderItem={createOrderItem({ price: 2500, quantity: 3 })}
				itemState={createItemState()}
				isPending={false}
				onToggle={vi.fn()}
				onQuantityChange={vi.fn()}
				onRestockToggle={vi.fn()}
			/>,
		);
		expect(screen.getByText(/25\.00 € x 3/)).toBeInTheDocument();
	});

	it("shows already refunded message when availableQty is less than quantity", () => {
		mockGetAvailableQty.mockReturnValueOnce(1);
		render(
			<RefundItemRow
				orderItem={createOrderItem({ quantity: 3 })}
				itemState={createItemState()}
				isPending={false}
				onToggle={vi.fn()}
				onQuantityChange={vi.fn()}
				onRestockToggle={vi.fn()}
			/>,
		);
		expect(screen.getByText("2 déjà remboursé(s)")).toBeInTheDocument();
	});

	it("shows quantity input and restock switch when selected and available", () => {
		mockGetAvailableQty.mockReturnValue(2);
		render(
			<RefundItemRow
				orderItem={createOrderItem()}
				itemState={createItemState({ selected: true, quantity: 1 })}
				isPending={false}
				onToggle={vi.fn()}
				onQuantityChange={vi.fn()}
				onRestockToggle={vi.fn()}
			/>,
		);
		expect(screen.getByLabelText("Quantité")).toBeInTheDocument();
		expect(screen.getByRole("switch")).toBeInTheDocument();
	});

	it("hides quantity and restock controls when not selected", () => {
		mockGetAvailableQty.mockReturnValue(2);
		render(
			<RefundItemRow
				orderItem={createOrderItem()}
				itemState={createItemState({ selected: false })}
				isPending={false}
				onToggle={vi.fn()}
				onQuantityChange={vi.fn()}
				onRestockToggle={vi.fn()}
			/>,
		);
		expect(screen.queryByLabelText("Quantité")).toBeNull();
		expect(screen.queryByRole("switch")).toBeNull();
	});
});
