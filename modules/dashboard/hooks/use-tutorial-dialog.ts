"use client";

import { useEffect, useState, useCallback } from "react";
import {
	TUTORIAL_STEPS,
	TUTORIAL_STORAGE_KEY,
} from "../constants/tutorial-steps";

interface UseTutorialDialogOptions {
	autoOpen?: boolean;
}

/**
 * Hook pour gérer l'état et la navigation du tutoriel dashboard
 */
export function useTutorialDialog(options: UseTutorialDialogOptions = {}) {
	const { autoOpen = false } = options;

	const [currentStep, setCurrentStep] = useState(0);
	const [isOpen, setIsOpen] = useState(autoOpen);
	const [dontShowAgain, setDontShowAgain] = useState(false);

	// Vérifier au montage si le tutoriel doit s'afficher automatiquement
	useEffect(() => {
		// Si autoOpen est true, on force l'ouverture
		if (autoOpen) {
			setIsOpen(true);
			return;
		}

		const hasCompleted = localStorage.getItem(TUTORIAL_STORAGE_KEY);
		// Ouvrir automatiquement si jamais vu
		if (!hasCompleted) {
			setIsOpen(true);
		}
	}, [autoOpen]);

	const handleNext = useCallback(() => {
		if (currentStep < TUTORIAL_STEPS.length - 1) {
			setCurrentStep((prev) => prev + 1);
		}
	}, [currentStep]);

	const handlePrevious = useCallback(() => {
		if (currentStep > 0) {
			setCurrentStep((prev) => prev - 1);
		}
	}, [currentStep]);

	const handleReset = useCallback(() => {
		setCurrentStep(0);
	}, []);

	const handleClose = useCallback(() => {
		// Si "ne plus afficher" est coché, sauvegarder la préférence
		if (dontShowAgain) {
			localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
		}
		setIsOpen(false);
		setDontShowAgain(false);
	}, [dontShowAgain]);

	const goToStep = useCallback((index: number) => {
		if (index >= 0 && index < TUTORIAL_STEPS.length) {
			setCurrentStep(index);
		}
	}, []);

	const step = TUTORIAL_STEPS[currentStep];
	const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
	const isFirstStep = currentStep === 0;
	const totalSteps = TUTORIAL_STEPS.length;
	const progress = ((currentStep + 1) / totalSteps) * 100;

	return {
		// State
		currentStep,
		isOpen,
		dontShowAgain,
		step,
		isLastStep,
		isFirstStep,
		totalSteps,
		progress,

		// Setters
		setIsOpen,
		setDontShowAgain,
		goToStep,

		// Handlers
		handleNext,
		handlePrevious,
		handleReset,
		handleClose,
	};
}
