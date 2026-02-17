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
		<aside className="mt-8 lg:mt-0 lg:sticky lg:top-24" aria-label="Informations sur le processus">
			<div className="rounded-xl border border-border bg-card p-6 space-y-6">
				<h2 className="text-base font-semibold">Comment ça marche ?</h2>

				<ol className="space-y-5" aria-label="Étapes du processus">
					{steps.map((step, index) => (
						<li key={index} className="flex gap-4">
							<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
								{index + 1}
							</div>
							<div className="space-y-0.5">
								<p className="text-sm font-medium leading-none">
									{step.title}
								</p>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{step.description}
								</p>
							</div>
						</li>
					))}
				</ol>
			</div>
		</aside>
	);
}
