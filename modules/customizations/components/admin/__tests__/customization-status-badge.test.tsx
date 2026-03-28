import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { CustomizationStatusBadge } from "../customization-status-badge";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CustomizationStatusBadge", () => {
	it("renders the PENDING label", () => {
		render(<CustomizationStatusBadge status="PENDING" />);
		expect(screen.getByText("En attente")).toBeInTheDocument();
	});

	it("renders the IN_PROGRESS label", () => {
		render(<CustomizationStatusBadge status="IN_PROGRESS" />);
		expect(screen.getByText("En cours")).toBeInTheDocument();
	});

	it("renders the COMPLETED label", () => {
		render(<CustomizationStatusBadge status="COMPLETED" />);
		expect(screen.getByText("Terminé")).toBeInTheDocument();
	});

	it("renders the CANCELLED label", () => {
		render(<CustomizationStatusBadge status="CANCELLED" />);
		expect(screen.getByText("Annulé")).toBeInTheDocument();
	});

	it("renders the symbol for PENDING", () => {
		render(<CustomizationStatusBadge status="PENDING" />);
		expect(screen.getByText("⏳")).toBeInTheDocument();
	});

	it("renders the symbol for COMPLETED", () => {
		render(<CustomizationStatusBadge status="COMPLETED" />);
		expect(screen.getByText("✓")).toBeInTheDocument();
	});

	it("renders the symbol for CANCELLED", () => {
		render(<CustomizationStatusBadge status="CANCELLED" />);
		expect(screen.getByText("✗")).toBeInTheDocument();
	});

	it("applies amber classes for PENDING", () => {
		const { container } = render(<CustomizationStatusBadge status="PENDING" />);
		const badge = container.firstChild as HTMLElement;
		expect(badge.className).toContain("bg-amber-50");
		expect(badge.className).toContain("text-amber-700");
	});

	it("applies green classes for COMPLETED", () => {
		const { container } = render(<CustomizationStatusBadge status="COMPLETED" />);
		const badge = container.firstChild as HTMLElement;
		expect(badge.className).toContain("bg-green-50");
		expect(badge.className).toContain("text-green-700");
	});

	it("applies a custom className", () => {
		const { container } = render(
			<CustomizationStatusBadge status="PENDING" className="my-custom-class" />,
		);
		const badge = container.firstChild as HTMLElement;
		expect(badge.className).toContain("my-custom-class");
	});
});
