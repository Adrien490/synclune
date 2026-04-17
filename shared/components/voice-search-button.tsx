"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { Mic, MicOff } from "lucide-react";

import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

// Minimal Web Speech API typings (not covered by lib.dom on all TS versions)
interface SpeechRecognitionEvent extends Event {
	results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
	error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	maxAlternatives: number;
	start: () => void;
	stop: () => void;
	abort: () => void;
	onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
	onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
	onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
	if (typeof window === "undefined") return null;
	const w = window as unknown as {
		SpeechRecognition?: SpeechRecognitionCtor;
		webkitSpeechRecognition?: SpeechRecognitionCtor;
	};
	return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface VoiceSearchButtonProps {
	onTranscript: (text: string) => void;
	onSubmit?: (text: string) => void;
	/** ARIA label for the button */
	ariaLabel?: string;
	className?: string;
	/** When true, render only if the device is touch-capable (hides on desktop) */
	touchOnly?: boolean;
}

/**
 * Microphone button triggering native voice dictation via Web Speech API.
 *
 * - Chrome / Safari support (webkitSpeechRecognition fallback)
 * - French language by default
 * - Auto-submits when recognition ends (final transcript)
 * - Haptic + visual feedback during listening
 * - Returns null when unsupported (graceful degradation)
 */
const subscribeNoop = () => () => {};

export function VoiceSearchButton({
	onTranscript,
	onSubmit,
	ariaLabel = "Recherche vocale",
	className,
	touchOnly = false,
}: VoiceSearchButtonProps) {
	const [isListening, setIsListening] = useState(false);
	const isSupported = useSyncExternalStore(
		subscribeNoop,
		() => getSpeechRecognition() !== null,
		() => false,
	);
	const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
	const finalTranscriptRef = useRef("");
	const isTouch = useIsTouchDevice();

	useEffect(() => {
		return () => {
			recognitionRef.current?.abort();
			recognitionRef.current = null;
		};
	}, []);

	if (!isSupported) return null;
	if (touchOnly && !isTouch) return null;

	function startListening() {
		const Ctor = getSpeechRecognition();
		if (!Ctor) return;

		const recognition = new Ctor();
		recognition.lang = "fr-FR";
		recognition.continuous = false;
		recognition.interimResults = true;
		recognition.maxAlternatives = 1;

		finalTranscriptRef.current = "";

		recognition.onresult = (event) => {
			let interim = "";
			let final = "";
			for (let i = event.results.length - 1; i >= 0; i--) {
				const result = event.results[i];
				if (!result) continue;
				const alt = result[0];
				if (!alt) continue;
				if (result.isFinal) final = alt.transcript + final;
				else interim = alt.transcript + interim;
			}
			finalTranscriptRef.current = final || interim;
			onTranscript(finalTranscriptRef.current);
		};

		recognition.onerror = () => {
			setIsListening(false);
		};

		recognition.onend = () => {
			setIsListening(false);
			const transcript = finalTranscriptRef.current.trim();
			if (transcript && onSubmit) onSubmit(transcript);
		};

		recognitionRef.current = recognition;
		recognition.start();
		setIsListening(true);
		triggerHaptic("selection");
	}

	function stopListening() {
		recognitionRef.current?.stop();
		setIsListening(false);
	}

	const handleClick = () => {
		if (isListening) {
			stopListening();
		} else {
			startListening();
		}
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			aria-label={isListening ? "Arrêter la recherche vocale" : ariaLabel}
			aria-pressed={isListening}
			className={cn(
				"inline-flex size-11 items-center justify-center rounded-full",
				"text-muted-foreground hover:text-foreground",
				"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
				"transition-colors",
				isListening && "bg-primary/10 text-primary",
				className,
			)}
		>
			{isListening ? (
				<Mic className="size-5 motion-safe:animate-pulse" aria-hidden="true" />
			) : (
				<MicOff className="size-5" aria-hidden="true" />
			)}
		</button>
	);
}
