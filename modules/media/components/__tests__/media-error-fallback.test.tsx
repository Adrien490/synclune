import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		className,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		className?: string;
		variant?: string;
		size?: string;
	}) => (
		<button onClick={onClick} className={className}>
			{children}
		</button>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	ArrowCounterClockwiseIcon: ({ className }: { className?: string }) => (
		<svg data-testid="icon-rotate" className={className} />
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { MediaErrorFallback } from "../media-error-fallback";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("MediaErrorFallback", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Image type ───────────────────────────────────────────────────────────

	it("renders role=alert container", () => {
		render(<MediaErrorFallback type="image" />);
		expect(screen.getByRole("alert")).toBeInTheDocument();
	});

	it("shows correct message for image type", () => {
		render(<MediaErrorFallback type="image" />);
		expect(screen.getByText("Impossible de charger l'image")).toBeInTheDocument();
	});

	it("shows correct message for video type", () => {
		render(<MediaErrorFallback type="video" />);
		expect(screen.getByText("Impossible de charger la vidéo")).toBeInTheDocument();
	});

	it("shows fallback text when no onRetry provided", () => {
		render(<MediaErrorFallback type="image" />);
		expect(screen.getByText("Veuillez réessayer plus tard")).toBeInTheDocument();
	});

	it("renders retry button when onRetry is provided", () => {
		const onRetry = vi.fn();
		render(<MediaErrorFallback type="image" onRetry={onRetry} />);
		expect(screen.getByRole("button", { name: /Réessayer/i })).toBeInTheDocument();
	});

	it("calls onRetry when retry button clicked", async () => {
		const onRetry = vi.fn();
		render(<MediaErrorFallback type="image" onRetry={onRetry} />);
		await userEvent.click(screen.getByRole("button", { name: /Réessayer/i }));
		expect(onRetry).toHaveBeenCalledOnce();
	});

	// ─── Small size ───────────────────────────────────────────────────────────

	it("shows 'Erreur' label in small size", () => {
		render(<MediaErrorFallback type="image" size="small" />);
		expect(screen.getByText("Erreur")).toBeInTheDocument();
	});

	it("does not render retry button in small size", () => {
		const onRetry = vi.fn();
		render(<MediaErrorFallback type="image" size="small" onRetry={onRetry} />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("does not show full error message in small size", () => {
		render(<MediaErrorFallback type="image" size="small" />);
		expect(screen.queryByText("Impossible de charger l'image")).not.toBeInTheDocument();
	});
});
