import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from "react-email";
import { LEGAL_URLS, EMAIL_LOGO_URL } from "@/shared/constants/legal-urls";
import { BRAND } from "@/shared/constants/brand";
import { BUSINESS_INFO } from "@/shared/constants/seo-config";
import { DEFAULT_FRANCHISE_VAT_MENTION } from "@/shared/constants/vat-franchise";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_COLORS_DARK, EMAIL_STYLES } from "../email-colors";

interface EmailLayoutProps {
	preview: string;
	/**
	 * Texte affiché à la place du logo. Quand fourni, le logo image est masqué
	 * (cas des templates admin internes avec intitulé contextuel).
	 */
	headerText?: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
	/**
	 * URL de visualisation web (optionnelle). Si fournie, affiche un lien
	 * "Voir dans le navigateur" en haut du layout pour les clients email
	 * qui ne rendent pas correctement le HTML.
	 */
	browserViewUrl?: string;
	/**
	 * Force l'affichage du logo. Par défaut `true` sauf si `headerText` est fourni.
	 */
	showLogo?: boolean;
}

/**
 * Styles CSS injectés dans <Head> — gèrent dark mode (prefers-color-scheme)
 * et responsive mobile (max-width 480px).
 *
 * !important nécessaire pour overrider les styles inline des <Text style={...}>
 * que les clients email n'arrivent pas à toucher autrement.
 */
const EMAIL_HEAD_STYLES = `
	@import url('https://fonts.googleapis.com/css2?family=Winky+Sans:wght@400&display=swap');
	:root { color-scheme: light dark; }
	@media (prefers-color-scheme: dark) {
		body { background-color: ${EMAIL_COLORS_DARK.background.main} !important; }
		.${EMAIL_CLASSES.container} {
			background-color: ${EMAIL_COLORS_DARK.background.white} !important;
			border-color: ${EMAIL_COLORS_DARK.border} !important;
		}
		.${EMAIL_CLASSES.card} { background-color: ${EMAIL_COLORS_DARK.background.card} !important; }
		.${EMAIL_CLASSES.footer} { border-color: ${EMAIL_COLORS_DARK.border} !important; }
		h1, h2, h3,
		.${EMAIL_CLASSES.heading.h1},
		.${EMAIL_CLASSES.heading.h2},
		.${EMAIL_CLASSES.heading.h3},
		.${EMAIL_CLASSES.text.body} { color: ${EMAIL_COLORS_DARK.text.primary} !important; }
		.${EMAIL_CLASSES.text.secondary} { color: ${EMAIL_COLORS_DARK.text.secondary} !important; }
		.${EMAIL_CLASSES.header} { color: ${EMAIL_COLORS_DARK.primary} !important; }
		.${EMAIL_CLASSES.codeBlock} { background-color: #111111 !important; }
	}
	@media only screen and (max-width: 480px) {
		.${EMAIL_CLASSES.container} {
			margin: 0 !important;
			padding: 24px 16px !important;
			border-radius: 0 !important;
			border-left: none !important;
			border-right: none !important;
			max-width: 100% !important;
		}
		.${EMAIL_CLASSES.heading.h1} { font-size: 24px !important; line-height: 1.25 !important; }
		.${EMAIL_CLASSES.heading.h2} { font-size: 20px !important; line-height: 1.3 !important; }
		.${EMAIL_CLASSES.heading.h3} { font-size: 17px !important; }
		.${EMAIL_CLASSES.button.primary},
		.${EMAIL_CLASSES.button.outline} {
			display: block !important;
			width: 100% !important;
			box-sizing: border-box !important;
			padding-top: 18px !important;
			padding-bottom: 18px !important;
		}
		.${EMAIL_CLASSES.card} { padding: 14px !important; }
	}
`;

/**
 * Shared email layout — lang fr, dark mode, responsive mobile, consistent header/footer
 */
