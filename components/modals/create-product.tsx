// (Assumindo que está em components/CreateProductModal.tsx)

import { useAuth } from "@/context/auth"; // 1. Precisa do hook de autenticação
import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// 2. Mova os tipos e a URL para cá
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL; // <<-- ATUALIZE AQUI
type Category = {
  id: string;
  name: string;
};

// 3. Interface de Props simplificada
interface CreateProductModalProps {
  visible: boolean;
  scannedBarcode: string | null;
  onClose: () => void; // A única função que o pai precisa passar
}

export default function CreateProductModal({
  visible,
  scannedBarcode,
  onClose,
}: CreateProductModalProps) {
  // 4. A lógica de autenticação e estado agora vive AQUI
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [newProductName, setNewProductName] = useState("");
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [newThresholdDays, setNewThresholdDays] = useState("7");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // 5. useEffect para buscar dados e resetar o formulário
  useEffect(() => {
    // Só executa quando o modal se torna visível
    if (visible) {
      // Reseta o formulário
      setNewProductName("");
      setNewThresholdDays("7");
      setCategories([]);
      setIsLoadingCategories(true);

      const fetchCategories = async () => {
        if (!token) return; // Sai se não houver token

        try {
          const response = await fetch(`${API_BASE_URL}/api/categories`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error("Falha ao buscar categorias");

          const data = await response.json();
          setCategories(data.data || []);

          // Seleciona a primeira categoria por padrão
          if (data.data?.length > 0) {
            setNewCategory(data.data[0].id);
          }
        } catch (error) {
          Alert.alert("Erro", "Não foi possível carregar as categorias.");
          onClose(); // Fecha o modal se as categorias falharem
        } finally {
          setIsLoadingCategories(false);
        }
      };

      fetchCategories();
    }
  }, [visible, token]); // Re-executa se o modal abrir ou o token mudar

  // 6. A lógica de "Salvar" agora é interna
  const handleCreateProduct = async () => {
    if (
      !newProductName ||
      !newCategory ||
      !newThresholdDays ||
      !scannedBarcode
    ) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }

    setIsCreatingProduct(true);
    try {
      const body = {
        name: newProductName,
        categoryId: newCategory,
        notificationThresholdDays: parseInt(newThresholdDays, 10),
        barcode: scannedBarcode,
      };

      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Não foi possível criar o produto.");
      }

      // SUCESSO!
      Alert.alert("Sucesso", `Produto "${data.data.name}" criado no catálogo.`);
      onClose(); // Apenas fecha o modal (como discutimos)
    } catch (error) {
      console.error(error);
      Alert.alert("Não foi possível criar o produto.");
    } finally {
      setIsCreatingProduct(false);
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
          {/* 7. Lógica de Loading Interno */}
          {isLoadingCategories ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text>Carregando categorias...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.modalTitle}>Cadastrar Novo Produto</Text>

              <Text style={styles.label}>Código de Barras:</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={scannedBarcode || ""}
                editable={false}
              />

              <Text style={styles.label}>Nome do Produto:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Óleo YPF 1L 15W40"
                value={newProductName}
                onChangeText={setNewProductName}
              />

              <Text style={styles.label}>Categoria:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newCategory}
                  onValueChange={(itemValue) => setNewCategory(itemValue!)}
                  style={styles.picker}>
                  {categories.map((cat) => (
                    <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>
                Notificar Vencimento (Dias antes):
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 7"
                keyboardType="number-pad"
                value={newThresholdDays}
                onChangeText={setNewThresholdDays}
              />

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isCreatingProduct && styles.buttonDisabled,
                ]}
                onPress={handleCreateProduct} // Chama a função interna
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
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    height: 300, // Dê uma altura fixa para o modal em loading
    justifyContent: "center",
    alignItems: "center",
  },
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
