import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { AnnouncementPreview } from "../announcement-preview";

// ============================================================================
// TESTS
// ============================================================================

describe("AnnouncementPreview", () => {
	beforeEach(() => {
		cleanup();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("should render the message", () => {
		render(<AnnouncementPreview message="Livraison offerte dès 50€" />);

		expect(screen.getByText("Livraison offerte dès 50€")).toBeInTheDocument();
	});

	it("should render the preview label", () => {
		render(<AnnouncementPreview message="Test" />);

		expect(screen.getByText("Aperçu storefront")).toBeInTheDocument();
	});

	it("should render link as fallback text when linkText is missing", () => {
		render(<AnnouncementPreview message="Promo" link="/soldes" />);

		expect(screen.getByText("/soldes")).toBeInTheDocument();
		expect(screen.getByText("Texte du lien requis quand un lien est spécifié")).toBeInTheDocument();
	});

	it("should render a fake disabled close button", () => {
		render(<AnnouncementPreview message="Promo" />);

		const closeButton = screen.getByRole("button", { hidden: true });
		expect(closeButton).toBeDisabled();
		expect(closeButton).toHaveAttribute("aria-hidden", "true");
	});

	// ─── Link text ────────────────────────────────────────────────────────────

	it("should render linkText when provided", () => {
		render(<AnnouncementPreview message="Promo" linkText="En profiter" />);

		expect(screen.getByText("En profiter")).toBeInTheDocument();
	});

	it("should render dot separator when linkText is provided", () => {
		render(<AnnouncementPreview message="Promo" linkText="Voir" />);

		const separator = screen.getByText("·");
		expect(separator).toHaveAttribute("aria-hidden", "true");
	});

	it("should not render linkText when not provided", () => {
		render(<AnnouncementPreview message="Promo" />);

		expect(screen.queryByText("·")).not.toBeInTheDocument();
	});

	it("should not render linkText when null", () => {
		render(<AnnouncementPreview message="Promo" linkText={null} />);

		expect(screen.queryByText("·")).not.toBeInTheDocument();
	});

	// ─── Empty state ──────────────────────────────────────────────────────────

	it("should return null when message is empty", () => {
		const { container } = render(<AnnouncementPreview message="" />);

		expect(container.innerHTML).toBe("");
	});
});
