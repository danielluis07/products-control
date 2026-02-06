import AdjustStockModal from "@/components/modals/adjust-lot"; // 1. Importe o novo modal
import { useAuth } from "@/context/auth";
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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, logout } = useAuth();

  const [item, setItem] = useState<LotDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const insets = useSafeAreaInsets();

  // 2. Estado renomeado para refletir que é um ajuste geral
  const [isAdjustModalVisible, setIsAdjustModalVisible] = useState(false);

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
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout();
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

  useFocusEffect(
    useCallback(() => {
      fetchDetails();
    }, [fetchDetails]),
  );

  // 3. Handler atualizado
  const handleCloseAdjustModal = (didSave: boolean) => {
    setIsAdjustModalVisible(false);
    if (didSave) {
      fetchDetails(); // Recarrega os dados para atualizar qtd e histórico
    }
  };

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
        return "Venda";
      case "removed_expired":
        return "Vencimento";
      case "removed_manual":
        return "Remoção Manual";
      case "restock": // 4. Novo case para entrada
        return "Reabastecimento / Correção";
      default:
        return "Ação desconhecida";
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
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

      {/* Cards de Detalhes */}
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
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          renderItem={({ item: log }) => {
            // Lógica visual: Se for positivo, mostra verde e sinal de +
            const isPositive = log.quantityChange > 0;

            return (
              <View style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logAction}>
                    {translateAction(log.action)}
                  </Text>
                  <Text style={styles.logDate}>
                    {formatDate(log.timestamp)}
                  </Text>
                </View>
                <Text style={styles.logDetails}>
                  Quantidade:{" "}
                  <Text
                    style={[
                      styles.logQuantity,
                      isPositive
                        ? styles.logQuantityPositive
                        : styles.logQuantityNegative,
                    ]}>
                    {isPositive ? "+" : ""}
                    {log.quantityChange}
                  </Text>
                </Text>
                <Text style={styles.logUser}>
                  Por:{" "}
                  <Text style={styles.logUserName}>
                    {log.userName || "Usuário"}
                  </Text>
                </Text>
              </View>
            );
          }}
        />
      </View>

      {/* Botão Principal */}
      <View style={[styles.footer, { bottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setIsAdjustModalVisible(true)}>
          <Text style={styles.actionButtonText}>Ajustar Estoque</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Ajuste (Antigo Remover) */}
      <AdjustStockModal
        visible={isAdjustModalVisible}
        inventoryItemId={id}
        currentQuantity={item.currentQuantity}
        onClose={handleCloseAdjustModal}
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
    flex: 1,
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
  logUserName: {
    fontWeight: "500",
  },
  logQuantity: {
    fontWeight: "700",
  },
  logQuantityPositive: {
    color: "#2E7D32",
  },
  logQuantityNegative: {
    color: "#D32F2F",
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
  // 5. Estilo do Botão Atualizado
  actionButton: {
    backgroundColor: "#007AFF", // Azul iOS (Action)
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
