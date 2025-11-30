import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { formatDate, formatVersionDisplay, isWithinDays } from "@/shared/utils/dates";
import { HandIcon, SparklesIcon } from "lucide-react";
import { RECENT_RELEASE_DAYS } from "./_constants";
import type { ChangelogWithContent, MDXModule } from "./_types";
import { getChangelogs } from "@/modules/dashboard/data/get-changelogs";

interface ChangelogDialogProps {
	/**
	 * Nom de l'utilisateur pour personnaliser le message d'accueil
	 * @default undefined (affiche message générique)
	 */
	userName?: string;

	/**
	 * Message d'accueil personnalisé (remplace le message par défaut)
	 */
	greetingMessage?: string;
}

export async function ChangelogDialog({
	userName,
	greetingMessage,
}: ChangelogDialogProps = {}) {
	// Charge les changelogs côté serveur (métadonnées uniquement)
	const changelogs = await getChangelogs();

	// Charge les contenus MDX en parallèle et calcule isRecent une seule fois
	// TODO OPTIMIZATION: Migrer vers Client Component + next/dynamic pour lazy-load
	// des tabs inactives. Actuellement tous les MDX sont chargés côté serveur.
	const changelogsWithContent: ChangelogWithContent[] = await Promise.all(
		changelogs.map(async (changelog): Promise<ChangelogWithContent> => {
			const mdxModule = (await import(
				`@/modules/dashboard/components/changelog-dialog/_content/${changelog.slug}.mdx`
			)) as MDXModule;
			return {
				...changelog,
				Content: mdxModule.default,
				isRecent: isWithinDays(changelog.metadata.date, RECENT_RELEASE_DAYS),
			};
		})
	);

	// Guard contre tableau vide - afficher un état désactivé
	if (!changelogsWithContent || changelogsWithContent.length === 0) {
		return (
			<Button variant="ghost" size="sm" disabled className="gap-2 opacity-50">
				<SparklesIcon className="h-4 w-4" aria-hidden="true" />
				<span className="hidden sm:inline">Changelog</span>
				<span className="sm:hidden">Changelog</span>
				<span className="sr-only">Aucun changelog disponible</span>
			</Button>
		);
	}

	const latestChangelog = changelogsWithContent[0];
	const isRecentRelease = latestChangelog.isRecent;
	const formattedDate = formatDate(latestChangelog.metadata.date);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="h-9 gap-2 relative cursor-pointer"
					aria-label={`Ouvrir le changelog${isRecentRelease ? ". Nouvelle version disponible" : ""}. Version ${latestChangelog.metadata.version}`}
					aria-describedby={
						isRecentRelease ? "new-release-indicator" : undefined
					}
				>
					<SparklesIcon
						className="h-4 w-4"
						aria-hidden="true"
					/>
					<span>v{latestChangelog.metadata.version}</span>
					{/* Indicateur de nouvelle version */}
					{isRecentRelease && (
						<>
							<span
								id="new-release-indicator"
								className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse motion-reduce:animate-none"
								aria-hidden="true"
							/>
							<span className="sr-only">
								Nouvelle version publiée récemment
							</span>
						</>
					)}
				</Button>
			</DialogTrigger>

			<DialogContent className="max-w-2xl max-h-[min(80vh,800px)] min-h-[400px] overflow-hidden flex flex-col p-0">
				{/* Sticky Header */}
				<div className="sticky top-0 bg-background z-10 pb-4 border-b px-6 pt-6">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<SparklesIcon
								className="size-5 text-primary"
								aria-hidden="true"
							/>
							Bienvenue sur ta plateforme !
						</DialogTitle>
						<DialogDescription className="flex items-center gap-2 flex-wrap">
							<Badge variant="secondary" className="text-xs">
								v{latestChangelog.metadata.version}
							</Badge>
							<span className="text-xs text-muted-foreground">
								{formattedDate}
							</span>
						</DialogDescription>
					</DialogHeader>
				</div>

				{/* Scrollable Content with Tabs */}
				<div
					className="overflow-y-auto flex-1 px-6 relative"
					role="region"
					aria-label="Détails du changelog"
				>
					<Tabs
						defaultValue={latestChangelog.metadata.version}
						className="w-full"
					>
						{/* Tabs pour les différentes versions */}
						{changelogsWithContent.length > 1 && (
							<TabsList className="w-full justify-start mb-4 mt-4 overflow-x-auto flex-wrap h-auto">
								{changelogsWithContent.map((changelog) => (
									<TabsTrigger
										key={changelog.metadata.version}
										value={changelog.metadata.version}
										className="relative"
									>
										v{changelog.metadata.version}
										{changelog.isRecent && (
											<>
												<span
													className="ml-1 h-1.5 w-1.5 bg-primary rounded-full inline-block"
													aria-hidden="true"
												/>
												<span className="sr-only">Nouvelle version</span>
											</>
										)}
									</TabsTrigger>
								))}
							</TabsList>
						)}

						{/* Contenu de chaque version */}
						{changelogsWithContent.map((changelog) => {
							const changelogVersionDisplay = formatVersionDisplay(
								changelog.metadata.version
							);
							const changelogGreeting = userName
								? `Coucou ${userName}, voici la ${changelogVersionDisplay} !`
								: `Voici la ${changelogVersionDisplay} !`;
							const Content = changelog.Content;

							return (
								<TabsContent
									key={changelog.metadata.version}
									value={changelog.metadata.version}
									className="mt-0"
								>
									<div className="space-y-6 text-sm py-4 pb-8">
										{/* Introduction */}
										<div className="space-y-2 bg-primary/5 p-4 rounded-lg border border-primary/10">
											<h3 className="font-semibold text-base flex items-center gap-2">
												<span>{greetingMessage || changelogGreeting}</span>
												<HandIcon
													className="size-5 text-primary animate-wave origin-[70%_70%] motion-reduce:animate-none"
													aria-label="Main qui salue"
												/>
											</h3>
											<p className="text-foreground/80">
												{changelog.metadata.description}
											</p>
										</div>

										{/* MDX Content avec Tailwind Typography + composants personnalisés */}
										<div className="prose prose-sm dark:prose-invert max-w-none prose-a:text-foreground prose-a:no-underline prose-a:font-normal">
											<Content />
										</div>
									</div>
								</TabsContent>
							);
						})}
					</Tabs>

					{/* Scroll Gradient - plus subtil et ne cache pas le contenu */}
					<div
						className="sticky bottom-0 left-0 right-0 h-6 bg-linear-to-t from-background/80 via-background/20 to-transparent pointer-events-none"
						aria-hidden="true"
					/>
				</div>

				{/* Footer */}
				<div className="border-t pt-4 pb-6 px-6 bg-background">
					<p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-1">
						Développé avec soin pour Synclune
						<SparklesIcon
							className="size-4 text-primary"
							aria-label="Étincelles"
						/>
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}
