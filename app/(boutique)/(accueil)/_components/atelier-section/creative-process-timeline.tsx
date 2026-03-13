import { GlitterSparkles } from "@/shared/components/animations/glitter-sparkles";
import { cn } from "@/shared/utils/cn";
import { Sparkles, type LucideIcon } from "lucide-react";
import { processSteps } from "./process-steps";

const ICON_CLASS =
	"h-6 w-6 motion-safe:transition-[color,filter,rotate,translate,scale] motion-safe:duration-300";

function StepIcon({ icon: Icon }: { icon: LucideIcon }) {
	return <Icon className={ICON_CLASS} aria-hidden="true" />;
}

export function CreativeProcessTimeline() {
	const isLast = (index: number) => index === processSteps.length - 1;

	return (
		<div className="mt-8 sm:mt-12">
			{/* Desktop: horizontal grid (lg+) */}
			<div className="relative hidden lg:block">
				{/* Decorative horizontal line connecting the circles */}
				<div
					className="timeline-line-desktop bg-secondary/30 absolute top-6 right-[12.5%] left-[12.5%] z-0 h-px"
					aria-hidden="true"
				/>
				<ol
					className="relative z-10 grid list-none grid-cols-4 gap-6"
					aria-label="Processus de création en 4 étapes"
				>
					{processSteps.map((step, index) => (
						<li
							key={step.id}
							id={`creative-step-${step.id}`}
							className={cn(
								"group timeline-step-scroll relative rounded-xl p-3 text-center",
								"motion-safe:hover:bg-muted/30 active:bg-muted/40 active:scale-[0.99] motion-safe:transition-[background-color,translate,scale] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5",
								"focus-visible:ring-secondary/50 focus-visible:ring-2 focus-visible:outline-none",
							)}
							// eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- keyboard-navigable timeline steps
							tabIndex={0}
							aria-describedby={`creative-step-${step.id}-desc`}
						>
							<span className="sr-only">Étape {index + 1} :</span>

							{/* Icon circle */}
							<div
								className={cn(
									"relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 motion-safe:transition-[scale,rotate,box-shadow] motion-safe:duration-300",
									step.color,
									"motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3",
									step.iconHoverClass,
									step.glowClass,
									step.intensity.ring,
									step.intensity.shadow,
								)}
							>
								<StepIcon icon={step.icon} />
								{isLast(index) && <GlitterSparkles count={8} sizeRange={[1, 3]} disableOnMobile />}
							</div>

							{/* Title + description */}
							<h3 className="text-foreground mt-4 text-lg/6 font-semibold tracking-tight antialiased">
								{step.title}
								{isLast(index) && (
									<Sparkles
										className="text-secondary ml-1.5 inline-block h-4 w-4 opacity-70 group-hover:opacity-100 motion-safe:transition-opacity"
										aria-hidden="true"
									/>
								)}
							</h3>
							<p
								id={`creative-step-${step.id}-desc`}
								className="text-muted-foreground mt-2 text-sm/6 tracking-normal antialiased"
							>
								{step.description}
							</p>
						</li>
					))}
				</ol>
			</div>

			{/* Mobile: vertical timeline */}
			<div className="relative lg:hidden">
				{/* Vertical line - scroll-driven on supported browsers */}
				<div
					className="timeline-line-mobile bg-secondary/50 absolute top-8 bottom-8 left-6 w-px lg:hidden"
					aria-hidden="true"
				/>

				<ol
					className="list-none space-y-8 sm:space-y-12"
					aria-label="Processus de création en 4 étapes"
				>
					{processSteps.map((step, index) => (
						<li
							key={step.id}
							id={`creative-step-${step.id}`}
							className={cn(
								"group relative -m-2 flex items-start gap-4 rounded-xl p-2",
								"motion-safe:hover:bg-muted/30 active:bg-muted/40 active:scale-[0.99] motion-safe:transition-[background-color,translate,scale] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5",
								"focus-visible:ring-secondary/50 focus-visible:ring-2 focus-visible:outline-none",
							)}
							// eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- keyboard-navigable timeline steps
							tabIndex={0}
							aria-describedby={`creative-step-${step.id}-desc`}
						>
							<span className="sr-only">Étape {index + 1} :</span>

							{/* Desktop (sm-lg): icon circles */}
							<div
								className={cn(
									"relative z-20 hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 motion-safe:transition-[scale,rotate,box-shadow] motion-safe:duration-300 sm:flex lg:hidden",
									step.color,
									"motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3",
									step.iconHoverClass,
									step.glowClass,
									step.intensity.ring,
									step.intensity.shadow,
								)}
							>
								<StepIcon icon={step.icon} />
								{isLast(index) && (
									<div className="hidden sm:block">
										<GlitterSparkles count={8} sizeRange={[1, 3]} disableOnMobile />
									</div>
								)}
							</div>

							{/* Mobile: number circles - CSS scroll-driven animation */}
							<div
								aria-hidden="true"
								className={cn(
									"mobile-step-scroll flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold sm:hidden",
									step.color,
									step.intensity.ring,
									step.intensity.shadow,
								)}
							>
								{index + 1}
							</div>

							<div className="flex-1 pb-8">
								<h3 className="text-foreground mb-2 text-xl/7 font-semibold tracking-tight antialiased">
									<span className="hidden sm:inline lg:hidden" aria-hidden="true">
										{index + 1}.{" "}
									</span>
									{step.title}
									{isLast(index) && (
										<Sparkles
											className="text-secondary ml-1.5 inline-block h-4 w-4 opacity-70 group-hover:opacity-100 motion-safe:transition-opacity"
											aria-hidden="true"
										/>
									)}
								</h3>
								<p
									id={`creative-step-${step.id}-desc`}
									className="text-muted-foreground text-base/7 tracking-normal antialiased"
								>
									{step.description}
								</p>
							</div>
						</li>
					))}
				</ol>
			</div>
		</div>
	);
}
