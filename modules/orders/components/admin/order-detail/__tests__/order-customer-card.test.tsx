import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: any) => <div>{children}</div>,
	CardHeader: ({ children }: any) => <div>{children}</div>,
	CardTitle: ({ children }: any) => <div>{children}</div>,
	CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
	Phone: () => <svg aria-hidden="true" />,
	User: () => <svg aria-hidden="true" />,
}));

import { OrderCustomerCard } from "../order-customer-card";

afterEach(cleanup);

function createOrder(overrides = {}) {
	return {
		id: "order-1",
		customerName: "Marie Dupont",
		customerEmail: "marie@example.com",
		customerPhone: null,
		userId: "user-1",
		...overrides,
	} as any;
}

describe("OrderCustomerCard", () => {
	it("renders title Client", () => {
		render(<OrderCustomerCard order={createOrder()} />);
		expect(screen.getByText("Client")).toBeInTheDocument();
	});

	it("shows customer name", () => {
		render(<OrderCustomerCard order={createOrder({ customerName: "Jean Martin" })} />);
		expect(screen.getByText("Jean Martin")).toBeInTheDocument();
	});

	it("shows customer email", () => {
		render(<OrderCustomerCard order={createOrder({ customerEmail: "jean@example.com" })} />);
		expect(screen.getByText("jean@example.com")).toBeInTheDocument();
	});

	it("shows Client non enregistré when userId is null", () => {
		render(<OrderCustomerCard order={createOrder({ userId: null })} />);
		expect(screen.getByText("Client non enregistré")).toBeInTheDocument();
	});

	it("does not show Client non enregistré when userId is set", () => {
		render(<OrderCustomerCard order={createOrder({ userId: "user-42" })} />);
		expect(screen.queryByText("Client non enregistré")).toBeNull();
	});

	it("shows phone when customerPhone is present", () => {
		render(<OrderCustomerCard order={createOrder({ customerPhone: "+33612345678" })} />);
		expect(screen.getByText("+33612345678")).toBeInTheDocument();
	});

	it("hides phone section when customerPhone is null", () => {
		render(<OrderCustomerCard order={createOrder({ customerPhone: null })} />);
		expect(screen.queryByText(/\+336/)).toBeNull();
	});
});
