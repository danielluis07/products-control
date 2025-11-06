import { useAuth } from "@/context/auth";
import { useDebounce } from "@/hooks/use-debounce";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
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

  // Função para buscar inventário
  const fetchInventory = async (pageNum: number, isRefresh = false) => {
    if (!token) return;

    // Se for refresh (página 1), mostra loading principal
    // Se for carregar mais, mostra loading no rodapé
    if (isRefresh) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    const url = new URL(
      `${process.env.EXPO_PUBLIC_API_URL}/api/inventory-items`
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

      // Se for refresh, substitui os itens. Se não, adiciona aos existentes
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
    }, [token, debouncedSearch, logout])
  );

  // Função chamada quando o usuário chega ao fim da lista
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchInventory(nextPage, false);
    }
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

      {!isLoading && items.length > 0 && (
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
            return (
              <TouchableOpacity
                style={styles.itemContainer}
                onPress={() => router.push(`/inventory/${item.id}`)}>
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
                    style={[styles.itemDate, isExpired && styles.expiredText]}>
                    {isExpired ? "VENCIDO" : "Vence em:"}
                  </Text>
                  <Text
                    style={[styles.itemDate, isExpired && styles.expiredText]}>
                    {formatDate(item.expiryDate)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5} // Carrega quando está a 50% do fim
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
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    maxWidth: 200,
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
});
