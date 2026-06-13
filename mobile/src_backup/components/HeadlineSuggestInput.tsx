import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ChevronDown, Search, X, Check, PenLine } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ThemeColors } from "@/lib/theme";

// ─── Expanded bilingual title list ────────────────────────────────────────────
const SUGGESTIONS: { fr: string; en: string; category: string }[] = [
  // Transport & Logistique
  { fr: "Chauffeur", en: "Driver", category: "Transport" },
  { fr: "Chauffeur livreur", en: "Delivery driver", category: "Transport" },
  { fr: "Chauffeur de taxi", en: "Taxi driver", category: "Transport" },
  { fr: "Chauffeur poids lourd", en: "Truck driver", category: "Transport" },
  { fr: "Chauffeur de bus", en: "Bus driver", category: "Transport" },
  { fr: "Livreur à moto", en: "Motorcycle courier", category: "Transport" },
  { fr: "Logisticien", en: "Logistics coordinator", category: "Transport" },
  { fr: "Gestionnaire de stock", en: "Stock manager", category: "Transport" },
  { fr: "Agent de fret", en: "Freight agent", category: "Transport" },
  { fr: "Responsable entrepôt", en: "Warehouse manager", category: "Transport" },
  { fr: "Agent douanier", en: "Customs agent", category: "Transport" },

  // Bâtiment & Travaux
  { fr: "Maçon", en: "Mason / Builder", category: "BTP" },
  { fr: "Électricien", en: "Electrician", category: "BTP" },
  { fr: "Plombier", en: "Plumber", category: "BTP" },
  { fr: "Menuisier", en: "Carpenter", category: "BTP" },
  { fr: "Soudeur", en: "Welder", category: "BTP" },
  { fr: "Peintre en bâtiment", en: "Building painter", category: "BTP" },
  { fr: "Carreleur", en: "Tiler", category: "BTP" },
  { fr: "Couvreur", en: "Roofer", category: "BTP" },
  { fr: "Ingénieur civil", en: "Civil engineer", category: "BTP" },
  { fr: "Conducteur d'engins", en: "Equipment operator", category: "BTP" },
  { fr: "Technicien climatisation", en: "HVAC technician", category: "BTP" },

  // Technologie & Informatique
  { fr: "Développeur web", en: "Web developer", category: "Tech" },
  { fr: "Développeur mobile", en: "Mobile developer", category: "Tech" },
  { fr: "Ingénieur logiciel", en: "Software engineer", category: "Tech" },
  { fr: "Ingénieur réseau", en: "Network engineer", category: "Tech" },
  { fr: "Administrateur système", en: "System administrator", category: "Tech" },
  { fr: "Analyste de données", en: "Data analyst", category: "Tech" },
  { fr: "Data scientist", en: "Data scientist", category: "Tech" },
  { fr: "Designer UI/UX", en: "UI/UX designer", category: "Tech" },
  { fr: "Chef de produit", en: "Product manager", category: "Tech" },
  { fr: "Analyste cybersécurité", en: "Cybersecurity analyst", category: "Tech" },
  { fr: "Ingénieur DevOps", en: "DevOps engineer", category: "Tech" },
  { fr: "Support informatique", en: "IT support", category: "Tech" },
  { fr: "Graphiste", en: "Graphic designer", category: "Tech" },

  // Commerce & Vente
  { fr: "Vendeur / Vendeuse", en: "Salesperson", category: "Commerce" },
  { fr: "Commercial / Commerciale", en: "Sales representative", category: "Commerce" },
  { fr: "Agent commercial", en: "Sales agent", category: "Commerce" },
  { fr: "Chargé de clientèle", en: "Account manager", category: "Commerce" },
  { fr: "Gérant de magasin", en: "Store manager", category: "Commerce" },
  { fr: "Chargé de développement", en: "Business developer", category: "Commerce" },
  { fr: "Entrepreneur", en: "Entrepreneur", category: "Commerce" },
  { fr: "Chef de projet", en: "Project manager", category: "Commerce" },
  { fr: "Responsable opérations", en: "Operations manager", category: "Commerce" },

  // Finance & Banque
  { fr: "Comptable", en: "Accountant", category: "Finance" },
  { fr: "Auditeur", en: "Auditor", category: "Finance" },
  { fr: "Conseiller financier", en: "Financial advisor", category: "Finance" },
  { fr: "Caissier bancaire", en: "Bank teller", category: "Finance" },
  { fr: "Analyste crédit", en: "Credit analyst", category: "Finance" },
  { fr: "Agent d'assurance", en: "Insurance agent", category: "Finance" },
  { fr: "Agent de paie", en: "Payroll officer", category: "Finance" },
  { fr: "Analyste budgétaire", en: "Budget analyst", category: "Finance" },
  { fr: "Conseiller fiscal", en: "Tax advisor", category: "Finance" },

  // Administration & RH
  { fr: "Secrétaire", en: "Secretary", category: "Admin" },
  { fr: "Assistant administratif", en: "Administrative assistant", category: "Admin" },
  { fr: "Réceptionniste", en: "Receptionist", category: "Admin" },
  { fr: "Responsable RH", en: "HR manager", category: "Admin" },
  { fr: "Responsable bureau", en: "Office manager", category: "Admin" },
  { fr: "Assistant juridique", en: "Legal assistant", category: "Admin" },
  { fr: "Ingénieur", en: "Engineer", category: "Admin" },
  { fr: "Architecte", en: "Architect", category: "Admin" },
  { fr: "Technicien", en: "Technician", category: "Admin" },

  // Éducation & Formation
  { fr: "Enseignant / Enseignante", en: "Teacher", category: "Education" },
  { fr: "Professeur", en: "Professor", category: "Education" },
  { fr: "Enseignant primaire", en: "Primary school teacher", category: "Education" },
  { fr: "Enseignant lycée", en: "High school teacher", category: "Education" },
  { fr: "Directeur d'école", en: "School director", category: "Education" },
  { fr: "Formateur", en: "Trainer", category: "Education" },
  { fr: "Tuteur", en: "Tutor", category: "Education" },

  // Santé & Social
  { fr: "Médecin", en: "Doctor", category: "Santé" },
  { fr: "Infirmier / Infirmière", en: "Nurse", category: "Santé" },
  { fr: "Aide-soignant", en: "Nursing assistant", category: "Santé" },
  { fr: "Pharmacien", en: "Pharmacist", category: "Santé" },
  { fr: "Chirurgien", en: "Surgeon", category: "Santé" },
  { fr: "Dentiste", en: "Dentist", category: "Santé" },
  { fr: "Sage-femme", en: "Midwife", category: "Santé" },
  { fr: "Kinésithérapeute", en: "Physical therapist", category: "Santé" },
  { fr: "Psychologue", en: "Psychologist", category: "Santé" },
  { fr: "Technicien de laboratoire", en: "Lab technician", category: "Santé" },
  { fr: "Agent de santé communautaire", en: "Community health worker", category: "Santé" },
  { fr: "Travailleur social", en: "Social worker", category: "Santé" },

  // Agriculture & Pêche
  { fr: "Agriculteur", en: "Farmer", category: "Agriculture" },
  { fr: "Pêcheur", en: "Fisherman", category: "Agriculture" },
  { fr: "Éleveur", en: "Livestock breeder", category: "Agriculture" },
  { fr: "Agronome", en: "Agronomist", category: "Agriculture" },
  { fr: "Technicien agricole", en: "Agricultural technician", category: "Agriculture" },

  // Hôtellerie & Restauration
  { fr: "Cuisinier / Cuisinière", en: "Cook / Chef", category: "HCR" },
  { fr: "Serveur / Serveuse", en: "Waiter / Waitress", category: "HCR" },
  { fr: "Directeur d'hôtel", en: "Hotel manager", category: "HCR" },
  { fr: "Guide touristique", en: "Tour guide", category: "HCR" },
  { fr: "Organisateur d'événements", en: "Event planner", category: "HCR" },

  // Beauté & Bien-être
  { fr: "Coiffeur / Coiffeuse", en: "Hairdresser", category: "Beauté" },
  { fr: "Barbier", en: "Barber", category: "Beauté" },
  { fr: "Esthéticienne", en: "Beautician", category: "Beauté" },
  { fr: "Maquilleuse", en: "Makeup artist", category: "Beauté" },

  // Artisanat & Métiers
  { fr: "Couturier / Couturière", en: "Tailor / Seamstress", category: "Artisanat" },
  { fr: "Artisan", en: "Craftsman", category: "Artisanat" },
  { fr: "Mécanicien", en: "Mechanic", category: "Artisanat" },
  { fr: "Forgeron", en: "Blacksmith", category: "Artisanat" },
  { fr: "Cordonnier", en: "Shoemaker", category: "Artisanat" },
  { fr: "Potier", en: "Potter", category: "Artisanat" },
  { fr: "Fleuriste", en: "Florist", category: "Artisanat" },

  // Droit & Justice
  { fr: "Avocat / Avocate", en: "Lawyer", category: "Droit" },
  { fr: "Notaire", en: "Notary", category: "Droit" },
  { fr: "Juge", en: "Judge", category: "Droit" },

  // Médias & Communication
  { fr: "Journaliste", en: "Journalist", category: "Médias" },
  { fr: "Photographe", en: "Photographer", category: "Médias" },
  { fr: "Monteur vidéo", en: "Video editor", category: "Médias" },
  { fr: "Community manager", en: "Community manager", category: "Médias" },
  { fr: "Chargé de communication", en: "PR specialist", category: "Médias" },
  { fr: "Traducteur", en: "Translator", category: "Médias" },
  { fr: "Bibliothécaire", en: "Librarian", category: "Médias" },

  // Sécurité & Gardiennage
  { fr: "Agent de sécurité", en: "Security agent", category: "Sécurité" },
  { fr: "Gardien / Vigile", en: "Security guard", category: "Sécurité" },

  // Services à domicile
  { fr: "Femme de ménage", en: "Housekeeper", category: "Services" },
  { fr: "Jardinier", en: "Gardener", category: "Services" },
  { fr: "Portier", en: "Doorman", category: "Services" },

  // Marketing
  { fr: "Stagiaire marketing", en: "Marketing intern", category: "Marketing" },
  { fr: "Chargé de marketing", en: "Marketing officer", category: "Marketing" },
  { fr: "Responsable marketing", en: "Marketing manager", category: "Marketing" },

  // Général
  { fr: "Autres", en: "Other", category: "Général" },
  { fr: "Sans emploi", en: "Unemployed", category: "Général" },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  placeholderTextColor: string;
  lang: "fr" | "en" | "zh";
  colors: ThemeColors;
  inputStyle?: object | object[];
  testID?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function HeadlineSuggestInput({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  lang,
  colors,
  inputStyle,
  testID,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [customText, setCustomText] = useState("");
  const [customFocused, setCustomFocused] = useState(false);

  const isFr = lang === "fr";

  // Label each suggestion by locale
  const labeled = useMemo(
    () => SUGGESTIONS.map((s) => ({ label: isFr ? s.fr : s.en, category: s.category })),
    [isFr]
  );

  // Filter by search query
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return labeled;
    return labeled.filter((s) => s.label.toLowerCase().includes(q));
  }, [search, labeled]);

  // Show "Utiliser: X" when the typed query has no exact match in results
  const showUsePrompt = useMemo(() => {
    const q = search.trim();
    if (!q) return false;
    return !filtered.some((f) => f.label.toLowerCase() === q.toLowerCase());
  }, [search, filtered]);

  const handleSelect = (title: string) => {
    onChangeText(title);
    setModalVisible(false);
    setSearch("");
    setCustomText("");
  };

  const handleCustomConfirm = () => {
    const trimmed = customText.trim();
    if (trimmed.length > 0) {
      onChangeText(trimmed);
      setModalVisible(false);
      setSearch("");
      setCustomText("");
    }
  };

  const openModal = () => {
    setSearch("");
    setCustomText("");
    setModalVisible(true);
  };

  const GREEN = "#3BAD4E";

  return (
    <>
      {/* ── Trigger ───────────────────────────────────────────────────────── */}
      <Pressable
        testID={testID}
        onPress={openModal}
        style={[
          {
            flexDirection: "row" as const,
            alignItems: "center" as const,
            justifyContent: "space-between" as const,
            paddingRight: 14,
          },
          inputStyle as any,
          value.length > 0 ? { borderColor: GREEN } : null,
        ]}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            color: value.length > 0 ? colors.text : placeholderTextColor,
          }}
          numberOfLines={1}
        >
          {value.length > 0 ? value : placeholder}
        </Text>
        <ChevronDown size={16} color={colors.textMuted} strokeWidth={2} />
      </Pressable>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: colors.background }}
          edges={["top", "bottom"]}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.text,
                  letterSpacing: -0.3,
                }}
              >
                {isFr ? "Titre professionnel" : "Professional title"}
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.toggleBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                testID="headline-modal-close"
              >
                <X size={16} color={colors.textMuted} strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* Search bar */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginHorizontal: 16,
                marginTop: 16,
                marginBottom: 8,
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: colors.toggleBg,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: colors.border,
              }}
            >
              <Search size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                autoFocus
                value={search}
                onChangeText={setSearch}
                placeholder={isFr ? "Rechercher un titre…" : "Search a title…"}
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 }}
                returnKeyType="search"
                selectionColor={GREEN}
                cursorColor={GREEN}
                testID="headline-search-input"
              />
              {search.length > 0 ? (
                <Pressable
                  onPress={() => setSearch("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={14} color={colors.textMuted} strokeWidth={2.5} />
                </Pressable>
              ) : null}
            </View>

            {/* List */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.label}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
              ItemSeparatorComponent={() => (
                <View
                  style={{
                    height: 1,
                    backgroundColor: colors.border,
                    marginLeft: 66,
                    opacity: 0.6,
                  }}
                />
              )}
              renderItem={({ item }) => {
                const isSelected = value === item.label;
                return (
                  <Pressable
                    onPress={() => handleSelect(item.label)}
                    testID={`headline-option-${item.label}`}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 20,
                      paddingVertical: 17,
                      backgroundColor: pressed
                        ? colors.toggleBg
                        : isSelected
                        ? colors.card
                        : "transparent",
                    })}
                  >
                    {/* Selection indicator */}
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        marginRight: 14,
                        borderWidth: isSelected ? 0 : 2,
                        borderColor: isSelected ? "transparent" : colors.textMuted,
                        backgroundColor: isSelected ? GREEN : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected ? (
                        <Check size={15} color="#fff" strokeWidth={3} />
                      ) : null}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: isSelected ? "600" : "400",
                          color: isSelected ? GREEN : colors.text,
                        }}
                      >
                        {item.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View
                  style={{
                    paddingVertical: 40,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 14, color: colors.textMuted, textAlign: "center" }}
                  >
                    {isFr
                      ? "Aucun titre trouvé.\nSaisis ton titre ci-dessous."
                      : "No title found.\nType your own below."}
                  </Text>
                </View>
              }
              ListFooterComponent={
                <>
                  {showUsePrompt ? (
                    <Pressable
                      testID="headline-use-custom"
                      onPress={() => handleSelect(search.trim())}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 20,
                        paddingVertical: 17,
                        backgroundColor: pressed ? colors.toggleBg : "transparent",
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                      })}
                    >
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          marginRight: 14,
                          borderWidth: 2,
                          borderColor: GREEN,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <PenLine size={13} color={GREEN} strokeWidth={2.5} />
                      </View>
                      <Text style={{ fontSize: 15, color: GREEN, fontWeight: "500", flex: 1 }}>
                        {isFr ? `Utiliser : "${search.trim()}"` : `Use: "${search.trim()}"`}
                      </Text>
                    </Pressable>
                  ) : null}
                  <View
                  style={{
                    margin: 16,
                    marginTop: 8,
                    padding: 16,
                    backgroundColor: colors.card,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: customFocused ? GREEN : colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <PenLine size={15} color={colors.accent} strokeWidth={2} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: colors.textSecondary,
                      }}
                    >
                      {isFr ? "Titre personnalisé" : "Custom title"}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <TextInput
                      value={customText}
                      onChangeText={setCustomText}
                      onFocus={() => setCustomFocused(true)}
                      onBlur={() => setCustomFocused(false)}
                      placeholder={
                        isFr
                          ? "Ex: Responsable e-commerce…"
                          : "E.g. E-commerce manager…"
                      }
                      placeholderTextColor={colors.textMuted}
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: colors.text,
                        paddingVertical: 8,
                      }}
                      returnKeyType="done"
                      onSubmitEditing={handleCustomConfirm}
                      selectionColor={GREEN}
                      cursorColor={GREEN}
                      testID="headline-custom-input"
                    />
                    <Pressable
                      onPress={handleCustomConfirm}
                      disabled={customText.trim().length === 0}
                      style={({ pressed }) => ({
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor:
                          customText.trim().length === 0
                            ? colors.toggleBg
                            : GREEN,
                        opacity: pressed ? 0.8 : 1,
                      })}
                      testID="headline-custom-confirm"
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color:
                            customText.trim().length === 0
                              ? colors.textMuted
                              : "#fff",
                        }}
                      >
                        {isFr ? "OK" : "OK"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                </>
              }
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
