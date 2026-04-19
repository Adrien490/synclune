import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockAddRecentProduct } = vi.hoisted(() => ({
	mockAddRecentProduct: vi.fn(),
}));

vi.mock("@/modules/products/actions/add-recent-product", () => ({
	addRecentProduct: mockAddRecentProduct,
}));

import { RecordProductView } from "../record-product-view";

afterEach(cleanup);

describe("RecordProductView", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockAddRecentProduct.mockResolvedValue(undefined);
	});

	it("renders nothing (returns null)", () => {
		const { container } = render(<RecordProductView slug="bague-lune-argent" />);
		expect(container.firstChild).toBeNull();
	});

	it("calls addRecentProduct with the slug in FormData on mount", () => {
		render(<RecordProductView slug="bague-lune-argent" />);

		expect(mockAddRecentProduct).toHaveBeenCalledOnce();
		const [, formData] = mockAddRecentProduct.mock.calls[0] as [unknown, FormData];
		expect(formData.get("slug")).toBe("bague-lune-argent");
	});

	it("only calls once even if component re-renders with the same slug", () => {
		const { rerender } = render(<RecordProductView slug="bague-lune-argent" />);
		rerender(<RecordProductView slug="bague-lune-argent" />);

		expect(mockAddRecentProduct).toHaveBeenCalledOnce();
	});
});
