"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useWizardContext } from "./wizard-context";

export interface WizardStep {
	id: string;
	label: string;
	description?: string;
	icon?: ReactNode;
	/** Field names to validate for this step */
	fields: string[];
}

interface FormLike {
	validateField: (name: string, opts?: { cause: string }) => Promise<void>;
	getFieldMeta: (name: string) => { errors: string[] } | undefined;
}

interface UseFormWizardOptions {
	steps: WizardStep[];
	form: FormLike;
	onStepChange?: (step: number, direction: "forward" | "backward") => void;
}

export function useFormWizard({
	steps,
	form,
	onStepChange,
}: UseFormWizardOptions) {
	const {
		currentStep,
		setCurrentStep,
		totalSteps,
		completedSteps,
		markStepCompleted,
		resetWizard,
		isMobile,
		desktopMode,
	} = useWizardContext();

	const [isValidating, setIsValidating] = useState(false);

	const currentStepConfig = steps[currentStep];
	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === steps.length - 1;

	// Validate all fields in current step
	const validateCurrentStep = useCallback(async (): Promise<boolean> => {
		const stepConfig = steps[currentStep];
		if (!stepConfig) return false;

		setIsValidating(true);

		try {
			// Validate each field in the step (with error handling for each field)
			for (const fieldName of stepConfig.fields) {
				try {
					await form.validateField(fieldName, { cause: "change" });
				} catch {
					// Field might not exist or validation might fail - continue with others
					console.warn(`[Wizard] Failed to validate field: ${fieldName}`);
				}
			}

			// Check if any fields have errors
			const hasErrors = stepConfig.fields.some((fieldName) => {
				const meta = form.getFieldMeta(fieldName);
				return meta && meta.errors.length > 0;
			});

			return !hasErrors;
		} catch (error) {
			console.error("[Wizard] Validation error:", error);
			return false;
		} finally {
			setIsValidating(false);
		}
	}, [currentStep, steps, form]);

	// Check if a step is valid without triggering validation
	const isStepValid = useCallback(
		(stepIndex: number): boolean => {
			const stepConfig = steps[stepIndex];
			if (!stepConfig) return false;

			return stepConfig.fields.every((fieldName) => {
				const meta = form.getFieldMeta(fieldName);
				return !meta || meta.errors.length === 0;
			});
		},
		[steps, form]
	);

	// Get errors for a specific step
	const getStepErrors = useCallback(
		(stepIndex: number): string[] => {
			const stepConfig = steps[stepIndex];
			if (!stepConfig) return [];

			const errors: string[] = [];

			stepConfig.fields.forEach((fieldName) => {
				const meta = form.getFieldMeta(fieldName);
				if (meta) {
					errors.push(...meta.errors);
				}
			});

			return errors;
		},
		[steps, form]
	);

	// Navigate to next step
	const goNext = useCallback(async (): Promise<boolean> => {
		if (isLastStep) return false;

		const isValid = await validateCurrentStep();
		if (!isValid) return false;

		markStepCompleted(currentStep);
		const nextStep = currentStep + 1;
		setCurrentStep(nextStep);
		onStepChange?.(nextStep, "forward");
		return true;
	}, [
		isLastStep,
		validateCurrentStep,
		markStepCompleted,
		currentStep,
		setCurrentStep,
		onStepChange,
	]);

	// Navigate to previous step (no validation required)
	const goPrevious = useCallback(() => {
		if (isFirstStep) return;

		const prevStep = currentStep - 1;
		setCurrentStep(prevStep);
		onStepChange?.(prevStep, "backward");
	}, [isFirstStep, currentStep, setCurrentStep, onStepChange]);

	// Navigate to specific step
	const goToStep = useCallback(
		async (targetStep: number): Promise<boolean> => {
			if (targetStep < 0 || targetStep >= steps.length) return false;

			// Going backward is always allowed
			if (targetStep < currentStep) {
				setCurrentStep(targetStep);
				onStepChange?.(targetStep, "backward");
				return true;
			}

			// Going forward requires validation of current step
			if (targetStep > currentStep) {
				const isValid = await validateCurrentStep();
				if (!isValid) return false;

				markStepCompleted(currentStep);
				setCurrentStep(targetStep);
				onStepChange?.(targetStep, "forward");
				return true;
			}

			return true;
		},
		[
			steps.length,
			currentStep,
			validateCurrentStep,
			markStepCompleted,
			setCurrentStep,
			onStepChange,
		]
	);

	// Calculate progress percentage
	const progress = useMemo(() => {
		return Math.round((completedSteps.size / totalSteps) * 100);
	}, [completedSteps.size, totalSteps]);

	// Effective mode based on device
	const effectiveMode = isMobile ? "wizard" : desktopMode;

	return {
		// State
		currentStep,
		totalSteps,
		currentStepConfig,
		isFirstStep,
		isLastStep,
		isValidating,

		// Navigation
		goToStep,
		goNext,
		goPrevious,
		resetWizard,

		// Validation
		validateCurrentStep,
		isStepValid,
		getStepErrors,

		// Progress
		completedSteps,
		progress,

		// Mode
		isMobile,
		effectiveMode,
	};
}
