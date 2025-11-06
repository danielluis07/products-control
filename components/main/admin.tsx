import { useAuth } from "@/context/auth";
import { useDebounce } from "@/hooks/use-debounce";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
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

export default function AdminClient() {
  const { token, logout } = useAuth();

  const [items, setItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchProducts = async (pageNum: number, isRefresh = false) => {
    if (!token) return;

    if (isRefresh) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    const url = new URL(`${process.env.EXPO_PUBLIC_API_URL}/api/products`);
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
        throw new Error(result.message || "Erro ao buscar produtos");
      }

      if (isRefresh) {
        setItems(result.data);
      } else {
        setItems((prev) => [...prev, ...result.data]);
      }

      setHasMore(result.pagination.hasMore);
    } catch (e) {
      console.error(e);
      setError("Não foi possível carregar os produtos.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setHasMore(true);
      fetchProducts(1, true);
    }, [token, debouncedSearch, logout])
  );

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage, false);
    }
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
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
            {items.length} {items.length === 1 ? "produto" : "produtos"}{" "}
            encontrado(s)
          </Text>
        </View>
      )}

      {items.length === 0 && !isLoading ? (
        <View style={styles.centerContainer}>
          <Text style={styles.title}>Nenhum produto encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.itemContainer}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                  style={styles.itemName}
                  numberOfLines={2}
                  ellipsizeMode="tail">
                  {item.name}
                </Text>
                <Text style={styles.itemQuantity}>
                  Código de barras: {item.barcode || "N/A"}
                </Text>
              </View>
              <View>
                <Text style={styles.itemDate}>
                  Notificar em: {item.notificationThresholdDays} dia(s)
                </Text>
              </View>
            </TouchableOpacity>
          )}
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
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 1,
    overflow: "hidden", // Adiciona esta linha
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    flexShrink: 1, // Permite que o texto encolha se necessário
    flexWrap: "wrap", // Permite quebra de linha
  },
  itemQuantity: {
    fontSize: 14,
    color: "#555",
    flexShrink: 1, // Permite que o texto encolha se necessário
    flexWrap: "wrap", // Permite quebra de linha
  },
  itemDate: {
    fontSize: 14,
    color: "#333",
    textAlign: "right",
    flexShrink: 1, // Permite que o texto encolha se necessário
    flexWrap: "wrap", // Permite quebra de linha
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
