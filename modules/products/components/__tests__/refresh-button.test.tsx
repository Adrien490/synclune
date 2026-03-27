import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks
const { mockRefresh } = vi.hoisted(() => ({
	mockRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		refresh: mockRefresh,
	}),
}));

import { RefreshButton } from "../refresh-button";

afterEach(cleanup);

describe("RefreshButton", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("renders a button with the label 'Réessayer'", () => {
		render(<RefreshButton />);

		expect(screen.getByRole("button", { name: /réessayer/i })).toBeInTheDocument();
	});

	it("calls router.refresh() when clicked", () => {
		render(<RefreshButton />);

		const button = screen.getByRole("button", { name: /réessayer/i });
		fireEvent.click(button);

		expect(mockRefresh).toHaveBeenCalledOnce();
	});

	it("renders the RefreshCw icon (aria-hidden)", () => {
		const { container } = render(<RefreshButton />);

		const icon = container.querySelector('[aria-hidden="true"]');
		expect(icon).toBeInTheDocument();
	});

	it("calls router.refresh() only once per click", () => {
		render(<RefreshButton />);

		const button = screen.getByRole("button", { name: /réessayer/i });
		fireEvent.click(button);
		fireEvent.click(button);

		expect(mockRefresh).toHaveBeenCalledTimes(2);
	});
});
