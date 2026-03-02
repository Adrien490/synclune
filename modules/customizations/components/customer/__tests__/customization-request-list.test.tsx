import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

// Mock React's use() to synchronously unwrap the promise value
const mockUseValue = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("react", async () => {
	const actual = await vi.importActual("react");
	return {
		...actual,
		use: () => mockUseValue.current,
	};
});

vi.mock("next/link", () => ({
	default: ({ href, children }: { href: string; children: React.ReactNode }) => (
		<a href={href}>{children}</a>
	),
}));

// Mock CustomizationRequestCard to avoid deep dependency chain
vi.mock("../customization-request-card", () => ({
	CustomizationRequestCard: ({
		request,
	}: {
		request: { id: string; productTypeLabel: string };
	}) => (
		<div data-testid={`card-${request.id}`}>{request.productTypeLabel || "Personnalisation"}</div>
	),
}));

import { CustomizationRequestList } from "../customization-request-list";

afterEach(cleanup);

// ============================================================================
// Factories
// ============================================================================

function makeRequest(overrides: Record<string, unknown> = {}) {
	return {
		id: "req-1",
		createdAt: new Date("2024-06-15"),
		productTypeLabel: "Bracelet",
		details: "Bracelet gravure",
		status: "PENDING" as const,
		respondedAt: null,
		inspirationProducts: [],
		...overrides,
	};
}

// The promise is never actually awaited because use() is mocked
const DUMMY_PROMISE = Promise.resolve(null) as Promise<ReturnType<typeof makeRequest>[] | null>;

// ============================================================================
// Tests: CustomizationRequestList
// ============================================================================

describe("CustomizationRequestList", () => {
	// ──────────── Empty states ────────────

	it("renders empty state when data is null", () => {
		mockUseValue.current = null;

		render(<CustomizationRequestList requestsPromise={DUMMY_PROMISE} />);

		expect(screen.getByText("Aucune demande de personnalisation")).toBeInTheDocument();
	});

	it("renders empty state when data is an empty array", () => {
		mockUseValue.current = [];

		render(<CustomizationRequestList requestsPromise={DUMMY_PROMISE} />);

		expect(screen.getByText("Aucune demande de personnalisation")).toBeInTheDocument();
	});

	it("renders CTA link to /personnalisation in empty state", () => {
		mockUseValue.current = null;

		render(<CustomizationRequestList requestsPromise={DUMMY_PROMISE} />);

		const link = screen.getByRole("link", { name: "Faire une demande" });
		expect(link).toHaveAttribute("href", "/personnalisation");
	});

	// ──────────── With data ────────────

	it("renders request cards when data is present", () => {
		mockUseValue.current = [
			makeRequest({ id: "req-1", productTypeLabel: "Bracelet" }),
			makeRequest({ id: "req-2", productTypeLabel: "Collier" }),
		];

		render(<CustomizationRequestList requestsPromise={DUMMY_PROMISE} />);

		expect(screen.getByTestId("card-req-1")).toBeInTheDocument();
		expect(screen.getByTestId("card-req-2")).toBeInTheDocument();
	});

	it("renders one card for each request", () => {
		mockUseValue.current = [
			makeRequest({ id: "req-1" }),
			makeRequest({ id: "req-2" }),
			makeRequest({ id: "req-3" }),
		];

		render(<CustomizationRequestList requestsPromise={DUMMY_PROMISE} />);

		const cards = screen.getAllByTestId(/^card-/);
		expect(cards).toHaveLength(3);
	});

	it("does not render empty state when requests exist", () => {
		mockUseValue.current = [makeRequest()];

		render(<CustomizationRequestList requestsPromise={DUMMY_PROMISE} />);

		expect(screen.queryByText("Aucune demande de personnalisation")).toBeNull();
	});
});
