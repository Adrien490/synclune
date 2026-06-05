import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OrdersClosedNotice } from "../orders-closed-notice";
import { ORDERS_PAUSED_NOTICE } from "@/shared/constants/orders-availability";

afterEach(cleanup);

describe("OrdersClosedNotice", () => {
	it("renders an alert with the pause title and body (SSOT orders-availability)", () => {
		render(<OrdersClosedNotice />);

		const alert = screen.getByRole("alert");
		expect(alert).toHaveTextContent(ORDERS_PAUSED_NOTICE.title);
		expect(alert).toHaveTextContent(ORDERS_PAUSED_NOTICE.body);
	});

	it("exposes the contact e-mail as a clickable mailto link", () => {
		render(<OrdersClosedNotice />);

		const link = screen.getByRole("link", { name: ORDERS_PAUSED_NOTICE.email });
		expect(link).toHaveAttribute("href", `mailto:${ORDERS_PAUSED_NOTICE.email}`);
	});

	it("uses the info variant (coherent with the Info icon)", () => {
		render(<OrdersClosedNotice />);

		expect(screen.getByRole("alert").className).toContain("bg-info/10");
	});

	it("does not truncate the title (line-clamp removed for mobile legibility)", () => {
		render(<OrdersClosedNotice />);

		const title = screen.getByRole("alert").querySelector('[data-slot="alert-title"]');
		expect(title?.className).toContain("line-clamp-none");
		expect(title?.className).not.toContain("line-clamp-1");
	});

	it("forwards className to the alert wrapper", () => {
		render(<OrdersClosedNotice className="mt-4" />);

		expect(screen.getByRole("alert").className).toContain("mt-4");
	});

	it("forwards id so a disabled CTA can reference it via aria-describedby", () => {
		render(<OrdersClosedNotice id="orders-paused-hint" />);

		expect(screen.getByRole("alert")).toHaveAttribute("id", "orders-paused-hint");
	});
});
