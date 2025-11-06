import { useAuth } from "@/context/auth";
import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// Baseado no seu 'activityActionEnum'
const actionOptions = [
  { label: "Registrar Venda", value: "sold" },
  { label: "Remover (Vencido)", value: "removed_expired" },
  { label: "Remover (Perda/Dano)", value: "removed_manual" },
];

interface RemoveStockModalProps {
  visible: boolean;
  inventoryItemId: string | undefined;
  currentQuantity: number;
  onClose: (didSave: boolean) => void;
}

export default function RemoveStockModal({
  visible,
  inventoryItemId,
  currentQuantity,
  onClose,
}: RemoveStockModalProps) {
  const { token } = useAuth();
  const [quantity, setQuantity] = useState("");
  const [action, setAction] = useState<string>(actionOptions[0].value);
  const [isLoading, setIsLoading] = useState(false);

  // Reseta o formulário quando o modal é aberto
  useEffect(() => {
    if (visible) {
      setQuantity("");
      setAction(actionOptions[0].value);
      setIsLoading(false);
    }
  }, [visible]);

  // Lógica de salvar (POST /api/inventoryItems/[id]/activity)
  const handleRemoveStock = async () => {
    if (!quantity) {
      Alert.alert("Erro", "Por favor, insira a quantidade.");
      return;
    }

    const numQuantity = parseInt(quantity, 10);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      Alert.alert("Erro", "Quantidade deve ser um número maior que zero.");
      return;
    }

    if (numQuantity > currentQuantity) {
      Alert.alert(
        "Erro",
        `Quantidade inválida. Você só pode remover até ${currentQuantity} unidades.`
      );
      return;
    }

    setIsLoading(true);
    try {
      const body = {
        action: action,
        quantity: numQuantity, // A API espera um número positivo
      };

      const response = await fetch(
        `${API_BASE_URL}/api/inventory-items/${inventoryItemId}/activity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Falha ao registrar atividade.");
      }

      Alert.alert("Sucesso", "Saída registrada no inventário.");
      onClose(true); // 1. Fecha o modal e sinaliza que salvou
    } catch (error) {
      Alert.alert("Não foi possível registrar a saída.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => onClose(false)}
      statusBarTranslucent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Registrar Saída de Estoque</Text>

          <Text style={styles.label}>Motivo da Saída:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={action}
              onValueChange={(itemValue) => setAction(itemValue)}>
              {actionOptions.map((opt) => (
                <Picker.Item
                  key={opt.value}
                  label={opt.label}
                  value={opt.value}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Quantidade a Remover:</Text>
          <TextInput
            style={styles.input}
            placeholder={`Máx: ${currentQuantity}`}
            keyboardType="number-pad"
            value={quantity}
            onChangeText={setQuantity}
          />

          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.buttonDisabled]}
            onPress={handleRemoveStock}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Confirmar Saída</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => onClose(false)} // 3. Fecha e sinaliza que não salvou
            disabled={isLoading}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 22,
    paddingTop: 22,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
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
  pickerContainer: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: "#d9534f", // Vermelho
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
