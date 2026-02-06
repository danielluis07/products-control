// components/modals/create-product.tsx
import { useAuth } from "@/context/auth";
import { Picker } from "@react-native-picker/picker";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

interface CreateProductModalProps {
  visible: boolean;
  scannedBarcode: string | null;
  onClose: () => void;
  onCreateSuccess: (product: any) => void;
}

export default function CreateProductModal({
  visible,
  scannedBarcode,
  onClose,
  onCreateSuccess,
}: CreateProductModalProps) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [categories, setCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [newProductName, setNewProductName] = useState("");
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [newThresholdDays, setNewThresholdDays] = useState("15");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  useEffect(() => {
    if (visible) {
      setNewProductName("");
      setNewThresholdDays("15");
      fetchCategories();
    }
  }, [visible]);

  const fetchCategories = async () => {
    if (!token) return;
    try {
      setIsLoadingCategories(true);
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setCategories(data.data || []);
      if (data.data?.length > 0) setNewCategory(data.data[0].id);
    } catch (error) {
      Alert.alert("Erro", "Falha ao carregar categorias.");
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProductName || !newCategory || !scannedBarcode) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }

    setIsCreatingProduct(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newProductName,
          categoryId: newCategory,
          notificationThresholdDays: parseInt(newThresholdDays, 10),
          barcode: scannedBarcode,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      onCreateSuccess(data.data);
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Erro ao criar produto.");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}>
        <View
          style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.grabber} />

          {isLoadingCategories ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={{ marginTop: 10 }}>Carregando configurações...</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Novo Produto</Text>

              <Text style={styles.label}>Código de Barras:</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={scannedBarcode || ""}
                editable={false}
              />

              <Text style={styles.label}>Nome do Produto:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Óleo Motul 1L"
                value={newProductName}
                onChangeText={setNewProductName}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Categoria:</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newCategory}
                      onValueChange={(val) => setNewCategory(val)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem} // Estilo específico para iOS
                    >
                      {categories.map((cat) => (
                        <Picker.Item
                          key={cat.id}
                          label={cat.name}
                          value={cat.id}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Aviso (Dias):</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newThresholdDays}
                      onValueChange={(val) => setNewThresholdDays(val)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}>
                      <Picker.Item label="15 dias" value="15" />
                      <Picker.Item label="30 dias" value="30" />
                      <Picker.Item label="60 dias" value="60" />
                    </Picker>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isCreatingProduct && styles.buttonDisabled,
                ]}
                onPress={handleCreateProduct}
                disabled={isCreatingProduct}>
                {isCreatingProduct ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Salvar no Catálogo</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={isCreatingProduct}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
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
    paddingTop: 12,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "90%",
  },
  grabber: {
    width: 40,
    height: 5,
    backgroundColor: "#eee",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 15,
  },
  loadingContainer: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: { fontSize: 13, fontWeight: "700", color: "#444", marginBottom: 5 },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  inputDisabled: { backgroundColor: "#e8e8e8", color: "#888" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  pickerContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "center",
  },
  picker: {
    height: Platform.OS === "ios" ? 120 : 50,
    width: "100%",
  },
  pickerItem: {
    fontSize: 14, // Diminuir a fonte no iOS ajuda a caber no container
    height: 120,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
  },
  saveButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  cancelButton: { padding: 15, alignItems: "center" },
  cancelButtonText: { color: "#007AFF", fontSize: 16, fontWeight: "500" },
  buttonDisabled: { backgroundColor: "#ccc" },
});
