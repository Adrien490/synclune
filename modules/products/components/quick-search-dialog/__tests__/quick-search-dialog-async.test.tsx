import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGetQuickSearchData, mockQuickSearchDialog } = vi.hoisted(() => ({
	mockGetQuickSearchData: vi.fn(),
	mockQuickSearchDialog: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/products/data/get-quick-search-data", () => ({
	getQuickSearchData: mockGetQuickSearchData,
}));

vi.mock("../quick-search-dialog", () => ({
	QuickSearchDialog: mockQuickSearchDialog,
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { QuickSearchDialogAsync } from "../quick-search-dialog-async";
import type {
	QuickSearchCollection,
	QuickSearchProductType,
	RecentlyViewedProduct,
} from "../constants";

// ============================================================================
// FIXTURES
// ============================================================================

const mockCollections: QuickSearchCollection[] = [
	{ slug: "bagues", name: "Bagues", productCount: 10, image: null },
	{ slug: "colliers", name: "Colliers", productCount: 8, image: null },
];

const mockProductTypes: QuickSearchProductType[] = [
	{ slug: "bague", label: "Bagues" },
	{ slug: "collier", label: "Colliers" },
];

const mockRecentlyViewed: RecentlyViewedProduct[] = [
	{
		slug: "bague-lune",
		title: "Bague Lune",
		price: 4500,
		image: { url: "/img/bague.jpg", blurDataUrl: null },
	},
];

function makeQuickSearchData(
	overrides: Partial<{
		recentSearches: string[];
		collections: QuickSearchCollection[];
		productTypes: QuickSearchProductType[];
		recentlyViewed: RecentlyViewedProduct[];
	}> = {},
) {
	return {
		recentSearches: overrides.recentSearches ?? ["bague", "collier"],
		collections: overrides.collections ?? mockCollections,
		productTypes: overrides.productTypes ?? mockProductTypes,
		recentlyViewed: overrides.recentlyViewed ?? mockRecentlyViewed,
	};
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});

describe("QuickSearchDialogAsync", () => {
	it("calls getQuickSearchData once", async () => {
		mockGetQuickSearchData.mockResolvedValue(makeQuickSearchData());
		mockQuickSearchDialog.mockReturnValue(<div data-testid="quick-search-dialog" />);

		render(await QuickSearchDialogAsync());

		expect(mockGetQuickSearchData).toHaveBeenCalledOnce();
	});

	it("renders QuickSearchDialog with data from getQuickSearchData", async () => {
		const data = makeQuickSearchData();
		mockGetQuickSearchData.mockResolvedValue(data);
		mockQuickSearchDialog.mockImplementation(
			(props: {
				recentSearches: string[];
				collections: QuickSearchCollection[];
				productTypes: QuickSearchProductType[];
				recentlyViewed: RecentlyViewedProduct[];
			}) => (
				<div
					data-testid="quick-search-dialog"
					data-recent-searches={props.recentSearches.join(",")}
					data-collections={props.collections.length}
					data-product-types={props.productTypes.length}
					data-recently-viewed={props.recentlyViewed.length}
				/>
			),
		);

		render(await QuickSearchDialogAsync());

		const dialog = screen.getByTestId("quick-search-dialog");
		expect(dialog).toHaveAttribute("data-recent-searches", "bague,collier");
		expect(dialog).toHaveAttribute("data-collections", "2");
		expect(dialog).toHaveAttribute("data-product-types", "2");
		expect(dialog).toHaveAttribute("data-recently-viewed", "1");
	});

	it("passes all props spread from getQuickSearchData to QuickSearchDialog", async () => {
		const data = makeQuickSearchData({
			recentSearches: ["argent"],
			collections: [mockCollections[0]!],
			productTypes: [mockProductTypes[0]!],
			recentlyViewed: [],
		});
		mockGetQuickSearchData.mockResolvedValue(data);

		const capturedProps: Record<string, unknown>[] = [];
		mockQuickSearchDialog.mockImplementation((props: Record<string, unknown>) => {
			capturedProps.push(props);
			return <div data-testid="quick-search-dialog" />;
		});

		render(await QuickSearchDialogAsync());

		expect(capturedProps[0]).toMatchObject({
			recentSearches: ["argent"],
			collections: [mockCollections[0]],
			productTypes: [mockProductTypes[0]],
			recentlyViewed: [],
		});
	});

	it("handles empty data from getQuickSearchData", async () => {
		const data = makeQuickSearchData({
			recentSearches: [],
			collections: [],
			productTypes: [],
			recentlyViewed: [],
		});
		mockGetQuickSearchData.mockResolvedValue(data);

		const capturedProps: Record<string, unknown>[] = [];
		mockQuickSearchDialog.mockImplementation((props: Record<string, unknown>) => {
			capturedProps.push(props);
			return <div data-testid="quick-search-dialog" />;
		});

		render(await QuickSearchDialogAsync());

		expect(screen.getByTestId("quick-search-dialog")).toBeInTheDocument();
		expect(capturedProps[0]).toMatchObject({
			recentSearches: [],
			collections: [],
			productTypes: [],
			recentlyViewed: [],
		});
	});
});
