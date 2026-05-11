"use client";

import { useEffect, useRef, useState } from "react";

export type CameraFacing = "user" | "environment";

export interface UseCameraStreamOptions {
	/** Facing mode — default "environment" (rear camera) */
	facingMode?: CameraFacing;
	/** Preferred capture width in pixels */
	idealWidth?: number;
	/** Preferred capture height in pixels */
	idealHeight?: number;
	/** Whether the stream should be active immediately on mount */
	autoStart?: boolean;
}

export interface UseCameraStreamReturn {
	/** Ref to attach on the <video> preview element */
	videoRef: React.RefObject<HTMLVideoElement | null>;
	/** Active MediaStream when camera is running — null otherwise */
	stream: MediaStream | null;
	/** Whether the camera is currently live */
	isStreaming: boolean;
	/** Last permission/hardware error — null if healthy */
	error: CameraStreamError | null;
	/** Start the stream (no-op if already live) */
	start: () => Promise<void>;
	/** Stop the stream and release the hardware */
	stop: () => void;
	/** Toggle between front and rear cameras */
	toggleFacing: () => Promise<void>;
	/** Current facing mode */
	facing: CameraFacing;
	/** Capture a still frame and return it as a File (JPEG 90%) */
	capture: (fileName?: string) => Promise<File | null>;
}

export type CameraStreamErrorKind =
	| "permission-denied"
	| "not-found"
	| "in-use"
	| "constraints"
	| "unsupported"
	| "unknown";

export interface CameraStreamError {
	kind: CameraStreamErrorKind;
	message: string;
}

function mapDomError(err: unknown): CameraStreamError {
	if (!(err instanceof Error)) {
		return { kind: "unknown", message: "Erreur caméra inconnue" };
	}
	const name = err.name;
	switch (name) {
		case "NotAllowedError":
		case "SecurityError":
			return {
				kind: "permission-denied",
				message: "Accès caméra refusé. Autorisez la caméra dans votre navigateur.",
			};
		case "NotFoundError":
		case "OverconstrainedError":
			return { kind: "not-found", message: "Aucune caméra compatible trouvée" };
		case "NotReadableError":
			return { kind: "in-use", message: "La caméra est déjà utilisée par une autre application" };
		case "TypeError":
			return { kind: "unsupported", message: "Caméra non supportée par ce navigateur" };
		default:
			return { kind: "unknown", message: err.message };
	}
}

function isGetUserMediaSupported(): boolean {
	return (
		typeof navigator !== "undefined" &&
		typeof navigator.mediaDevices !== "undefined" &&
		typeof navigator.mediaDevices.getUserMedia === "function"
	);
}

export function useCameraStream(options: UseCameraStreamOptions = {}): UseCameraStreamReturn {
	const {
		facingMode = "environment",
		idealWidth = 1920,
		idealHeight = 1080,
		autoStart = false,
	} = options;

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [isStreaming, setIsStreaming] = useState(false);
	const [error, setError] = useState<CameraStreamError | null>(null);
	const [facing, setFacing] = useState<CameraFacing>(facingMode);

	const stop = () => {
		const s = streamRef.current;
		if (s) {
			for (const track of s.getTracks()) {
				track.stop();
			}
		}
		streamRef.current = null;
		setStream(null);
		setIsStreaming(false);
		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}
	};

	const start = async () => {
		if (!isGetUserMediaSupported()) {
			setError({ kind: "unsupported", message: "getUserMedia non supporté" });
			return;
		}
		if (streamRef.current) return;

		setError(null);
		try {
			const media = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: { ideal: facing },
					width: { ideal: idealWidth },
					height: { ideal: idealHeight },
				},
				audio: false,
			});
			streamRef.current = media;
			setStream(media);
			setIsStreaming(true);
			if (videoRef.current) {
				videoRef.current.srcObject = media;
				// play() may throw if tab is backgrounded — swallow silently
				try {
					await videoRef.current.play();
				} catch {
					/* noop */
				}
			}
		} catch (err) {
			setError(mapDomError(err));
			setIsStreaming(false);
		}
	};

	const toggleFacing = async () => {
		stop();
		setFacing((prev) => (prev === "environment" ? "user" : "environment"));
		// start() is triggered by the effect below on facing change
	};

	// Start whenever facing changes and autoStart is enabled, or when explicitly started
	useEffect(() => {
		if (autoStart) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			void start();
		}
		return () => {
			stop();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [facing, autoStart]);

	const capture = async (fileName = `camera-${Date.now()}.jpg`): Promise<File | null> => {
		const video = videoRef.current;
		if (!video || video.readyState < 2) return null;

		const width = video.videoWidth;
		const height = video.videoHeight;
		if (!width || !height) return null;

		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;
		ctx.drawImage(video, 0, 0, width, height);

		return new Promise<File | null>((resolve) => {
			canvas.toBlob(
				(blob) => {
					if (!blob) {
						resolve(null);
						return;
					}
					resolve(new File([blob], fileName, { type: "image/jpeg" }));
				},
				"image/jpeg",
				0.9,
			);
		});
	};

	return { videoRef, stream, isStreaming, error, start, stop, toggleFacing, facing, capture };
}
