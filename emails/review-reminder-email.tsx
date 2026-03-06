import { Button, Link, Section, Text } from "@react-email/components";
import { EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface ReviewReminderEmailProps {
	customerName: string;
	orderNumber: string;
	reviewUrl: string;
	unsubscribeUrl: string;
}

export const ReviewReminderEmail = ({
	customerName,
	orderNumber,
	reviewUrl,
	unsubscribeUrl,
}: ReviewReminderEmailProps) => {
	return (
		<EmailLayout
			preview={`Petit rappel : votre avis sur la commande ${orderNumber}`}
			footer={
				<>
					<Text style={EMAIL_STYLES.text.tiny}>Merci pour votre confiance !</Text>
					<Text style={EMAIL_STYLES.text.tiny}>
						<Link
							href={unsubscribeUrl}
							style={{ ...EMAIL_STYLES.link, textDecoration: "underline" }}
						>
							Se désinscrire des emails commerciaux
						</Link>
					</Text>
				</>
			}
		>
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>Un petit rappel</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {customerName},
				</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}>
					Nous espérons que vous profitez bien de votre commande. Nous serions ravies d&apos;avoir
					votre retour d&apos;expérience !
				</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}>
					Votre avis, même en quelques mots, aide d&apos;autres clientes à choisir et nous permet de
					nous améliorer.
				</Text>
			</Section>

			{/* CTA */}
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<Button href={reviewUrl} style={EMAIL_STYLES.button.primary}>
					Donner mon avis
				</Button>
				<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "12px" }}>
					Cela ne prend que 2 minutes
				</Text>
			</Section>
		</EmailLayout>
	);
};

ReviewReminderEmail.PreviewProps = {
	customerName: "Marie",
	orderNumber: "CMD-1730000000-ABCD",
	reviewUrl: "https://synclune.fr/mes-avis",
	unsubscribeUrl: "https://synclune.fr/notifications/desinscription",
} as ReviewReminderEmailProps;

export default ReviewReminderEmail;
