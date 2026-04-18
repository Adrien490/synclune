import { Hr, Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
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
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.tiny}>
					Merci pour votre confiance !
				</Text>
			}
		>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Nous avons répondu à votre avis !</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName},
				</Text>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}
				>
					Merci d'avoir pris le temps de partager votre avis sur <strong>{productTitle}</strong>.
					Nous avons lu votre retour avec attention et nous tenions à vous répondre.
				</Text>
			</Section>

			<Hr style={{ ...EMAIL_STYLES.hr, margin: "24px 0" }} />

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "12px" }}>
					Votre avis
				</EmailHeading>
				<EmailCard
					style={{
						borderLeft: `3px solid ${EMAIL_COLORS.border}`,
						borderRadius: "0 8px 8px 0",
					}}
				>
					<Text
						className={EMAIL_CLASSES.text.secondary}
						style={{
							...EMAIL_STYLES.text.body,
							fontStyle: "italic",
							color: EMAIL_COLORS.text.secondary,
						}}
					>
						&ldquo;{reviewContent}&rdquo;
					</Text>
				</EmailCard>
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "12px" }}>
					Notre réponse
				</EmailHeading>
				<EmailCard
					style={{
						borderLeft: `3px solid ${EMAIL_COLORS.primary}`,
						borderRadius: "0 8px 8px 0",
					}}
				>
					<Text className={EMAIL_CLASSES.text.body} style={EMAIL_STYLES.text.body}>
						{responseContent}
					</Text>
					<Text
						className={EMAIL_CLASSES.text.secondary}
						style={{
							...EMAIL_STYLES.text.small,
							marginTop: "12px",
							fontStyle: "italic",
						}}
					>
						— {responseAuthorName}
					</Text>
				</EmailCard>
			</Section>

			<Hr style={{ ...EMAIL_STYLES.hr, margin: "24px 0" }} />

			<EmailCTA href={productUrl}>Voir le produit</EmailCTA>
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
