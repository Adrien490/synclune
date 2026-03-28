import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/utils/dates", () => ({
	formatRelativeDate: (date: Date | string) => `il y a X jours (${String(date).slice(0, 10)})`,
}));

import { RelativeDate } from "../relative-date";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("RelativeDate", () => {
	it("renders a time element", () => {
		render(<RelativeDate date={new Date("2026-01-15")} />);
		expect(document.querySelector("time")).not.toBeNull();
	});

	it("renders formatted relative date text", () => {
		render(<RelativeDate date={new Date("2026-01-15T00:00:00.000Z")} />);
		expect(screen.getByText(/il y a X jours/)).toBeInTheDocument();
	});

	it("accepts a string date", () => {
		render(<RelativeDate date="2026-01-15T00:00:00.000Z" />);
		expect(document.querySelector("time")).not.toBeNull();
	});

	it("sets dateTime attribute on time element", () => {
		render(<RelativeDate date={new Date("2026-01-15T00:00:00.000Z")} />);
		const time = document.querySelector("time");
		expect(time?.getAttribute("dateTime")).toContain("2026-01-15");
	});

	it("applies className to time element", () => {
		render(<RelativeDate date={new Date("2026-01-15")} className="text-sm" />);
		const time = document.querySelector("time");
		expect(time).toHaveClass("text-sm");
	});
});
