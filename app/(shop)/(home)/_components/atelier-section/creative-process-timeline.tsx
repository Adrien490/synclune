import { GlitterSparkles } from "@/shared/components/animations/glitter-sparkles";
import { cn } from "@/shared/utils/cn";
import { processSteps } from "./process-steps";
import { STEP_ILLUSTRATIONS } from "./step-illustrations-map";

function StepIllustration({ stepId }: { stepId: string }) {
	const Illustration = STEP_ILLUSTRATIONS[stepId];
	if (!Illustration) return null;
	return (
		<Illustration className="size-7 motion-safe:transition-[rotate,translate,scale,opacity] motion-safe:duration-[var(--duration-slow)]" />
	);
}

const isLast = (index: number) => index === processSteps.length - 1;

export function CreativeProcessTimeline() {
	return (
		<div className="mt-8 sm:mt-12">
			{/* Desktop: horizontal grid (lg+) */}
			<div className="relative hidden lg:block">
				{/* Decorative horizontal gradient line connecting the circles */}
				<div
					className="timeline-line-desktop absolute top-6 right-[12.5%] left-[12.5%] z-0 h-px bg-gradient-to-r from-[var(--color-glow-yellow)] via-[var(--color-glow-pink)] via-60% to-[var(--color-glow-mint)]"
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
							className="group timeline-step-scroll relative rounded-xl p-3 text-center"
							aria-describedby={`creative-step-${step.id}-desc`}
						>
							<span className="sr-only">Étape {index + 1} :</span>

							{/* Icon circle with illustration overlay */}
							<div
								className={cn(
									"relative z-10 mx-auto flex size-12 items-center justify-center rounded-full border-2 motion-safe:transition-[scale,rotate] motion-safe:duration-[var(--duration-slow)]",
									step.color,
									"motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3",
									step.iconHoverClass,
									step.glowClass,
									step.intensity.ring,
									step.intensity.shadow,
								)}
							>
								<StepIllustration stepId={step.id} />
								{isLast(index) && <GlitterSparkles count={8} sizeRange={[1, 3]} disableOnTouch />}
							</div>

							{/* Title + description */}
							<h3 className="text-foreground mt-2 text-lg/6 font-medium tracking-tight antialiased">
								{step.title}
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
				{/* Vertical gradient line - scroll-driven on supported browsers */}
				<div
					className="timeline-line-mobile absolute top-8 bottom-8 left-6 w-px bg-gradient-to-b from-[var(--color-glow-yellow)] via-[var(--color-glow-pink)] via-60% to-[var(--color-glow-mint)] lg:hidden"
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
							className="group mobile-step-scroll relative -m-2 flex items-start gap-4 rounded-xl p-2"
							aria-describedby={`creative-step-${step.id}-desc`}
						>
							<span className="sr-only">Étape {index + 1} :</span>

							{/* Icon circle with hand-drawn illustration (all mobile sizes).
							    The per-step reveal lives on the <li> (mobile-step-scroll) so the
							    circle's hover scale/rotate stays conflict-free with the scroll
							    animation. The step number is conveyed via the sr-only label above
							    and the visible "N." prefix in the heading. */}
							<div
								className={cn(
									"relative z-20 flex size-12 shrink-0 items-center justify-center rounded-full border-2 motion-safe:transition-[scale,rotate] motion-safe:duration-[var(--duration-slow)] lg:hidden",
									step.color,
									"motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3",
									step.iconHoverClass,
									step.glowClass,
									step.intensity.ring,
									step.intensity.shadow,
								)}
							>
								<StepIllustration stepId={step.id} />
								{isLast(index) && (
									<div className="hidden sm:block">
										<GlitterSparkles count={8} sizeRange={[1, 3]} disableOnTouch />
									</div>
								)}
							</div>

							<div className="flex-1 pb-8">
								<h3 className="text-foreground mb-2 text-xl/7 font-medium tracking-tight antialiased">
									<span className="inline lg:hidden" aria-hidden="true">
										{index + 1}.{" "}
									</span>
									{step.title}
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
