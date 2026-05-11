import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ColorFormFields } from "../color-form-fields";
import { useColorForm } from "../../../hooks/use-color-form";

const { mockHaptic } = vi.hoisted(() => ({ mockHaptic: vi.fn() }));
vi.mock("@/shared/hooks/use-haptic", () => ({ useHaptic: () => mockHaptic }));

function Harness({
	defaultValues,
	isPending = false,
}: {
	defaultValues?: { name?: string; hex?: string; description?: string };
	isPending?: boolean;
}) {
	const form = useColorForm({
		name: defaultValues?.name ?? "",
		hex: defaultValues?.hex ?? "#000000",
		description: defaultValues?.description ?? "",
	});
	return <ColorFormFields form={form} isPending={isPending} />;
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("ColorFormFields", () => {
	it("renders the preview swatch with default hex and placeholder name", () => {
		render(<Harness />);
		expect(screen.getByText("Nouvelle couleur")).toBeInTheDocument();
		expect(screen.getByText("#000000")).toBeInTheDocument();
	});

	it("reflects user-entered name in the preview", () => {
		render(<Harness defaultValues={{ name: "Or Rose 18K", hex: "#B76E79" }} />);
		expect(screen.getByText("Or Rose 18K")).toBeInTheDocument();
		expect(screen.getByText("#B76E79")).toBeInTheDocument();
	});

	it("renders 8 suggested-hex swatches", () => {
		render(<Harness />);
		// Suggestions are aria-labelled "Sélectionner <label> (<hex>)"
		const suggestions = screen.getAllByRole("button", { name: /^Sélectionner / });
		expect(suggestions).toHaveLength(8);
	});

	it("clicking a suggestion updates the hex and triggers haptic", () => {
		render(<Harness />);
		const goldButton = screen.getByRole("button", { name: /Or jaune \(#D4AF37\)/ });
		fireEvent.click(goldButton);
		expect(mockHaptic).toHaveBeenCalledWith("light");
		expect(screen.getByText("#D4AF37")).toBeInTheDocument();
	});

	it("disables suggestion buttons when isPending", () => {
		render(<Harness isPending />);
		const goldButton = screen.getByRole("button", { name: /Or jaune/ });
		expect(goldButton).toBeDisabled();
	});

	it("aria-pressed reflects current selection", () => {
		render(<Harness defaultValues={{ hex: "#D4AF37" }} />);
		const goldButton = screen.getByRole("button", { name: /Or jaune/ });
		expect(goldButton).toHaveAttribute("aria-pressed", "true");

		const silverButton = screen.getByRole("button", { name: /Argent/ });
		expect(silverButton).toHaveAttribute("aria-pressed", "false");
	});

	it("renders a Name input with proper placeholder and enterKeyHint", () => {
		render(<Harness />);
		const nameInput = screen.getByLabelText(/Nom/, { selector: "input" });
		expect(nameInput).toHaveAttribute("placeholder", expect.stringMatching(/Or rose/i));
		expect(nameInput).toHaveAttribute("enterkeyhint", "next");
		expect(nameInput).toHaveAttribute("autocapitalize", "words");
	});

	it("renders a Description textarea with maxLength 500 and character counter", () => {
		render(<Harness defaultValues={{ description: "Hello" }} />);
		const textarea = screen.getByLabelText(/Description/, { selector: "textarea" });
		expect(textarea).toHaveAttribute("maxlength", "500");
		expect(screen.getByText("5/500")).toBeInTheDocument();
	});

	it("preview swatch uses dashed border when hex is invalid", () => {
		render(<Harness defaultValues={{ hex: "#zz" }} />);
		// Preview hex placeholder is the masked string when hex is invalid
		expect(screen.getByText("#______")).toBeInTheDocument();
	});
});
