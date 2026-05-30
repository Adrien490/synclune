import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnnouncementBar } from "../announcement-bar";

// --- Mocks -----------------------------------------------------------------

const { useReducedMotionMock, dismissMock, hapticMock } = vi.hoisted(() => ({
	useReducedMotionMock: vi.fn(() => false),
	dismissMock: vi.fn(async (_prev?: unknown, _fd?: FormData) => ({
		status: "success",
		message: "ok",
	})),
	hapticMock: vi.fn(),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// motion/react : stubs DOM, on remonte initial/animate/exit en data-attrs pour
// pouvoir asserter le câblage reduced-motion.
vi.mock("motion/react", async () => {
	const { createElement } = await import("react");
	const makeStub =
		(tag: string) =>
		({
			initial,
			animate,
			exit,
			transition,
			...rest
		}: Record<string, unknown> & { children?: React.ReactNode }) => {
			const extras: Record<string, string> = {};
			if (initial !== undefined) extras["data-initial"] = JSON.stringify(initial);
			if (animate !== undefined) extras["data-animate"] = JSON.stringify(animate);
			if (exit !== undefined) extras["data-exit"] = JSON.stringify(exit);
			return createElement(tag, { ...rest, ...extras });
		};
	return {
		useReducedMotion: useReducedMotionMock,
		AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
		m: new Proxy(
			{},
			{
				get: (_t, prop) => (typeof prop === "symbol" ? undefined : makeStub(String(prop))),
			},
		),
	};
});

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: hapticMock,
}));

vi.mock("@/shared/actions/dismiss-announcement", () => ({
	dismissAnnouncement: dismissMock,
}));

// --- Helpers ---------------------------------------------------------------

const baseProps = {
	message: "Livraison offerte dès 50 €",
	link: null,
	endsAt: null,
	hash: "0123456789abcdef",
	variant: "PROMO" as const,
};

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	useReducedMotionMock.mockReturnValue(false);
	document.documentElement.style.removeProperty("--announcement-bar-height");
});

// --- Tests -----------------------------------------------------------------

describe("AnnouncementBar", () => {
	it("affiche le message", () => {
		render(<AnnouncementBar {...baseProps} />);
		expect(screen.getByText(baseProps.message)).toBeInTheDocument();
	});

	it("rend un lien quand l'URL est sûre", () => {
		render(<AnnouncementBar {...baseProps} link="/collections/promo" />);
		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/collections/promo");
	});

	it("ne rend pas de lien quand l'URL n'est pas sûre", () => {
		render(<AnnouncementBar {...baseProps} link="javascript:alert(1)" />);
		expect(screen.queryByRole("link")).toBeNull();
	});

	it("appelle dismissAnnouncement avec le hash au clic sur Fermer", async () => {
		const user = userEvent.setup();
		render(<AnnouncementBar {...baseProps} />);
		await user.click(screen.getByRole("button", { name: /fermer la barre/i }));

		expect(hapticMock).toHaveBeenCalled();
		expect(dismissMock).toHaveBeenCalledTimes(1);
		const fd = dismissMock.mock.calls[0]?.[1];
		expect(fd?.get("hash")).toBe(baseProps.hash);
	});

	it("pose --announcement-bar-height au montage et le remet à 0 au démontage", () => {
		const { unmount } = render(<AnnouncementBar {...baseProps} />);
		expect(document.documentElement.style.getPropertyValue("--announcement-bar-height")).toContain(
			"--ab-height",
		);

		unmount();
		expect(document.documentElement.style.getPropertyValue("--announcement-bar-height")).toBe(
			"0px",
		);
	});

	it("reduced-motion : variants sans translation verticale", () => {
		useReducedMotionMock.mockReturnValue(true);
		const { container } = render(<AnnouncementBar {...baseProps} />);
		const bar = container.querySelector('[role="region"]');
		const initial = JSON.parse(bar?.getAttribute("data-initial") ?? "{}");
		expect(initial.y).toBeUndefined();
		expect(initial.opacity).toBe(0);
	});

	it("entrée animée (motion par défaut) : translation verticale présente", () => {
		const { container } = render(<AnnouncementBar {...baseProps} />);
		const bar = container.querySelector('[role="region"]');
		const initial = JSON.parse(bar?.getAttribute("data-initial") ?? "{}");
		expect(initial.y).toBe("-100%");
	});

	it("applique la classe de tonalité selon la variante", () => {
		const { container } = render(<AnnouncementBar {...baseProps} variant="INFO" />);
		const bar = container.querySelector('[role="region"]');
		expect(bar?.className).toContain("bg-info");
		expect(bar?.className).toContain("text-info-foreground");
	});

	it("swipe vers le haut au-delà du seuil → dismiss (P existant)", () => {
		const { container } = render(<AnnouncementBar {...baseProps} />);
		const region = container.querySelector('[role="region"]') as HTMLElement;

		const touch = (type: string, clientY: number) => {
			const e = new Event(type, { bubbles: true });
			(e as unknown as { touches: { clientY: number }[] }).touches = [{ clientY }];
			return e;
		};

		// Chaque dispatch dans son propre act() pour que swipeOffsetRef soit à jour.
		act(() => void region.dispatchEvent(touch("touchstart", 100)));
		act(() => void region.dispatchEvent(touch("touchmove", 40))); // deltaY = -60 < -30
		act(() => void region.dispatchEvent(touch("touchend", 40)));

		expect(dismissMock).toHaveBeenCalledTimes(1);
	});

	describe("countdown", () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-05-30T12:00:00Z"));
		});
		afterEach(() => {
			vi.useRealTimers();
		});

		it("affiche le compte à rebours quand endsAt < 24h", () => {
			const endsAt = new Date("2026-05-30T13:30:00Z"); // +1h30
			render(<AnnouncementBar {...baseProps} endsAt={endsAt} />);
			const timer = screen.getByRole("timer");
			expect(timer.textContent).toMatch(/01:30:0\d/);
		});

		it("réserve l'espace de la pastille quand le countdown est affiché (P2)", () => {
			const endsAt = new Date("2026-05-30T13:00:00Z"); // +1h
			render(<AnnouncementBar {...baseProps} endsAt={endsAt} />);
			const container = screen.getByText(baseProps.message).parentElement;
			expect(container?.className).toContain("pr-[max(7rem");
		});

		it("se masque automatiquement quand endsAt est dépassé pendant la session", () => {
			const endsAt = new Date("2026-05-30T12:00:03Z"); // +3s
			render(<AnnouncementBar {...baseProps} endsAt={endsAt} />);
			expect(screen.getByRole("region")).toBeInTheDocument();

			act(() => {
				vi.advanceTimersByTime(4000);
			});

			expect(screen.queryByRole("region")).toBeNull();
		});

		it("n'affiche rien quand endsAt > 24h", () => {
			const endsAt = new Date("2026-05-31T13:00:00Z"); // +25h
			render(<AnnouncementBar {...baseProps} endsAt={endsAt} />);
			expect(screen.queryByRole("timer")).toBeNull();
		});

		it("n'affiche rien quand endsAt est null", () => {
			render(<AnnouncementBar {...baseProps} endsAt={null} />);
			expect(screen.queryByRole("timer")).toBeNull();
		});
	});
});