export function EmailLayout({
	preview,
	headerText,
	children,
	footer,
	browserViewUrl,
	showLogo,
}: EmailLayoutProps) {
	const displayLogo = showLogo ?? headerText === undefined;
	const displayText = headerText ?? BRAND.name;
	return (
		<Html lang="fr">
			<Head>
				<meta name="color-scheme" content="light dark" />
				<meta name="supported-color-schemes" content="light dark" />
				<meta name="x-apple-disable-message-reformatting" />
				<meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
				<style dangerouslySetInnerHTML={{ __html: EMAIL_HEAD_STYLES }} />
			</Head>
			<Preview>{preview}</Preview>
			<Body
				style={{
					backgroundColor: EMAIL_COLORS.background.main,
					...EMAIL_STYLES.body,
				}}
			>
				<Container
					className={EMAIL_CLASSES.container}
					role="article"
					style={EMAIL_STYLES.container}
				>
					{browserViewUrl && (
						<Section style={{ marginBottom: "12px", textAlign: "right" }}>
							<Link
								href={browserViewUrl}
								className={EMAIL_CLASSES.text.secondary}
								style={{
									...EMAIL_STYLES.text.tiny,
									color: EMAIL_COLORS.text.secondary,
									textDecoration: "underline",
								}}
							>
								Voir dans le navigateur
							</Link>
						</Section>
					)}

					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						{displayLogo ? (
							/* ⚠️ Le cadre doit rester CARRÉ : la source est `logo.webp`, 256 × 256.
							   Il était déclaré 120 × 40 — un ratio 3:1 hérité du temps où le
							   logo portait son wordmark. Le `height: "auto"` inline sauvait les
							   clients qui appliquent le CSS, mais Outlook desktop (moteur Word)
							   applique les ATTRIBUTS : le mark y était écrasé au tiers de sa
							   hauteur. */
							<Img
								src={EMAIL_LOGO_URL}
								alt={BRAND.logo.alt}
								width={48}
								height={48}
								style={{
									margin: "0 auto",
									display: "block",
									height: "auto",
									maxWidth: "48px",
								}}
							/>
						) : (
							<Text
								className={EMAIL_CLASSES.header}
								style={{
									margin: 0,
									fontSize: "24px",
									fontWeight: "bold",
									color: EMAIL_COLORS.primary,
								}}
							>
								{displayText}
							</Text>
						)}
					</Section>

					{children}

					{/* Footer */}
					<Section
						className={EMAIL_CLASSES.footer}
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
							textAlign: "center",
						}}
					>
						{footer}
						<Text
							className={EMAIL_CLASSES.text.secondary}
							style={{
								...EMAIL_STYLES.text.tiny,
								...(footer ? { marginTop: "12px" } : {}),
							}}
						>
							&copy; {new Date().getFullYear()} {BRAND.name} — Bijoux artisanaux faits main
						</Text>
						<Text
							className={EMAIL_CLASSES.text.secondary}
							style={{
								...EMAIL_STYLES.text.tiny,
								marginTop: "4px",
							}}
						>
							{BUSINESS_INFO.location.street}, {BUSINESS_INFO.location.postalCode}{" "}
							{BUSINESS_INFO.location.city}, {BUSINESS_INFO.location.country}
						</Text>
						<Text
							className={EMAIL_CLASSES.text.secondary}
							style={{
								...EMAIL_STYLES.text.tiny,
								marginTop: "4px",
							}}
						>
							Micro-entreprise — SIREN {BUSINESS_INFO.siren}
						</Text>
						<Text
							className={EMAIL_CLASSES.text.secondary}
							style={{
								...EMAIL_STYLES.text.tiny,
								marginTop: "4px",
							}}
						>
							{DEFAULT_FRANCHISE_VAT_MENTION}
						</Text>
						<Text
							className={EMAIL_CLASSES.text.secondary}
							style={{
								...EMAIL_STYLES.text.tiny,
								marginTop: "4px",
							}}
						>
							<Link
								href={`mailto:${BRAND.contact.email}`}
								style={{
									color: EMAIL_COLORS.text.secondary,
									textDecoration: "underline",
								}}
							>
								Nous contacter
							</Link>
							{" · "}
							<Link
								href={LEGAL_URLS.LEGAL_NOTICE}
								style={{
									color: EMAIL_COLORS.text.secondary,
									textDecoration: "underline",
								}}
							>
								Mentions légales
							</Link>
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}
