import { useAuth } from "@/context/auth";
import { useDebounce } from "@/hooks/use-debounce";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type InventoryItem = {
  id: string;
  currentQuantity: number;
  expiryDate: string; // Vem como string ISO da API
  productName: string;
  productBarcode: string;
};

export default function UserClient() {
  const { token, logout } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Estados para seleção múltipla
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Função para buscar inventário
  const fetchInventory = async (pageNum: number, isRefresh = false) => {
    if (!token) return;

    if (isRefresh) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    const url = new URL(
      `${process.env.EXPO_PUBLIC_API_URL}/api/inventory-items`,
    );
    url.searchParams.append("page", pageNum.toString());
    url.searchParams.append("limit", "20");
    if (debouncedSearch) {
      url.searchParams.append("search", debouncedSearch);
    }

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout();
        }
        throw new Error(result.message || "Erro ao buscar inventário");
      }

      if (isRefresh) {
        setItems(result.data);
      } else {
        setItems((prev) => [...prev, ...result.data]);
      }

      setHasMore(result.pagination.hasMore);
    } catch (e) {
      console.error(e);
      setError("Não foi possível carregar os itens do inventário.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Carrega a primeira página quando a tela ganha foco ou a busca muda
  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setHasMore(true);
      fetchInventory(1, true);
      // Limpa seleção ao voltar para a tela
      setSelectionMode(false);
      setSelectedItems(new Set());
    }, [token, debouncedSearch, logout]),
  );

  // Função chamada quando o usuário chega ao fim da lista
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchInventory(nextPage, false);
    }
  };

  // Ativa o modo de seleção ao segurar um item
  const handleLongPress = (itemId: string) => {
    setSelectionMode(true);
    setSelectedItems(new Set([itemId]));
  };

  // Alterna a seleção de um item
  const toggleItemSelection = (itemId: string) => {
    if (!selectionMode) return;

    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Cancela o modo de seleção
  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedItems(new Set());
  };

  // Seleciona todos os itens
  const selectAll = () => {
    const allIds = new Set(items.map((item) => item.id));
    setSelectedItems(allIds);
  };

  // Remove os itens selecionados
  const deleteSelectedItems = async () => {
    if (selectedItems.size === 0) return;

    Alert.alert(
      "Confirmar remoção",
      `Deseja realmente remover ${selectedItems.size} ${
        selectedItems.size === 1 ? "item" : "itens"
      }?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            const itemsToDelete = Array.from(selectedItems);

            try {
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/inventory-items/delete`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    ids: itemsToDelete,
                  }),
                },
              );

              const result = await response.json();

              setIsDeleting(false);

              if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                  logout();
                }
                throw new Error(
                  result.message || "Erro ao deletar itens do inventário",
                );
              }

              // Remove os itens deletados da lista local
              setItems((prev) =>
                prev.filter((item) => !selectedItems.has(item.id)),
              );

              // Limpa a seleção
              cancelSelection();

              // Mostra mensagem de sucesso
              Alert.alert(
                "Sucesso",
                `${itemsToDelete.length} ${
                  itemsToDelete.length === 1
                    ? "item removido"
                    : "itens removidos"
                } com sucesso!`,
              );
            } catch (error) {
              setIsDeleting(false);
              console.error("Erro ao deletar itens:", error);
              Alert.alert(
                "Erro",
                error instanceof Error
                  ? error.message
                  : "Não foi possível remover os itens. Tente novamente.",
              );
            }
          },
        },
      ],
    );
  };

  // Renderiza o loading no rodapé da lista
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Erro: {error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Barra de ações quando está em modo de seleção */}
      {selectionMode && (
        <View style={styles.selectionBar}>
          <TouchableOpacity
            onPress={cancelSelection}
            style={styles.selectionButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>

          <Text style={styles.selectionText}>
            {selectedItems.size} selecionado(s)
          </Text>

          <View style={styles.selectionActions}>
            <TouchableOpacity
              onPress={selectAll}
              style={styles.selectionButton}>
              <Text style={styles.selectAllText}>Selecionar tudo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={deleteSelectedItems}
              style={[
                styles.deleteButton,
                selectedItems.size === 0 && styles.deleteButtonDisabled,
              ]}
              disabled={selectedItems.size === 0 || isDeleting}>
              {isDeleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="trash" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Campo de busca - escondido em modo de seleção */}
      {!selectionMode && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons
              name="search"
              size={20}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nome do produto..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {isLoading && (
            <ActivityIndicator size="small" style={{ marginTop: 8 }} />
          )}
        </View>
      )}

      {!isLoading && items.length > 0 && !selectionMode && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {items.length} {items.length === 1 ? "lote" : "lotes"} encontrado(s)
          </Text>
        </View>
      )}

      {items.length === 0 && !isLoading ? (
        <View style={styles.centerContainer}>
          <Text style={styles.title}>Nenhum item no inventário.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isExpired = new Date(item.expiryDate) < new Date();
            const isSelected = selectedItems.has(item.id);

            return (
              <TouchableOpacity
                style={[
                  styles.itemContainer,
                  isSelected && styles.itemContainerSelected,
                ]}
                onPress={() => {
                  if (selectionMode) {
                    toggleItemSelection(item.id);
                  } else {
                    router.push(`/inventory/${item.id}`);
                  }
                }}
                onLongPress={() => handleLongPress(item.id)}>
                {selectionMode && (
                  <View style={styles.checkboxContainer}>
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={24}
                      color={isSelected ? "#007AFF" : "#999"}
                    />
                  </View>
                )}

                <View style={styles.itemContent}>
                  <View>
                    <Text
                      style={styles.itemName}
                      numberOfLines={2}
                      ellipsizeMode="tail">
                      {item.productName}
                    </Text>
                    <Text style={styles.itemQuantity}>
                      Quantidade: {item.currentQuantity}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.itemDate,
                        isExpired && styles.expiredText,
                      ]}>
                      {isExpired ? "VENCIDO" : "Vence em:"}
                    </Text>
                    <Text
                      style={[
                        styles.itemDate,
                        isExpired && styles.expiredText,
                      ]}>
                      {formatDate(item.expiryDate)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    padding: 16,
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  itemContainerSelected: {
    backgroundColor: "#E3F2FD",
    borderColor: "#007AFF",
    borderWidth: 2,
  },
  itemContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkboxContainer: {
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    flexShrink: 1,
  },
  itemQuantity: {
    fontSize: 14,
    color: "#555",
  },
  itemDate: {
    fontSize: 14,
    color: "#333",
    textAlign: "right",
  },
  expiredText: {
    color: "red",
    fontWeight: "bold",
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 14,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    elevation: 2,
  },
  selectionButton: {
    padding: 8,
  },
  selectionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  selectionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectAllText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonDisabled: {
    backgroundColor: "#FFCCCB",
  },
});
