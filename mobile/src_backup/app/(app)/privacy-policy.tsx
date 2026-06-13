import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useLang } from "../../lib/i18n";
import { useTheme, ThemeColors } from "../../lib/theme";

type PolicySection = {
  titleFr: string;
  titleEn: string;
  titleZh: string;
  contentFr: string;
  contentEn: string;
  contentZh: string;
};

const POLICY_SECTIONS: PolicySection[] = [
  {
    titleFr: "Collecte des donnees",
    titleEn: "Data Collection",
    titleZh: "数据收集",
    contentFr:
      "Nous collectons les informations que vous nous fournissez lors de votre inscription, notamment votre nom, adresse email, numero de telephone et informations professionnelles. Ces donnees sont necessaires pour vous fournir nos services de mise en relation emploi.",
    contentEn:
      "We collect information you provide during registration, including your name, email address, phone number, and professional information. This data is necessary to provide you with our job matching services.",
    contentZh:
      "我们收集您在注册时提供的信息，包括您的姓名、电子邮件地址、电话号码和职业信息。这些数据是为您提供职位匹配服务所必需的。",
  },
  {
    titleFr: "Utilisation des donnees",
    titleEn: "Data Usage",
    titleZh: "数据使用",
    contentFr:
      "Vos donnees sont utilisees pour: creer et gerer votre compte, vous mettre en relation avec des recruteurs ou candidats, personnaliser votre experience, vous envoyer des notifications pertinentes, et ameliorer nos services.",
    contentEn:
      "Your data is used to: create and manage your account, connect you with recruiters or candidates, personalize your experience, send you relevant notifications, and improve our services.",
    contentZh:
      "您的数据用于：创建和管理您的账户、将您与招聘方或求职者联系起来、个性化您的使用体验、向您发送相关通知以及改善我们的服务。",
  },
  {
    titleFr: "Partage des donnees",
    titleEn: "Data Sharing",
    titleZh: "数据共享",
    contentFr:
      "Vos informations de profil peuvent etre partagees avec les recruteurs ou les candidats selon vos parametres de visibilite. Nous ne vendons jamais vos donnees personnelles a des tiers. Nous pouvons partager des donnees avec des prestataires de services qui nous aident a exploiter notre plateforme.",
    contentEn:
      "Your profile information may be shared with recruiters or candidates based on your visibility settings. We never sell your personal data to third parties. We may share data with service providers who help us operate our platform.",
    contentZh:
      "您的个人资料信息可能根据您的可见性设置与招聘方或求职者共享。我们绝不会将您的个人数据出售给第三方。我们可能与帮助我们运营平台的服务提供商共享数据。",
  },
  {
    titleFr: "Securite des donnees",
    titleEn: "Data Security",
    titleZh: "数据安全",
    contentFr:
      "Nous mettons en oeuvre des mesures de securite techniques et organisationnelles pour proteger vos donnees contre tout acces non autorise, modification, divulgation ou destruction. Vos mots de passe sont chiffres et nous utilisons des connexions securisees (HTTPS).",
    contentEn:
      "We implement technical and organizational security measures to protect your data against unauthorized access, modification, disclosure, or destruction. Your passwords are encrypted and we use secure connections (HTTPS).",
    contentZh:
      "我们采取技术和组织安全措施，保护您的数据免遭未经授权的访问、修改、披露或销毁。您的密码经过加密，我们使用安全连接（HTTPS）。",
  },
  {
    titleFr: "Vos droits",
    titleEn: "Your Rights",
    titleZh: "您的权利",
    contentFr:
      "Vous avez le droit d'acceder a vos donnees personnelles, de les rectifier, de les supprimer, ou de limiter leur traitement. Vous pouvez exercer ces droits depuis les parametres de votre compte ou en nous contactant directement.",
    contentEn:
      "You have the right to access your personal data, correct it, delete it, or limit its processing. You can exercise these rights from your account settings or by contacting us directly.",
    contentZh:
      "您有权访问、更正、删除您的个人数据或限制其处理。您可以通过账户设置或直接联系我们来行使这些权利。",
  },
  {
    titleFr: "Cookies et traceurs",
    titleEn: "Cookies and Tracking",
    titleZh: "Cookie与追踪",
    contentFr:
      "Notre application utilise des technologies de suivi pour ameliorer votre experience et analyser l'utilisation de nos services. Vous pouvez gerer vos preferences dans les parametres de votre appareil.",
    contentEn:
      "Our application uses tracking technologies to improve your experience and analyze usage of our services. You can manage your preferences in your device settings.",
    contentZh:
      "我们的应用程序使用追踪技术来改善您的使用体验并分析服务使用情况。您可以在设备设置中管理您的偏好设置。",
  },
  {
    titleFr: "Conservation des donnees",
    titleEn: "Data Retention",
    titleZh: "数据保留",
    contentFr:
      "Nous conservons vos donnees aussi longtemps que votre compte est actif ou selon les obligations legales applicables. Si vous supprimez votre compte, vos donnees seront effacees dans un delai de 30 jours.",
    contentEn:
      "We retain your data as long as your account is active or as required by applicable legal obligations. If you delete your account, your data will be erased within 30 days.",
    contentZh:
      "我们在您的账户处于活跃状态期间或根据适用法律义务保留您的数据。如果您删除账户，您的数据将在30天内被清除。",
  },
  {
    titleFr: "Contact",
    titleEn: "Contact",
    titleZh: "联系我们",
    contentFr:
      "Pour toute question concernant notre politique de confidentialite, vous pouvez nous contacter a privacy@jobe.sn ou via notre formulaire de contact dans l'application.",
    contentEn:
      "For any questions about our privacy policy, you can contact us at privacy@jobe.sn or through our contact form in the application.",
    contentZh:
      "如有关于隐私政策的任何问题，您可以通过 privacy@jobe.sn 或应用内联系表单联系我们。",
  },
];

function PolicySectionBlock({
  title,
  content,
  colors,
}: {
  title: string;
  content: string;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
        {content}
      </Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const lang = useLang((s) => s.lang);
  const { colors } = useTheme();
  const isFr = lang === "fr";
  const isZh = lang === "zh";

  const txt = {
    title: isFr ? "Politique de confidentialite" : isZh ? "隐私政策" : "Privacy Policy",
    lastUpdated: isFr ? "Derniere mise a jour: Mars 2026" : isZh ? "最后更新：2026年3月" : "Last updated: March 2026",
  };

  return (
    <View testID="privacy-policy-screen" style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.card }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            testID="back-button"
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.toggleBg }]}
          >
            <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {txt.title}
          </Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>
            {txt.lastUpdated}
          </Text>

          {POLICY_SECTIONS.map((section, idx) => (
            <View key={idx}>
              <PolicySectionBlock
                title={isFr ? section.titleFr : isZh ? section.titleZh : section.titleEn}
                content={isFr ? section.contentFr : isZh ? section.contentZh : section.contentEn}
                colors={colors}
              />
              {idx < POLICY_SECTIONS.length - 1 ? (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              ) : null}
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 32,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  lastUpdated: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  divider: {
    height: 1,
  },
});
