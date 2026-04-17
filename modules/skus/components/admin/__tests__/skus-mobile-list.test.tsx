import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: ({
		hasNextPage,
		hasPreviousPage,
	}: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	}) => (
		<div
			data-testid="cursor-pagination"
			data-has-next={hasNextPage}
			data-has-prev={hasPreviousPage}
		/>
	),
}));

vi.mock("@/shared/components/data-table/table-empty-state", () => ({
	TableEmptyState: ({
		title,
		description,
		actionElement,
	}: {
		icon?: React.ElementType;
		title: string;
		description: string;
		actionElement?: React.ReactNode;
	}) => (
		<div data-testid="table-empty-state">
			<span>{title}</span>
			<span>{description}</span>
			{actionElement}
		</div>
	),
}));

vi.mock("@/shared/components/ui/item", () => ({
	ItemGroup: ({
		children,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
	}) => (
		<div data-testid="item-group" aria-label={ariaLabel}>
			{children}
		</div>
	),
}));

vi.mock("../sku-mobile-item", () => ({
	SkuMobileItem: ({ sku }: { sku: { id: string; sku: string } }) => (
		<div data-testid="sku-mobile-item" data-id={sku.id}>
			{sku.sku}
		</div>
	),
}));

vi.mock("../skus-selection-toolbar", () => ({
	ProductVariantsSelectionToolbar: () => <div data-testid="skus-selection-toolbar" />,
}));

vi.mock("lucide-react", () => ({
	Package: () => <svg data-testid="icon-package" />,
}));

import { SkusMobileList } from "../skus-mobile-list";
import type { GetProductSkusReturn } from "@/modules/skus/types/skus.types";

function createSku(overrides: Partial<GetProductSkusReturn["productSkus"][number]> = {}) {
	return {
		id: "sku-1",
		sku: "REF-001",
		productId: "p-1",
		priceInclTax: 4500,
		compareAtPrice: null,
		inventory: 5,
		isActive: true,
		isDefault: false,
		size: null,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		product: {
			id: "p-1",
			slug: "bague-lune",
			title: "Bague Lune",
			description: null,
			status: "PUBLIC",
		},
		color: null,
		material: null,
		images: [],
		_count: { images: 0, orderItems: 0 },
		...overrides,
	} as unknown as GetProductSkusReturn["productSkus"][number];
}

function createReturn(
	skus: GetProductSkusReturn["productSkus"],
	paginationOverrides: Partial<GetProductSkusReturn["pagination"]> = {},
): GetProductSkusReturn {
	return {
		productSkus: skus,
		pagination: {
			hasNextPage: false,
			hasPreviousPage: false,
			nextCursor: null,
			prevCursor: null,
			...paginationOverrides,
		},
	};
}

async function renderWithSuspense(
	data: GetProductSkusReturn,
	opts: { perPage?: number; hasActiveFilters?: boolean; productSlug?: string } = {},
) {
	const promise = Promise.resolve(data);
	let result!: ReturnType<typeof render>;
	await act(async () => {
		result = render(
			<React.Suspense fallback={<div data-testid="suspense-fallback" />}>
				<SkusMobileList
					skusPromise={promise}
					productSlug={opts.productSlug ?? "bague-lune"}
					perPage={opts.perPage ?? 20}
					hasActiveFilters={opts.hasActiveFilters}
				/>
			</React.Suspense>,
		);
	});
	return result;
}

afterEach(cleanup);

describe("SkusMobileList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("empty state", () => {
		it("renders TableEmptyState when empty", async () => {
			await renderWithSuspense(createReturn([]));
			expect(screen.getByTestId("table-empty-state")).toBeInTheDocument();
			expect(screen.getByText("Aucune variante")).toBeInTheDocument();
		});

		it("shows filtered message when hasActiveFilters", async () => {
			await renderWithSuspense(createReturn([]), { hasActiveFilters: true });
			expect(screen.getByText(/Aucune variante ne correspond/)).toBeInTheDocument();
		});

		it("shows default message when no active filters", async () => {
			await renderWithSuspense(createReturn([]));
			expect(screen.getByText(/pas encore de variante/)).toBeInTheDocument();
		});

		it("renders create link in empty state", async () => {
			await renderWithSuspense(createReturn([]));
			const link = screen.getByRole("link", { name: "Créer une variante" });
			expect(link).toHaveAttribute(
				"href",
				"/admin/catalogue/produits/bague-lune/variantes/nouveau",
			);
		});

		it("empty state wrapper hidden on md", async () => {
			const { container } = await renderWithSuspense(createReturn([]));
			expect(container.querySelector(".md\\:hidden")).toBeInTheDocument();
		});
	});

	describe("list rendering", () => {
		it("renders one SkuMobileItem per sku", async () => {
			await renderWithSuspense(
				createReturn([
					createSku(),
					createSku({ id: "sku-2", sku: "REF-002" }),
					createSku({ id: "sku-3", sku: "REF-003" }),
				]),
			);
			expect(screen.getAllByTestId("sku-mobile-item")).toHaveLength(3);
		});

		it("renders selection toolbar", async () => {
			await renderWithSuspense(createReturn([createSku()]));
			expect(screen.getByTestId("skus-selection-toolbar")).toBeInTheDocument();
		});

		it("renders ItemGroup with aria-label 'Variantes'", async () => {
			await renderWithSuspense(createReturn([createSku()]));
			expect(screen.getByTestId("item-group")).toHaveAttribute("aria-label", "Variantes");
		});

		it("forwards pagination info to CursorPagination", async () => {
			await renderWithSuspense(createReturn([createSku()], { hasNextPage: true }));
			expect(screen.getByTestId("cursor-pagination")).toHaveAttribute("data-has-next", "true");
		});

		it("list wrapper hidden on md", async () => {
			const { container } = await renderWithSuspense(createReturn([createSku()]));
			expect(container.querySelector(".md\\:hidden")).toBeInTheDocument();
		});
	});
});
