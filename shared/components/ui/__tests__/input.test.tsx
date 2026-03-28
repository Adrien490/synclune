import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
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

vi.mock("lucide-react", () => ({
	X: () => <svg data-testid="icon-x" />,
}));

// Import AFTER mocks
import { Input } from "../input";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Input", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Simple input (no icons) ──────────────────────────────────────────────

	it("renders a plain input when no icons or clearable", () => {
		const { container } = render(<Input />);
		expect(container.querySelector("input")).toBeInTheDocument();
		expect(container.querySelector("div.relative")).not.toBeInTheDocument();
	});

	it("has data-slot=input", () => {
		const { container } = render(<Input />);
		expect(container.querySelector("[data-slot='input']")).toBeInTheDocument();
	});

	it("forwards type prop", () => {
		const { container } = render(<Input type="email" />);
		expect(container.querySelector("input")).toHaveAttribute("type", "email");
	});

	it("applies custom className to plain input", () => {
		const { container } = render(<Input className="custom" />);
		expect(container.querySelector("input")).toHaveClass("custom");
	});

	// ─── startIcon ────────────────────────────────────────────────────────────

	it("renders wrapper div when startIcon provided", () => {
		const { container } = render(<Input startIcon={<svg data-testid="start-icon" />} />);
		expect(container.querySelector("div.relative")).toBeInTheDocument();
	});

	it("renders startIcon with aria-hidden wrapper", () => {
		const { container } = render(<Input startIcon={<svg data-testid="start-icon" />} />);
		const iconWrapper = container.querySelector('[aria-hidden="true"]');
		expect(iconWrapper).toBeInTheDocument();
	});

	it("applies pl-10 class to input when startIcon provided", () => {
		const { container } = render(<Input startIcon={<svg />} />);
		expect(container.querySelector("input")).toHaveClass("pl-10");
	});

	// ─── endIcon ──────────────────────────────────────────────────────────────

	it("renders wrapper div when endIcon provided", () => {
		const { container } = render(<Input endIcon={<svg data-testid="end-icon" />} />);
		expect(container.querySelector("div.relative")).toBeInTheDocument();
	});

	it("applies pr-10 class to input when endIcon provided", () => {
		const { container } = render(<Input endIcon={<svg />} />);
		expect(container.querySelector("input")).toHaveClass("pr-10");
	});

	// ─── clearable ────────────────────────────────────────────────────────────

	it("does not show clear button when clearable but value is empty", () => {
		render(<Input clearable value="" onChange={vi.fn()} />);
		expect(screen.queryByRole("button", { name: "Effacer le champ" })).not.toBeInTheDocument();
	});

	it("shows clear button when clearable and value is non-empty", () => {
		render(<Input clearable value="hello" onChange={vi.fn()} />);
		expect(screen.getByRole("button", { name: "Effacer le champ" })).toBeInTheDocument();
	});

	it("calls onClear when clear button is clicked", async () => {
		const onClear = vi.fn();
		render(<Input clearable value="hello" onChange={vi.fn()} onClear={onClear} />);
		await userEvent.click(screen.getByRole("button", { name: "Effacer le champ" }));
		expect(onClear).toHaveBeenCalledTimes(1);
	});

	it("shows X icon in clear button", () => {
		render(<Input clearable value="text" onChange={vi.fn()} />);
		expect(screen.getByTestId("icon-x")).toBeInTheDocument();
	});

	it("does not show endIcon when clearable and value is empty (showClearButton=false overrides nullish coalescing)", () => {
		const { container } = render(
			<Input clearable value="" onChange={vi.fn()} endIcon={<svg data-testid="end-icon" />} />,
		);
		// showClearButton is false (not undefined), so `false ?? hasEndIcon` = false — nothing shown
		expect(container.querySelector("[data-testid='end-icon']")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Effacer le champ" })).not.toBeInTheDocument();
	});

	it("shows clear button (not endIcon) when clearable and value is present", () => {
		render(
			<Input clearable value="abc" onChange={vi.fn()} endIcon={<svg data-testid="end-icon" />} />,
		);
		expect(screen.getByRole("button", { name: "Effacer le champ" })).toBeInTheDocument();
	});

	// ─── size variant ─────────────────────────────────────────────────────────

	it("applies sm size class", () => {
		const { container } = render(<Input size="sm" />);
		expect(container.querySelector("input")).toHaveClass("min-h-9");
	});
});
