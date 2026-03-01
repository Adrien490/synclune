"use client";

import { useState, useRef } from "react";
import { useBackButtonClose } from "./use-back-button-close";

/**
 * Hook to manage lightbox state
 * - Handles mobile "back" button: closes lightbox instead of navigating
 * - Focus management: saves and restores focus (WCAG 2.4.3)
 */
export function useLightbox() {
	const [isOpen, setIsOpen] = useState(false);
	const previousFocusRef = useRef<HTMLElement | null>(null);

	const restoreFocus = () => {
		requestAnimationFrame(() => {
			if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
				previousFocusRef.current.focus();
				previousFocusRef.current = null;
			}
		});
	};

	// Delegate history management to useBackButtonClose
	useBackButtonClose({
		isOpen,
		onClose: () => {
			setIsOpen(false);
			restoreFocus();
		},
		id: "lightbox",
	});

	const open = () => {
		previousFocusRef.current = document.activeElement as HTMLElement;
		setIsOpen(true);
	};

	const close = () => {
		setIsOpen(false);
		restoreFocus();
	};

	return { isOpen, open, close };
}
