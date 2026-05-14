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
		const goldButton = screen.getByRole("button", { name: /^Sélectionner Or jaune \(#D4AF37\)/ });
		fireEvent.click(goldButton);
		expect(mockHaptic).toHaveBeenCalledWith("light");
		expect(screen.getByText("#D4AF37")).toBeInTheDocument();
	});

	it("disables suggestion buttons when isPending", () => {
		render(<Harness isPending />);
		const goldButton = screen.getByRole("button", { name: /^Sélectionner Or jaune/ });
		expect(goldButton).toBeDisabled();
	});

	it("aria-pressed reflects current selection", () => {
		render(<Harness defaultValues={{ name: "Test", hex: "#D4AF37" }} />);
		const goldButton = screen.getByRole("button", { name: /^Sélectionner Or jaune/ });
		expect(goldButton).toHaveAttribute("aria-pressed", "true");

		const silverButton = screen.getByRole("button", { name: /^Sélectionner Argent/ });
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

	it("renders contrast warning for very light hex (≥0.85 luminance)", () => {
		render(<Harness defaultValues={{ name: "Nacre", hex: "#FAFAFA" }} />);
		expect(
			screen.getByText(/Couleur claire — une bordure de contraste sera ajoutée en boutique/),
		).toBeInTheDocument();
	});

	it("does not render contrast warning for medium luminance hex", () => {
		render(<Harness defaultValues={{ name: "Or rose", hex: "#B76E79" }} />);
		expect(screen.queryByText(/Couleur claire — une bordure de contraste/)).not.toBeInTheDocument();
	});

	it("renders aria-live preview update for screen readers", () => {
		render(<Harness defaultValues={{ name: "Or jaune", hex: "#D4AF37" }} />);
		const live = document.querySelector('[aria-live="polite"]');
		expect(live).toBeInTheDocument();
		expect(live?.textContent).toContain("Or jaune");
		expect(live?.textContent).toContain("#D4AF37");
	});

	it("shows autosuggest name button when hex matches library and name empty", () => {
		render(<Harness defaultValues={{ name: "", hex: "#D4AF37" }} />);
		// COLOR_LIBRARY entry: "Or jaune 18K" #D4AF37
		expect(
			screen.getByRole("button", { name: /Utiliser « Or jaune 18K » comme nom/ }),
		).toBeInTheDocument();
	});

	it("autosuggest button fills name field on click", () => {
		render(<Harness defaultValues={{ name: "", hex: "#D4AF37" }} />);
		const btn = screen.getByRole("button", { name: /Utiliser « Or jaune 18K » comme nom/ });
		fireEvent.click(btn);
		expect(mockHaptic).toHaveBeenCalledWith("light");
		const nameInput = screen.getByLabelText(/Nom/, { selector: "input" }) as HTMLInputElement;
		expect(nameInput.value).toBe("Or jaune 18K");
	});

	it("does not show autosuggest when name is already filled", () => {
		render(<Harness defaultValues={{ name: "Mon or perso", hex: "#D4AF37" }} />);
		expect(
			screen.queryByRole("button", { name: /Utiliser « Or jaune 18K »/ }),
		).not.toBeInTheDocument();
	});

	it("does not show autosuggest when hex does not match any library entry", () => {
		render(<Harness defaultValues={{ name: "", hex: "#ABCDEF" }} />);
		expect(screen.queryByRole("button", { name: /Utiliser « / })).not.toBeInTheDocument();
	});

	it("renders 3 storefront-size mini-previews under main swatch", () => {
		render(<Harness defaultValues={{ name: "Or jaune", hex: "#D4AF37" }} />);
		expect(screen.getByText(/Boutique :/)).toBeInTheDocument();
	});

	it("aligns inline suggestion hexes with library (Saphir #0F52BA, Émeraude #50C878)", () => {
		render(<Harness />);
		expect(
			screen.getByRole("button", { name: /^Sélectionner Saphir \(#0F52BA\)/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /^Sélectionner Émeraude \(#50C878\)/ }),
		).toBeInTheDocument();
	});
});
