import { Link, Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface NewsletterWelcomeEmailProps {
	email: string;
	unsubscribeUrl: string;
	shopUrl: string;
	promoCode?: string;
}

export const NewsletterWelcomeEmail = ({
	email,
	unsubscribeUrl,
	shopUrl,
	promoCode,
}: NewsletterWelcomeEmailProps) => {
	return (
		<EmailLayout
			preview={promoCode ? `Bienvenue — Votre code -10% : ${promoCode}` : "Bienvenue"}
			footer={
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.tiny}>
					<Link href={unsubscribeUrl} style={{ ...EMAIL_STYLES.link, textDecoration: "underline" }}>
						Se désinscrire
					</Link>
				</Text>
			}
		>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Bienvenue</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Vous êtes inscrit à la newsletter avec {email}.
				</Text>
			</Section>

			{promoCode && (
				<Section
					className={EMAIL_CLASSES.card}
					style={{
						marginBottom: "24px",
						padding: "24px",
						backgroundColor: EMAIL_COLORS.background.card,
						borderRadius: "8px",
						textAlign: "center",
					}}
				>
					<Text
						className={EMAIL_CLASSES.text.body}
						style={{ ...EMAIL_STYLES.text.body, fontWeight: "600", marginBottom: "8px" }}
					>
						Pour vous remercier, profitez de -10% sur votre première commande :
					</Text>
					<Text
						style={{
							margin: "12px 0",
							fontSize: "28px",
							fontWeight: "bold",
							color: EMAIL_COLORS.primary,
							letterSpacing: "2px",
						}}
					>
						{promoCode}
					</Text>
					<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
						Utilisez ce code au moment du paiement. Valable 30 jours, une seule utilisation.
					</Text>
				</Section>
			)}

			<EmailCTA href={shopUrl}>{promoCode ? "Profiter de -10%" : "Voir les créations"}</EmailCTA>
		</EmailLayout>
	);
};

NewsletterWelcomeEmail.PreviewProps = {
	email: "example@email.com",
	unsubscribeUrl: "https://synclune.fr/newsletter/desinscription?token=abc123",
	shopUrl: "https://synclune.fr/produits",
	promoCode: "BIENVENUE-A1B2C3",
} as NewsletterWelcomeEmailProps;

export default NewsletterWelcomeEmail;
