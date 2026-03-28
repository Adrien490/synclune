import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { CustomizationSidebar } from "../customization-sidebar";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CustomizationSidebar", () => {
	it("renders the section heading", () => {
		render(<CustomizationSidebar />);
		expect(screen.getByText("Comment ça marche ?")).toBeInTheDocument();
	});

	it("renders the accessible aside landmark", () => {
		render(<CustomizationSidebar />);
		expect(
			screen.getByRole("complementary", { name: "Informations sur le processus" }),
		).toBeInTheDocument();
	});

	it("renders the ordered list of steps", () => {
		render(<CustomizationSidebar />);
		expect(screen.getByRole("list", { name: "Étapes du processus" })).toBeInTheDocument();
	});

	it("renders all 3 step titles", () => {
		render(<CustomizationSidebar />);
		expect(screen.getByText("Décrivez votre idée")).toBeInTheDocument();
		expect(screen.getByText("On échange ensemble")).toBeInTheDocument();
		expect(screen.getByText("Je crée votre bijou")).toBeInTheDocument();
	});

	it("renders step numbers 1, 2, 3", () => {
		render(<CustomizationSidebar />);
		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("renders step descriptions", () => {
		render(<CustomizationSidebar />);
		expect(screen.getByText(/Remplissez le formulaire/)).toBeInTheDocument();
		expect(screen.getByText(/Je vous recontacte/)).toBeInTheDocument();
		expect(screen.getByText(/pièce unique à la main/)).toBeInTheDocument();
	});
});
