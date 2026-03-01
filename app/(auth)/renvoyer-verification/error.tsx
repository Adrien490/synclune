"use client";

import { Logo } from "@/shared/components/logo";
import { Button } from "@/shared/components/ui/button";
import type { ErrorPageProps } from "@/shared/types/error.types";
import { cormorantGaramond } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function ResendVerificationError({ reset }: ErrorPageProps) {
	return (
		<div className="relative">
			{/* Lien retour */}
			<div className="absolute top-4 left-4 z-20 sm:top-6 sm:left-6">
				<Link
					href="/connexion"
					className="text-muted-foreground hover:text-foreground group -ml-2 inline-flex min-h-11 min-w-11 items-center gap-2 pl-2 text-sm transition-colors duration-200"
				>
					<ArrowLeft
						size={16}
						className="transition-transform duration-200 group-hover:-translate-x-1"
						aria-hidden="true"
					/>
					<span className="font-medium">Retour à la connexion</span>
				</Link>
			</div>

			{/* Logo */}
			<div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
				<Logo size={44} preload href="/" />
			</div>

			{/* Contenu */}
			<div className="relative z-10 flex min-h-screen justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
				<div className="my-auto w-full max-w-md space-y-8 text-center">
					<div className="bg-destructive/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
						<AlertTriangle className="text-destructive h-8 w-8" aria-hidden="true" />
					</div>

					<div className="space-y-3">
						<h1
							className={cn(
								"text-foreground text-2xl font-semibold sm:text-3xl lg:text-4xl",
								cormorantGaramond.className,
							)}
						>
							Une erreur est survenue
						</h1>
						<p className="text-muted-foreground">
							Nous n'avons pas pu charger cette page. Veuillez réessayer.
						</p>
					</div>

					<div className="flex flex-col gap-3">
						<Button onClick={reset} className="w-full">
							<RefreshCw className="h-4 w-4" aria-hidden="true" />
							Réessayer
						</Button>
						<Button asChild variant="outline" className="w-full">
							<Link href="/connexion">Retour à la connexion</Link>
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
