import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("motion/react", () => ({
	motion: {
		div: ({
			children,
			role,
			"aria-live": ariaLive,
		}: {
			children: React.ReactNode;
			role?: string;
			"aria-live"?: string;
			[key: string]: unknown;
		}) => (
			<div role={role as React.AriaRole} aria-live={ariaLive as React.AriaAttributes["aria-live"]}>
				{children}
			</div>
		),
	},
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		...rest
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[key: string]: unknown;
	}) => {
		if (asChild && React.isValidElement(children)) {
			return children;
		}
		return <button {...rest}>{children}</button>;
	},
}));

vi.mock("lucide-react", () => ({
	CircleCheck: ({ className }: { className?: string }) => (
		<svg data-testid="icon-circle-check" className={className} />
	),
}));

import React from "react";
import { CustomizationSubmissionSuccess } from "../customization-submission-success";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CustomizationSubmissionSuccess", () => {
	it("renders the success heading", () => {
		render(<CustomizationSubmissionSuccess data={null} />);
		expect(screen.getByText("Message envoyé !")).toBeInTheDocument();
	});

	it("renders the status region with aria-live", () => {
		render(<CustomizationSubmissionSuccess data={null} />);
		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("renders the confirmation message", () => {
		render(<CustomizationSubmissionSuccess data={null} />);
		expect(screen.getByText(/Je vous réponds dans les plus brefs délais/)).toBeInTheDocument();
	});

	it("renders the CircleCheck icon", () => {
		render(<CustomizationSubmissionSuccess data={null} />);
		expect(screen.getByTestId("icon-circle-check")).toBeInTheDocument();
	});

	it("renders 'Retour à la boutique' link", () => {
		render(<CustomizationSubmissionSuccess data={null} />);
		expect(screen.getByRole("link", { name: "Retour à la boutique" })).toHaveAttribute(
			"href",
			"/boutique",
		);
	});

	it("renders 'Envoyer une autre demande' link", () => {
		render(<CustomizationSubmissionSuccess data={null} />);
		expect(screen.getByRole("link", { name: "Envoyer une autre demande" })).toHaveAttribute(
			"href",
			"/personnalisation",
		);
	});

	it("shows summary data when firstName and productTypeLabel are provided", () => {
		render(
			<CustomizationSubmissionSuccess data={{ firstName: "Marie", productTypeLabel: "Bague" }} />,
		);
		expect(screen.getByText("Marie")).toBeInTheDocument();
		expect(screen.getByText("Bague")).toBeInTheDocument();
	});

	it("shows firstName in summary even without productTypeLabel", () => {
		render(<CustomizationSubmissionSuccess data={{ firstName: "Sophie", productTypeLabel: "" }} />);
		expect(screen.getByText("Sophie")).toBeInTheDocument();
	});

	it("does not show summary when data is null", () => {
		render(<CustomizationSubmissionSuccess data={null} />);
		expect(screen.queryByText("Prénom :")).not.toBeInTheDocument();
	});
});
