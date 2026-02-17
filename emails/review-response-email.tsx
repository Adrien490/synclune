import { Button, Hr, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

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
	const previewText = `Nous avons répondu à votre avis sur ${productTitle}`;

	return (
		<EmailLayout
			preview={previewText}
			footer={
				<Text style={EMAIL_STYLES.text.tiny}>
					Merci pour votre confiance !
				</Text>
			}
		>
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>
					Nous avons répondu à votre avis !
				</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {customerName},
				</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}>
					Merci d&apos;avoir pris le temps de partager votre avis sur{" "}
					<strong>{productTitle}</strong>. Nous avons lu votre retour avec
					attention et nous tenions à vous répondre.
				</Text>
			</Section>

			<Hr style={{ ...EMAIL_STYLES.hr, margin: "24px 0" }} />

			{/* Rappel de l'avis original */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
					Votre avis
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
		</EmailLayout>
	);
};

ReviewResponseEmail.PreviewProps = {
	customerName: "Marie",
	productTitle: "Collier Luna en Or Rose",
	reviewContent:
		"J'adore ce collier ! La qualité est exceptionnelle et il brille magnifiquement. Je le porte tous les jours.",
	responseContent:
		"Merci beaucoup pour votre retour Marie ! Nous sommes ravies que le collier Luna vous plaise autant. C'est un plaisir de savoir qu'il vous accompagne au quotidien. N'hésitez pas à nous contacter si vous avez la moindre question.",
	responseAuthorName: "Équipe Synclune",
	productUrl: "https://synclune.fr/creations/collier-luna-or-rose",
} as ReviewResponseEmailProps;

export default ReviewResponseEmail;
