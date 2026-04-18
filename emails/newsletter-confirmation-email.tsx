import { Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface NewsletterConfirmationEmailProps {
	confirmationUrl: string;
}

export const NewsletterConfirmationEmail = ({
	confirmationUrl,
}: NewsletterConfirmationEmailProps) => {
	return (
		<EmailLayout preview="Confirmez votre inscription à la newsletter Synclune pour recevoir nos nouveautés">
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Confirmation</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Cliquez sur le bouton pour confirmer votre inscription à la newsletter.
				</Text>
			</Section>

			<EmailCTA href={confirmationUrl} marginBottom="24px">
				Confirmer
			</EmailCTA>

			<EmailCard style={{ marginBottom: "32px" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Ce lien expire dans 7 jours.
				</Text>
			</EmailCard>
		</EmailLayout>
	);
};

NewsletterConfirmationEmail.PreviewProps = {
	confirmationUrl: "https://synclune.fr/newsletter/confirmer?token=example123",
} as NewsletterConfirmationEmailProps;

export default NewsletterConfirmationEmail;
