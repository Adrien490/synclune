import {
	Body,
	Button,
	Container,
	Head,
	Hr,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";

interface ReviewResponseEmailProps {
	customerName: string;
	productTitle: string;
	reviewContent: string;
	responseContent: string;
	responseAuthorName: string;
	productUrl: string;
}

export const ReviewResponseEmail = ({
	customerName,
	productTitle,
	reviewContent,
	responseContent,
	responseAuthorName,
	productUrl,
}: ReviewResponseEmailProps) => {
	const previewText = `Nous avons répondu à ton avis sur ${productTitle}`;

	return (
		<Html>
			<Head />
			<Preview>{previewText}</Preview>
			<Body style={{ backgroundColor: EMAIL_COLORS.background.main }}>
				<Container style={EMAIL_STYLES.container}>
					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "24px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							Synclune
						</Text>
					</Section>

					{/* Titre */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={EMAIL_STYLES.heading.h2}>
							Nous avons répondu à ton avis !
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
							Bonjour {customerName},
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}>
							Merci d&apos;avoir pris le temps de partager ton avis sur{" "}
							<strong>{productTitle}</strong>. Nous avons lu ton retour avec
							attention et nous tenions à te répondre.
						</Text>
					</Section>

					<Hr style={{ ...EMAIL_STYLES.hr, margin: "24px 0" }} />

					{/* Rappel de l'avis original */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
							Ton avis
						</Text>
						<div
							style={{
								...EMAIL_STYLES.section.card,
								borderLeft: `3px solid ${EMAIL_COLORS.border}`,
								borderRadius: "0 8px 8px 0",
							}}
						>
							<Text
								style={{
									...EMAIL_STYLES.text.body,
									fontStyle: "italic",
									color: EMAIL_COLORS.text.secondary,
								}}
							>
								&ldquo;{reviewContent}&rdquo;
							</Text>
						</div>
					</Section>

					{/* Réponse de l'équipe */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
							Notre réponse
						</Text>
						<div
							style={{
								...EMAIL_STYLES.section.card,
								borderLeft: `3px solid ${EMAIL_COLORS.primary}`,
								borderRadius: "0 8px 8px 0",
							}}
						>
							<Text style={EMAIL_STYLES.text.body}>{responseContent}</Text>
							<Text
								style={{
									...EMAIL_STYLES.text.small,
									marginTop: "12px",
									fontStyle: "italic",
								}}
							>
								— {responseAuthorName}
							</Text>
						</div>
					</Section>

					<Hr style={{ ...EMAIL_STYLES.hr, margin: "24px 0" }} />

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button href={productUrl} style={EMAIL_STYLES.button.primary}>
							Voir le produit
						</Button>
					</Section>

					{/* Footer */}
					<Section
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
							textAlign: "center",
						}}
					>
						<Text style={EMAIL_STYLES.text.tiny}>
							Merci pour ta confiance !
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "8px" }}>
							© {new Date().getFullYear()} Synclune
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

ReviewResponseEmail.PreviewProps = {
	customerName: "Marie",
	productTitle: "Collier Luna en Or Rose",
	reviewContent:
		"J'adore ce collier ! La qualité est exceptionnelle et il brille magnifiquement. Je le porte tous les jours.",
	responseContent:
		"Merci beaucoup pour ton retour Marie ! Nous sommes ravies que le collier Luna te plaise autant. C'est un plaisir de savoir qu'il t'accompagne au quotidien. N'hésite pas à nous contacter si tu as la moindre question.",
	responseAuthorName: "Équipe Synclune",
	productUrl: "https://synclune.fr/creations/collier-luna-or-rose",
} as ReviewResponseEmailProps;

export default ReviewResponseEmail;
