import type React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AnnouncementBar } from "../announcement-bar";
import type { AnnouncementBarProps } from "../announcement-bar";

// ─── Mocks ──────────────────────────────────────────────────────────

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		div: ({
			children,
			initial: _i,
			animate: _a,
			exit: _e,
			transition: _t,
			style: _s,
			...props
		}: Record<string, unknown> & { children: React.ReactNode }) => <div {...props}>{children}</div>,
	},
	useReducedMotion: () => false,
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: { spring: { bar: { type: "spring" } } },
	maybeReduceMotion: (config: unknown) => config,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock server action
const mockFormAction = vi.fn();
vi.mock("@/modules/announcements/actions/set-announcement-dismissed", () => ({
	setAnnouncementDismissed: vi.fn(),
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (fn: unknown) => fn,
}));

// Mock React hooks for server action support
vi.mock("react", async () => {
	const actual = await vi.importActual<typeof React>("react");
	return {
		...actual,
		useActionState: () => [undefined, mockFormAction, false],
		useOptimistic: (initial: boolean) => {
			const [state, setState] = actual.useState(initial);
			return [state, setState];
		},
		useTransition: () => {
			return [
				false,
				(fn: () => void) => {
					fn();
				},
			];
		},
	};
});

function renderBar(overrides: Partial<AnnouncementBarProps> = {}) {
	const defaultProps: AnnouncementBarProps = {
		message: "Livraison offerte dès 50€ d'achat !",
		announcementId: "clx1234567890",
		dismissDurationHours: 24,
		...overrides,
	};
	return render(<AnnouncementBar {...defaultProps} />);
}

beforeEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockFormAction.mockClear();
	document.documentElement.style.removeProperty("--announcement-bar-height");
});

// ─── Rendering ──────────────────────────────────────────────────────

describe("AnnouncementBar - rendering", () => {
	it("renders the message", () => {
		renderBar();
		expect(screen.getByText("Livraison offerte dès 50€ d'achat !")).toBeInTheDocument();
	});

	it("has role=region with correct aria-label", () => {
		renderBar();
		expect(screen.getByRole("region")).toBeInTheDocument();
		expect(screen.getByRole("region")).toHaveAttribute(
			"aria-label",
			"Barre d'annonce promotionnelle",
		);
	});

	it("renders close button with aria-label", () => {
		renderBar();
		expect(screen.getByRole("button", { name: "Fermer la barre d'annonce" })).toBeInTheDocument();
	});

	it("renders sparkle decorations as aria-hidden", () => {
		renderBar();
		const sparkles = screen.getAllByText("✦");
		expect(sparkles).toHaveLength(2);
		for (const sparkle of sparkles) {
			expect(sparkle).toHaveAttribute("aria-hidden", "true");
		}
	});
});

// ─── Link rendering ─────────────────────────────────────────────────

describe("AnnouncementBar - link", () => {
	it("renders link and linkText when provided", () => {
		renderBar({ link: "/collections", linkText: "Découvrir" });
		expect(screen.getByRole("link", { name: /Découvrir/ })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /Découvrir/ })).toHaveAttribute("href", "/collections");
	});

	it("does not render link when only link is provided without linkText", () => {
		renderBar({ link: "/collections" });
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("does not render link when href is unsafe (javascript:)", () => {
		renderBar({ link: "javascript:alert(1)", linkText: "Click me" });
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("does not render link when href is unsafe (data:)", () => {
		renderBar({ link: "data:text/html,<h1>xss</h1>", linkText: "Click" });
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("renders link with combined aria-label", () => {
		renderBar({
			message: "Promo spéciale",
			link: "/soldes",
			linkText: "En profiter",
		});
		expect(screen.getByRole("link")).toHaveAttribute("aria-label", "En profiter - Promo spéciale");
	});

	it("renders dot separator between message and link", () => {
		renderBar({ link: "/collections", linkText: "Voir" });
		expect(screen.getByText("·")).toBeInTheDocument();
	});
});

// ─── Dismiss ────────────────────────────────────────────────────────

describe("AnnouncementBar - dismiss", () => {
	it("hides bar on close button click", () => {
		renderBar();
		expect(screen.getByRole("region")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Fermer la barre d'annonce" }));
		expect(screen.queryByRole("region")).not.toBeInTheDocument();
	});

	it("hides bar on Escape key", () => {
		renderBar();
		expect(screen.getByRole("region")).toBeInTheDocument();

		fireEvent.keyDown(screen.getByRole("region"), { key: "Escape" });
		expect(screen.queryByRole("region")).not.toBeInTheDocument();
	});

	it("calls server action with correct data on dismiss", () => {
		renderBar();
		fireEvent.click(screen.getByRole("button", { name: "Fermer la barre d'annonce" }));

		expect(mockFormAction).toHaveBeenCalledTimes(1);
		const formData = mockFormAction.mock.calls[0]![0] as FormData;
		expect(formData.get("announcementId")).toBe("clx1234567890");
		expect(formData.get("dismissDurationHours")).toBe("24");
	});
});
