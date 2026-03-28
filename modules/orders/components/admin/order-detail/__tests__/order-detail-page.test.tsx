import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/orders/data/get-order-notes", () => ({
	getOrderNotes: vi.fn().mockResolvedValue({ notes: [] }),
}));

vi.mock("@/modules/orders/data/get-order-refunds", () => ({
	getOrderRefunds: vi.fn().mockResolvedValue({ refunds: [] }),
}));

vi.mock("@/modules/orders/services/order-status-validation.service", () => ({
	getOrderPermissions: vi.fn().mockReturnValue({
		canRefund: false,
		canUpdateTracking: false,
		canCancel: false,
		canMarkAsPaid: false,
		canMarkAsProcessing: false,
		canMarkAsShipped: false,
		canMarkAsDelivered: false,
		canMarkAsReturned: false,
		canDelete: false,
		canRevertToProcessing: false,
	}),
}));

vi.mock("@/modules/orders/components/admin/order-detail/order-header", () => ({
	OrderHeader: ({ order }: { order: { orderNumber: string }; notesCount: number }) => (
		<div data-testid="order-header">{order.orderNumber}</div>
	),
}));

vi.mock("@/modules/orders/components/admin/order-progress-stepper", () => ({
	OrderProgressStepper: () => <div data-testid="order-progress-stepper" />,
}));

vi.mock("@/modules/orders/components/admin/order-detail/order-alerts", () => ({
	OrderAlerts: () => <div data-testid="order-alerts" />,
}));

vi.mock("@/modules/orders/components/admin/order-detail/order-status-badges", () => ({
	OrderStatusBadges: () => <div data-testid="order-status-badges" />,
}));

vi.mock("@/modules/orders/components/admin/order-detail/order-items-card", () => ({
	OrderItemsCard: () => <div data-testid="order-items-card" />,
}));

vi.mock("@/modules/orders/components/admin/order-detail/order-shipping-card", () => ({
	OrderShippingCard: () => <div data-testid="order-shipping-card" />,
}));

vi.mock("@/modules/orders/components/admin/order-detail/order-customer-card", () => ({
	OrderCustomerCard: () => <div data-testid="order-customer-card" />,
}));

vi.mock("@/modules/orders/components/admin/order-detail/order-refunds-card", () => ({
	OrderRefundsCard: () => <div data-testid="order-refunds-card" />,
}));

vi.mock("@/modules/orders/components/admin/order-detail/order-address-card", () => ({
	OrderAddressCard: () => <div data-testid="order-address-card" />,
}));

vi.mock("@/modules/orders/components/admin/order-detail/order-payment-card", () => ({
	OrderPaymentCard: () => <div data-testid="order-payment-card" />,
}));

vi.mock("@/modules/orders/components/admin/order-history-timeline", () => ({
	OrderHistoryTimeline: () => <div data-testid="order-history-timeline" />,
}));

import { OrderDetailPage } from "../order-detail-page";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

// ============================================================================
// HELPERS
// ============================================================================

function createOrder(overrides: Partial<GetOrderReturn> = {}): GetOrderReturn {
	return {
		id: "order-1",
		orderNumber: "CMD-001",
		status: "PROCESSING",
		paymentStatus: "PAID",
		fulfillmentStatus: "UNFULFILLED",
		subtotal: 4000,
		discountAmount: 0,
		shippingCost: 500,
		taxAmount: 200,
		total: 4700,
		trackingNumber: null,
		trackingUrl: null,
		shippedAt: null,
		items: [],
		history: [],
		...overrides,
	} as unknown as GetOrderReturn;
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("OrderDetailPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without crashing", async () => {
		const jsx = await OrderDetailPage({ order: createOrder() });
		render(jsx);
		expect(screen.getByTestId("order-header")).toBeInTheDocument();
	});

	it("renders order header with order number", async () => {
		const jsx = await OrderDetailPage({ order: createOrder({ orderNumber: "CMD-999" }) });
		render(jsx);
		expect(screen.getByTestId("order-header")).toHaveTextContent("CMD-999");
	});

	it("renders progress stepper", async () => {
		const jsx = await OrderDetailPage({ order: createOrder() });
		render(jsx);
		expect(screen.getByTestId("order-progress-stepper")).toBeInTheDocument();
	});

	it("renders order alerts", async () => {
		const jsx = await OrderDetailPage({ order: createOrder() });
		render(jsx);
		expect(screen.getByTestId("order-alerts")).toBeInTheDocument();
	});

	it("renders order status badges", async () => {
		const jsx = await OrderDetailPage({ order: createOrder() });
		render(jsx);
		expect(screen.getByTestId("order-status-badges")).toBeInTheDocument();
	});

	it("renders order items card", async () => {
		const jsx = await OrderDetailPage({ order: createOrder() });
		render(jsx);
		expect(screen.getByTestId("order-items-card")).toBeInTheDocument();
	});

	it("renders order customer card", async () => {
		const jsx = await OrderDetailPage({ order: createOrder() });
		render(jsx);
		expect(screen.getByTestId("order-customer-card")).toBeInTheDocument();
	});

	it("renders order refunds card", async () => {
		const jsx = await OrderDetailPage({ order: createOrder() });
		render(jsx);
		expect(screen.getByTestId("order-refunds-card")).toBeInTheDocument();
	});

	it("renders order address card", async () => {
		const jsx = await OrderDetailPage({ order: createOrder() });
		render(jsx);
		expect(screen.getByTestId("order-address-card")).toBeInTheDocument();
	});

	it("renders order payment card", async () => {
		const jsx = await OrderDetailPage({ order: createOrder() });
		render(jsx);
		expect(screen.getByTestId("order-payment-card")).toBeInTheDocument();
	});

	it("renders order history timeline", async () => {
		const jsx = await OrderDetailPage({ order: createOrder() });
		render(jsx);
		expect(screen.getByTestId("order-history-timeline")).toBeInTheDocument();
	});

	it("does not render shipping card when trackingNumber and shippedAt are null", async () => {
		const jsx = await OrderDetailPage({
			order: createOrder({ trackingNumber: null, shippedAt: null }),
		});
		render(jsx);
		expect(screen.queryByTestId("order-shipping-card")).not.toBeInTheDocument();
	});

	it("renders shipping card when trackingNumber is set", async () => {
		const jsx = await OrderDetailPage({
			order: createOrder({ trackingNumber: "TRACK123" }),
		});
		render(jsx);
		expect(screen.getByTestId("order-shipping-card")).toBeInTheDocument();
	});
});
