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

		expect(screen.getByText("Aperçu")).toBeInTheDocument();
	});

	it("should render sparkle decorations as aria-hidden", () => {
		render(<AnnouncementPreview message="Test" />);

		const sparkles = screen.getAllByText("✦");
		expect(sparkles).toHaveLength(2);
		for (const sparkle of sparkles) {
			expect(sparkle).toHaveAttribute("aria-hidden", "true");
		}
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
