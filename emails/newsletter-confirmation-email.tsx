import { Button, Section, Text } from "@react-email/components";
import { EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface NewsletterConfirmationEmailProps {
	confirmationUrl: string;
}

export const NewsletterConfirmationEmail = ({
	confirmationUrl,
}: NewsletterConfirmationEmailProps) => {
	return (
		<EmailLayout preview="Confirmez votre inscription">
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>Confirmation</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Cliquez sur le bouton pour confirmer votre inscription à la
					newsletter.
				</Text>
			</Section>

			{/* CTA */}
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Button href={confirmationUrl} style={EMAIL_STYLES.button.primary}>
					Confirmer
				</Button>
			</Section>

			{/* Info */}
			<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "32px" }}>
				<Text style={EMAIL_STYLES.text.small}>
					Ce lien expire dans 7 jours.
				</Text>
			</Section>
		</EmailLayout>
	);
};

NewsletterConfirmationEmail.PreviewProps = {
	confirmationUrl: "https://synclune.fr/newsletter/confirm?token=example123",
} as NewsletterConfirmationEmailProps;

export default NewsletterConfirmationEmail;
