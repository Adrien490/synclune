"use client";

import { LogoAnimated } from "@/shared/components/logo-animated";
import { Button } from "@/shared/components/ui/button";
import { fraunces } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { AuthFadeIn } from "./auth-fade-in";

interface AuthErrorBoundaryProps {
	title?: string;
	description?: string;
	reset: () => void;
	backHref?: string;
	backLabel?: string;
	showCreateAccountLink?: boolean;
}

export function AuthErrorBoundary({
	title = "Une erreur est survenue",
	description = "Nous n'avons pas pu charger cette page. Veuillez réessayer.",
	reset,
	backHref = "/connexion",
	backLabel = "Retour à la connexion",
	showCreateAccountLink = false,
}: AuthErrorBoundaryProps) {
	return (
		<div className="relative">
			{/* Back link */}
			<div className="absolute top-4 left-4 z-20 sm:top-6 sm:left-6">
				<Link
					href={backHref}
					className="text-muted-foreground hover:text-foreground group -ml-2 inline-flex min-h-11 min-w-11 items-center gap-2 pl-2 text-sm transition-colors duration-200"
				>
					<ArrowLeft
						size={16}
						className="transition-transform duration-200 group-hover:-translate-x-1"
						aria-hidden="true"
					/>
					<span className="font-medium">{backLabel}</span>
				</Link>
			</div>

			{/* Logo */}
			<div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
				<LogoAnimated size={44} preload href="/" />
			</div>

			{/* Content */}
			<div className="relative z-10 flex min-h-screen justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
				<div className="my-auto w-full max-w-md space-y-8 text-center">
					<AuthFadeIn>
						<div className="bg-destructive/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
							<AlertCircle className="text-destructive h-8 w-8" aria-hidden="true" />
						</div>
					</AuthFadeIn>

					<AuthFadeIn delay={0.05}>
						<div className="space-y-3">
							<h1
								className={cn(
									"text-foreground text-2xl font-medium sm:text-3xl lg:text-4xl",
									fraunces.className,
								)}
							>
								{title}
							</h1>
							<p className="text-muted-foreground">{description}</p>
						</div>
					</AuthFadeIn>

					<AuthFadeIn delay={0.1}>
						<div className="flex flex-col gap-3">
							<Button onClick={reset} className="w-full">
								<RefreshCw className="h-4 w-4" aria-hidden="true" />
								Réessayer
							</Button>
							<Button asChild variant="outline" className="w-full">
								<Link href={backHref}>{backLabel}</Link>
							</Button>
							{showCreateAccountLink && (
								<Button asChild variant="ghost" className="w-full">
									<Link href="/inscription">Créer un compte</Link>
								</Button>
							)}
						</div>
					</AuthFadeIn>
				</div>
			</div>
		</div>
	);
}
