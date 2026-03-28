import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

// Import AFTER mocks
import { Avatar, AvatarFallback, AvatarImage } from "../avatar";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Avatar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders an avatar container", () => {
		const { container } = render(<Avatar />);
		expect(container.querySelector("[data-slot='avatar']")).toBeInTheDocument();
	});

	it("has data-slot=avatar", () => {
		const { container } = render(<Avatar />);
		expect(container.querySelector("[data-slot='avatar']")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		const { container } = render(<Avatar className="size-12" />);
		expect(container.querySelector("[data-slot='avatar']")).toHaveClass("size-12");
	});

	it("renders children", () => {
		const { container } = render(
			<Avatar>
				<AvatarFallback>AB</AvatarFallback>
			</Avatar>,
		);
		expect(screen.getByText("AB")).toBeInTheDocument();
	});
});

describe("AvatarFallback", () => {
	it("renders with data-slot=avatar-fallback", () => {
		const { container } = render(
			<Avatar>
				<AvatarFallback>JD</AvatarFallback>
			</Avatar>,
		);
		expect(container.querySelector("[data-slot='avatar-fallback']")).toBeInTheDocument();
	});

	it("renders fallback text", () => {
		render(
			<Avatar>
				<AvatarFallback>JD</AvatarFallback>
			</Avatar>,
		);
		expect(screen.getByText("JD")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		const { container } = render(
			<Avatar>
				<AvatarFallback className="text-destructive">AB</AvatarFallback>
			</Avatar>,
		);
		expect(container.querySelector("[data-slot='avatar-fallback']")).toHaveClass(
			"text-destructive",
		);
	});
});

describe("AvatarImage", () => {
	it("accepts src and alt props without throwing", () => {
		// AvatarImage hides itself in jsdom (image load fails), but it must not throw
		expect(() =>
			render(
				<Avatar>
					<AvatarImage src="https://example.com/avatar.jpg" alt="User avatar" />
				</Avatar>,
			),
		).not.toThrow();
	});
});
