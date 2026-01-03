"use client";

import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { NavigationGuardProvider } from "@/shared/contexts/navigation-guard-context";
import { AlertDialogStoreProvider } from "@/shared/providers/alert-dialog-store-provider";
import { CookieConsentStoreProvider } from "@/shared/providers/cookie-consent-store-provider";
import { DialogStoreProvider } from "@/shared/providers/dialog-store-provider";
import { SheetStoreProvider } from "@/shared/providers/sheet-store-provider";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import type { ReactNode } from "react";

interface RootProvidersProps {
	children: ReactNode;
}

/**
 * Composant composite regroupant tous les providers du RootLayout.
 * Simplifie le layout en evitant le "provider hell" (8 niveaux de nesting).
 */
export function RootProviders({ children }: RootProvidersProps) {
	return (
		<LazyMotion features={domAnimation}>
			<MotionConfig
				transition={{
					duration: MOTION_CONFIG.duration.normal,
					ease: MOTION_CONFIG.easing.easeOut,
				}}
			>
				<CookieConsentStoreProvider>
					<NavigationGuardProvider>
						<DialogStoreProvider>
							<SheetStoreProvider>
								<AlertDialogStoreProvider>
									{children}
								</AlertDialogStoreProvider>
							</SheetStoreProvider>
						</DialogStoreProvider>
					</NavigationGuardProvider>
				</CookieConsentStoreProvider>
			</MotionConfig>
		</LazyMotion>
	);
}
