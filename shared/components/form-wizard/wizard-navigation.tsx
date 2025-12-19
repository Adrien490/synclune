"use client"

import { memo } from "react"
import { Button } from "@/shared/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/shared/utils/cn"
import { WIZARD_MESSAGES } from "@/shared/constants/form-wizard"

interface WizardNavigationProps {
	isFirstStep: boolean
	isLastStep: boolean
	onPrevious: () => void
	onNext: () => Promise<boolean>
	isSubmitting?: boolean
	isValidating?: boolean
	/** Bloque la navigation (ex: upload en cours, génération miniatures) */
	isBlocked?: boolean
	/** Message affiché quand isBlocked est true */
	blockedMessage?: string
	previousLabel?: string
	nextLabel?: string
	submitLabel?: string
	className?: string
}

export const WizardNavigation = memo(function WizardNavigation({
	isFirstStep,
	isLastStep,
	onPrevious,
	onNext,
	isSubmitting = false,
	isValidating = false,
	isBlocked = false,
	blockedMessage,
	previousLabel = WIZARD_MESSAGES.navigation.previous,
	nextLabel = WIZARD_MESSAGES.navigation.next,
	submitLabel = WIZARD_MESSAGES.navigation.submit,
	className,
}: WizardNavigationProps) {
	const handleNext = async () => {
		if (!isLastStep) {
			await onNext()
		}
	}

	const isLoading = isSubmitting || isValidating
	const isDisabled = isLoading || isBlocked

	return (
		<div
			className={cn(
				// Horizontal layout with gap
				"flex items-center gap-3",
				className
			)}
		>
			{/* Bouton Précédent - masqué sur première étape */}
			{!isFirstStep && (
				<Button
					type="button"
					variant="outline"
					onClick={onPrevious}
					disabled={isDisabled}
					className="flex-1 h-12 md:h-10 md:flex-none md:w-auto"
				>
					<ChevronLeft className="size-4" />
					{previousLabel}
				</Button>
			)}

			{/* Bouton Suivant / Enregistrer - prend 100% si seul */}
			{/* key différente pour éviter que React réutilise le DOM et déclenche un submit */}
			{isLastStep ? (
				<Button
					key="submit-btn"
					type="submit"
					disabled={isDisabled}
					className="flex-1 h-12 md:h-10 md:flex-none md:w-auto"
				>
					{isSubmitting ? (
						<>
							<Loader2 className="size-4 animate-spin" />
							Enregistrement...
						</>
					) : isBlocked && blockedMessage ? (
						<>
							<Loader2 className="size-4 animate-spin" />
							{blockedMessage}
						</>
					) : (
						submitLabel
					)}
				</Button>
			) : (
				<Button
					key="next-btn"
					type="button"
					onClick={handleNext}
					disabled={isDisabled}
					className="flex-1 h-12 md:h-10 md:flex-none md:w-auto"
				>
					{isValidating ? (
						<>
							<Loader2 className="size-4 animate-spin" />
							Validation...
						</>
					) : isBlocked && blockedMessage ? (
						<>
							<Loader2 className="size-4 animate-spin" />
							{blockedMessage}
						</>
					) : (
						<>
							{nextLabel}
							<ChevronRight className="size-4" />
						</>
					)}
				</Button>
			)}
		</div>
	)
})
