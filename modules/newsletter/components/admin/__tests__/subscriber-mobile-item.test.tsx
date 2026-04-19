import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockOpen, mockUseDialog } = vi.hoisted(() => {
	const mockOpen = vi.fn();
	return {
		mockOpen,
		mockUseDialog: vi.fn(() => ({ open: mockOpen, isOpen: false, close: vi.fn() })),
	};
});

vi.mock("@/shared/providers/dialog-store-provider", () => ({ useDialog: mockUseDialog }));
vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/shared/lib/stripe", () => ({ stripe: {} }));
vi.mock("./subscriber-item-drawer", () => ({
	SUBSCRIBER_ITEM_DRAWER_ID: "subscriber-item-drawer",
}));

vi.mock("@/shared/components/ui/item", () => ({
	Item: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { SubscriberMobileItem } from "../subscriber-mobile-item";

afterEach(cleanup);

const SUBSCRIBER = {
	id: "sub-1",
	email: "alice@example.com",
	status: "CONFIRMED" as const,
	subscribedAt: new Date("2026-04-01"),
};

describe("SubscriberMobileItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the subscriber email", () => {
		render(<SubscriberMobileItem subscriber={SUBSCRIBER} />);

		expect(screen.getByText("alice@example.com")).toBeInTheDocument();
	});

	it("renders accessible label with email", () => {
		render(<SubscriberMobileItem subscriber={SUBSCRIBER} />);

		expect(screen.getByRole("button", { name: /Abonné alice@example.com/i })).toBeInTheDocument();
	});

	it("opens drawer with subscriber data on click", async () => {
		render(<SubscriberMobileItem subscriber={SUBSCRIBER} />);

		await userEvent.click(screen.getByRole("button"));

		expect(mockOpen).toHaveBeenCalledWith({ subscriber: SUBSCRIBER });
	});

	it("displays CONFIRMED status label", () => {
		render(<SubscriberMobileItem subscriber={SUBSCRIBER} />);

		expect(screen.getByText("Confirmé")).toBeInTheDocument();
	});

	it("displays PENDING status label", () => {
		render(<SubscriberMobileItem subscriber={{ ...SUBSCRIBER, status: "PENDING" }} />);

		expect(screen.getByText("En attente")).toBeInTheDocument();
	});

	it("displays UNSUBSCRIBED status label", () => {
		render(<SubscriberMobileItem subscriber={{ ...SUBSCRIBER, status: "UNSUBSCRIBED" }} />);

		expect(screen.getByText("Désabonné")).toBeInTheDocument();
	});

	it("renders the formatted subscription date", () => {
		render(<SubscriberMobileItem subscriber={SUBSCRIBER} />);

		expect(screen.getByText(/Inscrit le/)).toBeInTheDocument();
	});
});
