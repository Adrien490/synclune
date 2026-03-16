import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Stub out shadcn/ui Card components with simple pass-through divs
vi.mock("@/shared/components/ui/card", () => ({
	Card: ({
		children,
		role,
		"aria-labelledby": labelledBy,
		className,
	}: {
		children: React.ReactNode;
		role?: string;
		"aria-labelledby"?: string;
		className?: string;
	}) => (
		<div role={role} aria-labelledby={labelledBy} className={className}>
			{children}
		</div>
	),
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { ProductCharacteristics } from "../product-characteristics";
import type { ProductSku } from "@/modules/products/types/product.types";

afterEach(cleanup);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSku(overrides: Partial<ProductSku> = {}): ProductSku {
	return {
		id: "sku-1",
		sku: "RING-ARG-M",
		priceInclTax: 4999,
		compareAtPrice: null,
		inventory: 5,
		isActive: true,
		isDefault: true,
		size: "M",
		colorId: null,
		materialId: null,
		material: null,
		color: null,
		media: [],
		...overrides,
	} as unknown as ProductSku;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ProductCharacteristics", () => {
	it("returns null and renders nothing when no SKU is provided", () => {
		const { container } = render(<ProductCharacteristics selectedSku={null} />);

		expect(container.firstChild).toBeNull();
	});

	it("returns null and renders nothing when the SKU has no size", () => {
		const { container } = render(<ProductCharacteristics selectedSku={makeSku({ size: null })} />);

		expect(container.firstChild).toBeNull();
	});

	it("renders the SKU size when a size is present", () => {
		render(<ProductCharacteristics selectedSku={makeSku({ size: "58 mm" })} />);

		expect(screen.getByText("58 mm")).toBeInTheDocument();
	});

	it("shows the adjustable size notice when size includes 'ajustable'", () => {
		render(<ProductCharacteristics selectedSku={makeSku({ size: "Ajustable 52-58 mm" })} />);

		expect(screen.getByText(/Convient à la plupart des morphologies/i)).toBeInTheDocument();
	});

	it("does not show the adjustable notice for a fixed size", () => {
		render(<ProductCharacteristics selectedSku={makeSku({ size: "52 mm" })} />);

		expect(screen.queryByText(/Convient à la plupart des morphologies/i)).not.toBeInTheDocument();
	});

	it("wraps content in an accessible region with an id-linked heading", () => {
		render(<ProductCharacteristics selectedSku={makeSku({ size: "M" })} />);

		const region = screen.getByRole("region", { name: /Taille sélectionnée/i });
		expect(region).toBeInTheDocument();
	});
});
