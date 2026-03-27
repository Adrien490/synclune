import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks
const { mockAddRecentProduct, mockProductViewed } = vi.hoisted(() => ({
	mockAddRecentProduct: vi.fn(),
	mockProductViewed: vi.fn(),
}));

vi.mock("@/modules/products/actions/add-recent-product", () => ({
	addRecentProduct: mockAddRecentProduct,
}));

vi.mock("@/shared/lib/posthog-events", () => ({
	posthogEvents: {
		productViewed: mockProductViewed,
	},
}));

import { RecordProductView } from "../record-product-view";

afterEach(cleanup);

describe("RecordProductView", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockAddRecentProduct.mockResolvedValue(undefined);
	});

	it("renders nothing (returns null)", () => {
		const { container } = render(
			<RecordProductView
				slug="bague-lune-argent"
				productId="prod-1"
				productName="Bague Lune Argent"
				price={4800}
			/>,
		);

		expect(container.firstChild).toBeNull();
	});

	it("calls addRecentProduct with the slug in FormData on mount", () => {
		render(
			<RecordProductView
				slug="bague-lune-argent"
				productId="prod-1"
				productName="Bague Lune Argent"
				price={4800}
			/>,
		);

		expect(mockAddRecentProduct).toHaveBeenCalledOnce();
		const [, formData] = mockAddRecentProduct.mock.calls[0] as [unknown, FormData];
		expect(formData.get("slug")).toBe("bague-lune-argent");
	});

	it("calls posthogEvents.productViewed with correct product data on mount", () => {
		render(
			<RecordProductView
				slug="collier-or"
				productId="prod-42"
				productName="Collier Or"
				price={9500}
				collection="Ete 2025"
			/>,
		);

		expect(mockProductViewed).toHaveBeenCalledOnce();
		expect(mockProductViewed).toHaveBeenCalledWith({
			id: "prod-42",
			name: "Collier Or",
			price: 9500,
			collection: "Ete 2025",
		});
	});

	it("passes undefined collection when not provided", () => {
		render(
			<RecordProductView
				slug="bracelet-argent"
				productId="prod-5"
				productName="Bracelet Argent"
				price={3200}
			/>,
		);

		expect(mockProductViewed).toHaveBeenCalledWith({
			id: "prod-5",
			name: "Bracelet Argent",
			price: 3200,
			collection: undefined,
		});
	});

	it("only calls tracking once even if component re-renders", () => {
		const { rerender } = render(
			<RecordProductView
				slug="bague-lune-argent"
				productId="prod-1"
				productName="Bague Lune Argent"
				price={4800}
			/>,
		);

		rerender(
			<RecordProductView
				slug="bague-lune-argent"
				productId="prod-1"
				productName="Bague Lune Argent"
				price={4800}
			/>,
		);

		// hasRecorded ref prevents double-firing
		expect(mockAddRecentProduct).toHaveBeenCalledOnce();
		expect(mockProductViewed).toHaveBeenCalledOnce();
	});
});
