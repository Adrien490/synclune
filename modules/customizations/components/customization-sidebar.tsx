const steps = [
	{
		title: "Décrivez votre idée",
		description: "Remplissez le formulaire avec votre projet, même si c'est encore flou.",
	},
	{
		title: "On échange ensemble",
		description: "Je vous recontacte pour affiner les détails et vous proposer un devis.",
	},
	{
		title: "Je crée votre bijou",
		description: "Une fois validé, je réalise votre pièce unique à la main.",
	},
];

export function CustomizationSidebar() {
	return (
		<aside className="mb-8 lg:sticky lg:top-24 lg:mb-0" aria-label="Informations sur le processus">
			<div className="space-y-4">
				{/* Steps */}
				<div className="border-border bg-card space-y-6 rounded-xl border p-6">
					<h2 className="text-base font-semibold">Comment ça marche ?</h2>

					<ol className="space-y-5" aria-label="Étapes du processus">
						{steps.map((step, index) => (
							<li key={index} className="flex gap-4">
								<div className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
									{index + 1}
								</div>
								<div className="space-y-0.5">
									<p className="text-sm leading-none font-medium">{step.title}</p>
									<p className="text-muted-foreground text-sm leading-relaxed">
										{step.description}
									</p>
								</div>
							</li>
						))}
					</ol>
				</div>
			</div>
		</aside>
	);
}
