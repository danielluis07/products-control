import RemoveStockModal from "@/components/modals/remove-lot";
import { useAuth } from "@/context/auth"; // 1. Importe o useAuth
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// 2. Defina os Tipos de dados (baseado na sua API)
type Log = {
  id: string;
  action: string;
  quantityChange: number;
  timestamp: string;
  userName: string | null;
};

type LotDetails = {
  id: string;
  expiryDate: string;
  initialQuantity: number;
  currentQuantity: number;
  product: {
    name: string;
    barcode: string;
  } | null;
  activityLogs: Log[];
};

export const options = {
  title: "Detalhes do produto",
};

// A URL da sua API
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, logout } = useAuth(); // 3. Pega o token

  // 4. Estados para os dados, loading e erro
  const [item, setItem] = useState<LotDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const insets = useSafeAreaInsets();

  const [isRemoveModalVisible, setIsRemoveModalVisible] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!id || !token) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/inventory-items/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout(); // Token inválido
        }
        throw new Error(data.message || "Erro ao buscar detalhes do lote");
      }

      setItem(data.data);
    } catch (e) {
      console.error(e);
      setError("Não foi possível carregar os detalhes do lote.");
    } finally {
      setIsLoading(false);
    }
  }, [id, token, logout]);

  // 5. useFocusEffect para buscar os dados
  useFocusEffect(
    useCallback(() => {
      fetchDetails();
    }, [fetchDetails]) // Dependências
  );

  const handleCloseRemoveModal = (didSave: boolean) => {
    setIsRemoveModalVisible(false);
    if (didSave) {
      // Se o modal salvou com sucesso, buscamos os dados
      // novamente para atualizar a "Quantidade Atual"
      fetchDetails();
    }
  };

  // Função para formatar data (pode mover para utils)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const translateAction = (action: string) => {
    switch (action) {
      case "sold":
        return "Item vendido";
      case "removed_expired":
        return "Removido por vencimento";
      case "removed_manual":
        return "Removido manualmente";
      default:
        return "Ação desconhecida";
    }
  };

  // 6. Renderiza os estados
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || "Lote não encontrado."}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.productName}>
          {item.product?.name || "Produto"}
        </Text>
        <Text style={styles.barcode}>Cód: {item.product?.barcode}</Text>
      </View>

      {/* Detalhes principais */}
      <View style={styles.detailsCard}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Qtd. Atual</Text>
          <Text style={styles.detailValue}>{item.currentQuantity}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Qtd. Inicial</Text>
          <Text style={styles.detailValue}>{item.initialQuantity}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Validade</Text>
          <Text style={styles.detailValue}>{formatDate(item.expiryDate)}</Text>
        </View>
      </View>

      {/* Histórico */}
      <View style={styles.logsContainer}>
        <Text style={styles.sectionTitle}>Histórico do Lote</Text>
        <FlatList
          data={item.activityLogs}
          keyExtractor={(log) => log.id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhuma atividade registrada.</Text>
          }
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item: log }) => (
            <View style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.logAction}>
                  {translateAction(log.action)}
                </Text>
                <Text style={styles.logDate}>{formatDate(log.timestamp)}</Text>
              </View>
              <Text style={styles.logDetails}>
                Quantidade:{" "}
                <Text style={{ fontWeight: "600" }}>{log.quantityChange}</Text>
              </Text>
              <Text style={styles.logUser}>
                Por:{" "}
                <Text style={{ fontWeight: "500" }}>
                  {log.userName || "Usuário"}
                </Text>
              </Text>
            </View>
          )}
        />
      </View>

      {/* Botão principal */}
      <View style={[styles.footer, { bottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setIsRemoveModalVisible(true)}>
          <Text style={styles.actionButtonText}>
            Registrar Saída de Estoque
          </Text>
        </TouchableOpacity>
      </View>

      <RemoveStockModal
        visible={isRemoveModalVisible}
        inventoryItemId={id}
        currentQuantity={item.currentQuantity}
        onClose={handleCloseRemoveModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 16,
    textAlign: "center",
  },
  header: {
    marginTop: 20,
    alignItems: "center",
  },
  productName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  barcode: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  detailsCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginTop: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  detailItem: {
    alignItems: "center",
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: "#EEE",
    marginHorizontal: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
  },
  logsContainer: {
    paddingHorizontal: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    marginTop: 6,
    color: "#222",
  },
  logCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  logAction: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  logDate: {
    fontSize: 12,
    color: "#999",
  },
  logDetails: {
    fontSize: 14,
    color: "#333",
  },
  logUser: {
    fontSize: 13,
    color: "#555",
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    fontSize: 14,
    marginTop: 20,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  actionButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#FF3B30",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
