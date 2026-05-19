import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/animations", () => ({
	Fade: ({ children }: { children: React.ReactNode }) => <div data-testid="fade">{children}</div>,
	HandDrawnUnderline: () => <span data-testid="hand-drawn-underline" aria-hidden="true" />,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: { duration: { emphasis: 0.4 } },
}));

import { NotFoundContent } from "../not-found-content";

describe("NotFoundContent", () => {
	afterEach(() => {
		cleanup();
	});

	const defaultProps = {
		emoji: (
			<p data-testid="emoji" aria-hidden="true">
				😥
			</p>
		),
		title: <h1>Page introuvable</h1>,
		description: <p data-testid="description">Description text</p>,
		actions: (
			<div data-testid="actions">
				<button>CTA</button>
			</div>
		),
	};

	it("renders all four props (emoji, title, description, actions)", () => {
		render(<NotFoundContent {...defaultProps} />);
		expect(screen.getByTestId("emoji")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { level: 1, name: /page introuvable/i }),
		).toBeInTheDocument();
		expect(screen.getByTestId("description")).toBeInTheDocument();
		expect(screen.getByTestId("actions")).toBeInTheDocument();
	});

	it("exposes the title h1 via heading role for screen readers", () => {
		render(<NotFoundContent {...defaultProps} />);
		const h1 = screen.getByRole("heading", { level: 1 });
		expect(h1).toHaveTextContent("Page introuvable");
	});

	it("wraps title+description in aria-live polite for SR announcement", () => {
		render(<NotFoundContent {...defaultProps} />);
		const live = screen.getByTestId("description").closest('[aria-live="polite"]');
		expect(live).not.toBeNull();
		expect(live).toHaveAttribute("aria-atomic", "true");
	});

	it("renders HandDrawnUnderline signature under the title", () => {
		render(<NotFoundContent {...defaultProps} />);
		expect(screen.getByTestId("hand-drawn-underline")).toBeInTheDocument();
	});

	it("renders 3 Fade wrappers for the cascade animation", () => {
		render(<NotFoundContent {...defaultProps} />);
		expect(screen.getAllByTestId("fade")).toHaveLength(3);
	});

	it("accepts any ReactNode for emoji/title/description/actions", () => {
		render(
			<NotFoundContent
				emoji="🔒"
				title={<h2>Custom heading level</h2>}
				description={<span>Inline description</span>}
				actions={<button type="button">Single CTA</button>}
			/>,
		);
		expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Custom heading level");
		expect(screen.getByRole("button", { name: /single cta/i })).toBeInTheDocument();
	});
});
