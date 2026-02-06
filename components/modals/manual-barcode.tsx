import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ManualBarcodeModal({
  isManualModalVisible,
  manualBarcode,
  setManualBarcode,
  handleConfirmManualEntry,
  closeManualModal,
  isLoadingProduct,
}: {
  isManualModalVisible: boolean;
  manualBarcode: string;
  closeManualModal: () => void;
  isLoadingProduct: boolean;
  setManualBarcode: (code: string) => void;
  handleConfirmManualEntry: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={isManualModalVisible}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={closeManualModal}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}>
        <View
          style={[
            styles.modalContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 10 },
          ]}>
          {/* reutilizado */}
          <Text style={styles.modalTitle}>Digitação Manual</Text>
          {/* reutilizado */}
          <Text style={styles.label}>Código de Barras:</Text>
          {/* reutilizado */}
          <TextInput
            style={styles.input} // reutilizado
            value={manualBarcode}
            onChangeText={setManualBarcode}
            placeholder="Digite o código..."
            keyboardType="numeric"
            autoFocus={true} // Foca no input ao abrir
          />
          {/* Botão de Salvar (Confirmar) */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              (!manualBarcode || isLoadingProduct) && styles.buttonDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleConfirmManualEntry}
            disabled={!manualBarcode || isLoadingProduct}>
            {isLoadingProduct ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Confirmar</Text>
            )}
          </Pressable>
          {/* Botão de Cancelar */}
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && { opacity: 0.6 },
            ]}
            onPress={closeManualModal}
            disabled={isLoadingProduct}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  inputDisabled: {
    backgroundColor: "#e0e0e0",
    color: "#555",
  },
  pickerContainer: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 15,
  },
  picker: {
    // No Android o picker tem um estilo nativo, no iOS pode precisar de altura
    height: Platform.OS === "ios" ? 120 : "auto",
  },
  buttonDisabled: {
    backgroundColor: "#aaa",
  },
  // Estilos do Modal
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end", // Sobe da parte inferior
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 22,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
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
  saveButton: {
    backgroundColor: "#007AFF", // Azul padrão
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
});
