import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseIsTouchDevice, mockTriggerHaptic } = vi.hoisted(() => ({
	mockUseIsTouchDevice: vi.fn(),
	mockTriggerHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-touch-device", () => ({ useIsTouchDevice: mockUseIsTouchDevice }));
vi.mock("@/shared/hooks/use-haptic", () => ({ triggerHaptic: mockTriggerHaptic }));

import { VoiceSearchButton } from "../voice-search-button";

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe("VoiceSearchButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseIsTouchDevice.mockReturnValue(true);
	});

	describe("graceful degradation", () => {
		it("renders nothing when SpeechRecognition is unsupported", () => {
			// No SpeechRecognition or webkitSpeechRecognition on window
			const { container } = render(
				<VoiceSearchButton onTranscript={vi.fn()} ariaLabel="Recherche" />,
			);

			expect(container.firstChild).toBeNull();
		});

		it("renders nothing when touchOnly=true and device is not touch", () => {
			mockUseIsTouchDevice.mockReturnValue(false);

			const FakeSR = function () {
				return {
					lang: "",
					continuous: false,
					interimResults: false,
					maxAlternatives: 0,
					start: vi.fn(),
					stop: vi.fn(),
					abort: vi.fn(),
					onresult: null,
					onerror: null,
					onend: null,
				};
			};
			vi.stubGlobal("webkitSpeechRecognition", FakeSR);

			const { container } = render(<VoiceSearchButton onTranscript={vi.fn()} touchOnly />);

			expect(container.firstChild).toBeNull();
		});
	});

	describe("supported browser", () => {
		let recogInstance: {
			start: ReturnType<typeof vi.fn>;
			stop: ReturnType<typeof vi.fn>;
			abort: ReturnType<typeof vi.fn>;
			onresult: ((ev: { results: unknown }) => void) | null;
			onerror: ((ev: { error: string }) => void) | null;
			onend: ((ev: Event) => void) | null;
		};

		beforeEach(() => {
			recogInstance = {
				start: vi.fn(),
				stop: vi.fn(),
				abort: vi.fn(),
				onresult: null,
				onerror: null,
				onend: null,
			};
			const FakeSR = function () {
				return recogInstance;
			};
			vi.stubGlobal("webkitSpeechRecognition", FakeSR);
		});

		it("renders the mic button with default aria-label", () => {
			render(<VoiceSearchButton onTranscript={vi.fn()} />);

			expect(screen.getByRole("button", { name: /Recherche vocale/i })).toBeInTheDocument();
		});

		it("uses custom aria-label when provided", () => {
			render(<VoiceSearchButton onTranscript={vi.fn()} ariaLabel="Mon micro" />);

			expect(screen.getByRole("button", { name: "Mon micro" })).toBeInTheDocument();
		});

		it("starts recognition on first click", async () => {
			render(<VoiceSearchButton onTranscript={vi.fn()} />);

			await userEvent.click(screen.getByRole("button"));

			expect(recogInstance.start).toHaveBeenCalledTimes(1);
		});

		it("triggers haptic feedback on start", async () => {
			render(<VoiceSearchButton onTranscript={vi.fn()} />);

			await userEvent.click(screen.getByRole("button"));

			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});

		it("toggles aria-pressed=true once listening starts", async () => {
			render(<VoiceSearchButton onTranscript={vi.fn()} />);

			const btn = screen.getByRole("button");
			await userEvent.click(btn);

			expect(btn).toHaveAttribute("aria-pressed", "true");
		});

		it("stop() is called when clicked while listening", async () => {
			render(<VoiceSearchButton onTranscript={vi.fn()} />);

			const btn = screen.getByRole("button");
			await userEvent.click(btn); // start
			await userEvent.click(btn); // stop

			expect(recogInstance.stop).toHaveBeenCalledTimes(1);
		});
	});
});
