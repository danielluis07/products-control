import { useAuth } from "@/context/auth";
import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform, // Import Platform for better Picker styling/layout
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// MUDANÇA 1: Lista de ações atualizada
const actionOptions = [
  // Opções de Saída
  { label: "Registrar Venda (-)", value: "sold" },
  { label: "Remover (Vencido) (-)", value: "removed_expired" },
  { label: "Remover (Perda/Dano) (-)", value: "removed_manual" },
  // Opção de Entrada
  { label: "Reabastecimento / Correção (+)", value: "restock" },
];

interface AdjustStockModalProps {
  visible: boolean;
  inventoryItemId: string | undefined;
  currentQuantity: number;
  onClose: (didSave: boolean) => void;
}

// MUDANÇA 2: Nome do Componente
export default function AdjustStockModal({
  visible,
  inventoryItemId,
  currentQuantity,
  onClose,
}: AdjustStockModalProps) {
  const { token } = useAuth();
  const [quantity, setQuantity] = useState("");
  // Definir "sold" (Venda) como padrão
  const [action, setAction] = useState<string>(actionOptions[0].value);
  const [isLoading, setIsLoading] = useState(false);

  // MUDANÇA 3: Variável de UI para saber se é Adição ou Remoção
  const isAddition = action === "restock";

  useEffect(() => {
    if (visible) {
      setQuantity("");
      setAction(actionOptions[0].value); // Sempre reseta para "Venda"
      setIsLoading(false);
    }
  }, [visible]);

  // MUDANÇA 4: Lógica de Salvamento atualizada
  const handleSaveStock = async () => {
    if (!quantity) {
      Alert.alert("Erro", "Por favor, insira a quantidade.");
      return;
    }

    const numQuantity = parseInt(quantity.replace(/\D+/g, ""), 10); // Limpa não-números
    if (isNaN(numQuantity) || numQuantity <= 0) {
      Alert.alert("Erro", "Quantidade deve ser um número maior que zero.");
      return;
    }

    // MUDANÇA 5: Validação de estoque SÓ se for REMOÇÃO
    if (!isAddition && numQuantity > currentQuantity) {
      Alert.alert(
        "Erro de Estoque",
        `Quantidade inválida. Você só pode remover até ${currentQuantity} unidades.`
      );
      return;
    }

    setIsLoading(true);
    try {
      const body = {
        action: action,
        quantity: numQuantity, // A API espera um positivo. O backend define + ou -
      };

      const response = await fetch(
        `${API_BASE_URL}/api/inventory-items/${inventoryItemId}/activity`, // Endpoint que criamos
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

      Alert.alert("Sucesso", "Ajuste de estoque registrado!");
      onClose(true);
    } catch (error) {
      Alert.alert(
        "Erro",
        (error as Error).message || "Não foi possível registrar o ajuste."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // MUDANÇA 6: Feedback visual dinâmico (Cor do botão)
  const saveButtonStyle = [
    styles.saveButton,
    isAddition ? styles.saveButtonAdd : styles.saveButtonRemove,
    isLoading && styles.buttonDisabled,
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => onClose(false)}
      statusBarTranslucent={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}>
        <View style={styles.modalContainer}>
          {/* Adicionado TouchableOpacity para fechar modal ao clicar fora */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => onClose(false)}
          />
          <View style={styles.modalContent}>
            {/* MUDANÇA 7: Textos da UI atualizados */}
            <Text style={styles.modalTitle}>Ajustar Estoque</Text>

            <Text style={styles.label}>Tipo de Movimentação:</Text>
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

            <Text style={styles.label}>
              {isAddition ? "Quantidade a ADICIONAR:" : "Quantidade a REMOVER:"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={isAddition ? "Ex: 10" : `Atual: ${currentQuantity}`}
              keyboardType="number-pad"
              value={quantity}
              onChangeText={(text) => setQuantity(text.replace(/\D+/g, ""))} // Garante só números
            />

            <TouchableOpacity
              style={saveButtonStyle}
              onPress={handleSaveStock}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isAddition ? "Confirmar Adição" : "Confirmar Remoção"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => onClose(false)}
              disabled={isLoading}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    // Garantir padding inferior seguro
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
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
    // Fix para o picker não estourar no Android
    overflow: "hidden",
  },
  // MUDANÇA 8: Estilos de Botão Refatorados
  saveButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  saveButtonAdd: {
    backgroundColor: "#5cb85c", // Verde
  },
  saveButtonRemove: {
    backgroundColor: "#d9534f", // Vermelho
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
