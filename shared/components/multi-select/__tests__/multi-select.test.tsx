import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("lucide-react", () => ({
	ChevronDown: () => <svg data-testid="icon-chevron-down" />,
	X: () => <svg data-testid="icon-x" />,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, className }: any) => (
		<span className={className} data-testid="badge">
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, onClick, disabled, role, className, type = "button", ...props }: any) => (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled}
			role={role}
			className={className}
			{...props}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({ checked, onCheckedChange, "aria-label": ariaLabel }: any) => (
		<input
			type="checkbox"
			checked={checked === true}
			aria-label={ariaLabel}
			onChange={(e) => onCheckedChange?.(e.target.checked)}
			data-testid="checkbox"
		/>
	),
}));

vi.mock("@/shared/components/ui/popover", () => ({
	Popover: ({ children, open }: any) => (
		<div data-testid="popover" data-open={String(open)}>
			{children}
		</div>
	),
	PopoverContent: ({ children, role, className, "aria-label": ariaLabel }: any) => (
		<div data-testid="popover-content" role={role} aria-label={ariaLabel} className={className}>
			{children}
		</div>
	),
	PopoverTrigger: ({ children }: any) => <div data-testid="popover-trigger">{children}</div>,
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: ({ orientation }: any) => (
		<hr data-testid="separator" data-orientation={orientation} />
	),
}));

import { MultiSelect } from "../multi-select";

const OPTIONS = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta" },
	{ value: "c", label: "Gamma" },
];

afterEach(cleanup);

describe("MultiSelect", () => {
	it("renders placeholder when no selection", () => {
		render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} placeholder="Choisir" />);
		expect(screen.getByText("Choisir")).toBeTruthy();
	});

	it("uses default placeholder", () => {
		render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
		expect(screen.getByText("Sélectionner")).toBeTruthy();
	});

	it("renders trigger as combobox", () => {
		render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
		const trigger = screen.getByRole("combobox");
		expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
	});

	it("renders one badge per selected value", () => {
		render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} defaultValue={["a", "b"]} />);
		const badges = screen.getAllByTestId("badge");
		expect(badges).toHaveLength(2);
		expect(badges[0]!.textContent).toContain("Alpha");
		expect(badges[1]!.textContent).toContain("Beta");
	});

	it("renders one checkbox per option in the listbox", () => {
		render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
		expect(screen.getAllByTestId("checkbox")).toHaveLength(3);
	});

	it("calls onValueChange with the new value when toggling an option", () => {
		const onValueChange = vi.fn();
		render(<MultiSelect options={OPTIONS} onValueChange={onValueChange} />);
		fireEvent.click(screen.getAllByTestId("checkbox")[0]!);
		expect(onValueChange).toHaveBeenCalledWith(["a"]);
	});

	it("removes a value when toggled off", () => {
		const onValueChange = vi.fn();
		render(
			<MultiSelect options={OPTIONS} onValueChange={onValueChange} defaultValue={["a", "b"]} />,
		);
		fireEvent.click(screen.getAllByTestId("checkbox")[0]!);
		expect(onValueChange).toHaveBeenCalledWith(["b"]);
	});

	it("removes a value via badge X button", () => {
		const onValueChange = vi.fn();
		render(<MultiSelect options={OPTIONS} onValueChange={onValueChange} defaultValue={["a"]} />);
		fireEvent.click(screen.getByLabelText("Retirer Alpha"));
		expect(onValueChange).toHaveBeenCalledWith([]);
	});

	it("clears the entire selection via the trigger X button", () => {
		const onValueChange = vi.fn();
		render(
			<MultiSelect options={OPTIONS} onValueChange={onValueChange} defaultValue={["a", "b"]} />,
		);
		fireEvent.click(screen.getByLabelText("Effacer les 2 options sélectionnées"));
		expect(onValueChange).toHaveBeenCalledWith([]);
	});

	it("renders empty state when there are no options", () => {
		render(<MultiSelect options={[]} onValueChange={vi.fn()} />);
		expect(screen.getByText("Aucune option disponible")).toBeTruthy();
	});

	it("disables the trigger when disabled", () => {
		render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} disabled />);
		expect((screen.getByRole("combobox") as HTMLButtonElement).disabled).toBe(true);
	});

	it("does not call onValueChange when disabled", () => {
		const onValueChange = vi.fn();
		render(<MultiSelect options={OPTIONS} onValueChange={onValueChange} disabled />);
		fireEvent.click(screen.getAllByTestId("checkbox")[0]!);
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("propagates aria-describedby to trigger", () => {
		render(
			<MultiSelect options={OPTIONS} onValueChange={vi.fn()} aria-describedby="external-desc" />,
		);
		expect(screen.getByRole("combobox").getAttribute("aria-describedby")).toBe("external-desc");
	});
});
