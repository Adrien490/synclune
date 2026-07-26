import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockTriggerHaptic = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockTriggerHaptic,
}));

import { FormServerErrorAlert } from "../form-server-error-alert";

afterEach(() => {
	cleanup();
	mockTriggerHaptic.mockClear();
});

describe("FormServerErrorAlert", () => {
	it("ne rend rien sans erreur", () => {
		const { container } = render(<FormServerErrorAlert errors={[]} />);
		expect(container).toBeEmptyDOMElement();
	});

	it("rend une alerte assertive focusable avec le message", () => {
		render(<FormServerErrorAlert errors={["Le titre est déjà utilisé"]} />);

		const alert = screen.getByRole("alert");
		expect(alert).toHaveAttribute("aria-live", "assertive");
		expect(alert).toHaveAttribute("tabindex", "-1");
		expect(alert).toHaveTextContent("Le titre est déjà utilisé");
	});

	it("prend le focus et déclenche l'haptique à l'apparition", () => {
		render(<FormServerErrorAlert errors={["Erreur serveur"]} />);

		expect(screen.getByRole("alert")).toHaveFocus();
		expect(mockTriggerHaptic).toHaveBeenCalledWith("error");
	});

	it("rend une liste quand plusieurs erreurs", () => {
		render(<FormServerErrorAlert errors={["Erreur A", "Erreur B"]} />);

		const items = screen.getAllByRole("listitem");
		expect(items).toHaveLength(2);
	});
});
