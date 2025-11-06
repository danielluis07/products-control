// (Assumindo que está em components/LotModal.tsx)

import { useAuth } from "@/context/auth"; // 2. Precisa do token
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

interface LotModalProps {
  visible: boolean;
  foundProduct: Product | null;
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
        4
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
    if (lotes.length === 0) {
      Alert.alert("Erro", "Adicione pelo menos um lote antes de salvar.");
      return;
    }

    setIsSaving(true);

    console.log("Salvando lotes:", lotes);

    try {
      // Cria um array de 'promises' de fetch
      const savePromises = lotes.map((lote) => {
        // Converte a data para AAAA-MM-DD
        const [day, month, year] = lote.expiryDate.split("/");
        const isoDate = `${year}-${month}-${day}`;

        const body = {
          productId: foundProduct!.id,
          initialQuantity: parseInt(lote.quantity, 10),
          expiryDate: isoDate,
        };

        return fetch(`${API_BASE_URL}/api/inventory-items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      });

      // Executa todas as promises em paralelo
      const responses = await Promise.all(savePromises);

      console.log("Respostas da API:", responses);

      // Verifica se alguma falhou
      const failed = responses.filter((res) => !res.ok);
      if (failed.length > 0) {
        throw new Error(`${failed.length} lotes falharam ao salvar.`);
      }

      Alert.alert(
        "Sucesso!",
        `${lotes.length} lote(s) de "${foundProduct?.name}" adicionados ao inventário.`
      );
      onClose(); // Fecha o modal principal
    } catch (error) {
      console.error(error);
      Alert.alert("Não foi possível salvar os lotes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Adicionar Lotes (Em Lote)</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={styles.productName}>{foundProduct?.name}</Text>
            <Text style={styles.productBarcode}>
              Cód: {foundProduct?.barcode}
            </Text>

            {/* Inputs */}
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

            {/* Lista de Lotes */}
            {lotes.length > 0 && (
              <Text style={styles.listTitle}>Lotes a Salvar:</Text>
            )}

            {/* SUBSTITUA a FlatList por um map simples */}
            {lotes.map((item) => (
              <View key={item.id} style={styles.lotItem}>
                <Text>{item.quantity} unidades</Text>
                <Text>Vence em: {item.expiryDate}</Text>
              </View>
            ))}

            {/* Botões Finais */}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 22,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  productName: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  productBarcode: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: "#EBF5FF", // Um azul claro
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  addButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  lotItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
    marginBottom: 5,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    padding: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: "#aaa",
  },
});
