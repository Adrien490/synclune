"use client";

import { cn } from "@/shared/utils/cn";
import { WizardProgress } from "./wizard-progress";
import { WizardNavigation } from "./wizard-navigation";
import type { WizardStep } from "./use-form-wizard";

interface WizardMobileShellProps {
	steps: WizardStep[];
	currentStep: number;
	completedSteps: Set<number>;
	onStepClick: (step: number) => Promise<boolean>;
	isFirstStep: boolean;
	isLastStep: boolean;
	onPrevious: () => void;
	onNext: () => Promise<boolean>;
	isSubmitting?: boolean;
	isValidating?: boolean;
	title?: string;
	children: React.ReactNode;
	className?: string;
}

export function WizardMobileShell({
	steps,
	currentStep,
	completedSteps,
	onStepClick,
	isFirstStep,
	isLastStep,
	onPrevious,
	onNext,
	isSubmitting,
	isValidating,
	title,
	children,
	className,
}: WizardMobileShellProps) {
	return (
		<div className={cn("flex flex-col min-h-0", className)}>
			{/* Sticky progress bar at top */}
			<div className="sticky top-0 z-10 -mx-4 px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
				{title && (
					<h2 className="text-lg font-semibold font-display mb-3">{title}</h2>
				)}
				<WizardProgress
					steps={steps}
					currentStep={currentStep}
					completedSteps={completedSteps}
					onStepClick={onStepClick}
					variant="progress-bar"
				/>
			</div>

			{/* Content flows normally */}
			<div className="py-4">{children}</div>

			{/* Sticky footer with navigation */}
			<div className="sticky bottom-0 z-10 -mx-4 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t bg-background/95 backdrop-blur-sm mt-auto">
				<WizardNavigation
					isFirstStep={isFirstStep}
					isLastStep={isLastStep}
					onPrevious={onPrevious}
					onNext={onNext}
					isSubmitting={isSubmitting}
					isValidating={isValidating}
				/>
			</div>
		</div>
	);
}
