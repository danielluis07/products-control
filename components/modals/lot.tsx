// components/modals/lot.tsx
import { useAuth } from "@/context/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// Essencial para iPhones com Notch/Home Indicator
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

interface LotModalProps {
  visible: boolean;
  foundProduct: any | null; // Alterado para any ou sua Interface Product
  onClose: () => void;
}

type BatchLot = {
  id: string;
  quantity: string;
  expiryDate: string;
};

export default function LotModal({
  visible,
  foundProduct,
  onClose,
}: LotModalProps) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets(); // Pega as margens seguras do iPhone

  const [lotes, setLotes] = useState<BatchLot[]>([]);
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setLotes([]);
      setQuantity("");
      setExpiryDate("");
      setIsSaving(false);
    }
  }, [visible]);

  const handleDateChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(
        2,
        4,
      )}/${cleaned.slice(4, 8)}`;
    }
    setExpiryDate(formatted);
  };

  const handleAddLotToList = () => {
    if (!quantity || !expiryDate) {
      Alert.alert("Erro", "Preencha a Quantidade e a Data de Validade.");
      return;
    }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(expiryDate)) {
      Alert.alert("Erro", "Formato da data inválido. Use DD/MM/AAAA.");
      return;
    }
    setLotes([
      ...lotes,
      { id: Math.random().toString(), quantity, expiryDate },
    ]);
    setQuantity("");
    setExpiryDate("");
  };

  const handleSaveAllLots = async () => {
    const finalLots = [...lotes];
    if (quantity && expiryDate) {
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(expiryDate)) {
        Alert.alert("Erro", "A data no campo de texto é inválida.");
        return;
      }
      finalLots.push({ id: Math.random().toString(), quantity, expiryDate });
    }

    if (finalLots.length === 0) {
      Alert.alert("Atenção", "Preencha os campos ou adicione um lote.");
      return;
    }

    setIsSaving(true);
    try {
      const savePromises = finalLots.map((lote) => {
        const [day, month, year] = lote.expiryDate.split("/");
        return fetch(`${API_BASE_URL}/api/inventory-items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: foundProduct!.id,
            initialQuantity: parseInt(lote.quantity, 10),
            expiryDate: `${year}-${month}-${day}`,
          }),
        });
      });

      const responses = await Promise.all(savePromises);
      if (responses.some((res) => !res.ok))
        throw new Error("Erro em alguns lotes.");

      Alert.alert("Sucesso!", `${finalLots.length} lote(s) adicionados.`);
      onClose();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar os lotes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}>
      {/* Ajuste: behavior condicional e remoção da View duplicada */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}>
        <View
          style={[
            styles.modalContent,
            { paddingBottom: insets.bottom + 20 }, // Garante que o botão não fique sob a barra do iPhone
          ]}>
          {/* Indicador visual de "puxar" comum no iOS */}
          <View style={styles.grabber} />

          <Text style={styles.modalTitle}>Adicionar Lotes</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 10 }}>
            <Text style={styles.productName}>{foundProduct?.name}</Text>
            <Text style={styles.productBarcode}>
              Cód: {foundProduct?.barcode}
            </Text>

            <Text style={styles.label}>Quantidade:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 50"
              keyboardType="number-pad"
              value={quantity}
              onChangeText={setQuantity}
              editable={!isSaving}
            />

            <Text style={styles.label}>Data de Validade:</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              value={expiryDate}
              onChangeText={handleDateChange}
              keyboardType="number-pad"
              editable={!isSaving}
            />

            <TouchableOpacity
              style={[styles.addButton, isSaving && styles.buttonDisabled]}
              onPress={handleAddLotToList}
              disabled={isSaving}>
              <Text style={styles.addButtonText}>+ Adicionar Lote à Lista</Text>
            </TouchableOpacity>

            {lotes.map((item) => (
              <View key={item.id} style={styles.lotItem}>
                <Text>
                  {item.quantity} un. | {item.expiryDate}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setLotes(lotes.filter((l) => l.id !== item.id))
                  }>
                  <Text style={{ color: "red", fontWeight: "bold" }}>
                    Remover
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.buttonDisabled]}
              onPress={handleSaveAllLots}
              disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  Salvar {lotes.length > 0 ? `(${lotes.length})` : ""} Lotes
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSaving}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end", // Alinha o modal na base da tela
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  grabber: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 10,
  },
  modalContent: {
    backgroundColor: "white",
    paddingHorizontal: 22,
    paddingTop: 12,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "90%", // Evita que o modal cubra a tela inteira se houver muitos lotes
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  productName: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  productBarcode: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  label: { fontSize: 14, fontWeight: "bold", color: "#333", marginBottom: 6 },
  input: {
    backgroundColor: "#f2f2f2",
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: "#EBF5FF",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  addButtonText: { color: "#007AFF", fontSize: 16, fontWeight: "bold" },
  lotItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  cancelButton: { padding: 15, alignItems: "center" },
  cancelButtonText: { color: "#007AFF", fontSize: 16, fontWeight: "500" },
  buttonDisabled: { backgroundColor: "#ccc", borderColor: "#aaa" },
});
