/* // hooks/useApi.ts
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "../context/auth";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useApi() {
  const { token, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const request = useCallback(
    async <T = any>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<ApiResponse<T>> => {
      if (!token) {
        Alert.alert(
          "Não Autenticado",
          "Por favor, faça login para continuar.",
          [{ text: "OK", onPress: () => logout() }]
        );
        return { data: null, error: "Não autenticado", loading: false };
      }

      setLoading(true);

      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
            ...options.headers,
          },
        });

        // Para respostas sem conteúdo (204 No Content)
        if (response.status === 204) {
          return { data: null, error: null, loading: false };
        }

        const contentType = response.headers.get("content-type");
        let data;

        // Verifica se a resposta é JSON
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          // Token inválido ou sessão expirada
          if (response.status === 401) {
            Alert.alert(
              "Sessão Expirada",
              "Sua sessão expirou. Por favor, faça login novamente.",
              [{ text: "OK", onPress: () => logout() }]
            );
            return { data: null, error: "Sessão expirada", loading: false };
          }

          // Erro de permissão
          if (response.status === 403) {
            return {
              data: null,
              error: "Você não tem permissão para realizar esta ação",
              loading: false,
            };
          }

          // Outros erros
          const errorMessage =
            typeof data === "object"
              ? data.error || data.message || "Erro na requisição"
              : "Erro na requisição";

          return { data: null, error: errorMessage, loading: false };
        }

        return { data, error: null, loading: false };
      } catch (error) {
        console.error("Erro na requisição:", error);

        if (
          error instanceof TypeError &&
          error.message === "Network request failed"
        ) {
          return {
            data: null,
            error: "Erro de conexão. Verifique sua internet.",
            loading: false,
          };
        }

        return {
          data: null,
          error: "Erro inesperado. Tente novamente.",
          loading: false,
        };
      } finally {
        setLoading(false);
      }
    },
    [token, logout]
  );

  // Métodos convenientes
  const get = useCallback(
    (endpoint: string) => {
      return request(endpoint, { method: "GET" });
    },
    [request]
  );

  const post = useCallback(
    (endpoint: string, body?: any) => {
      return request(endpoint, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
    },
    [request]
  );

  const put = useCallback(
    (endpoint: string, body?: any) => {
      return request(endpoint, {
        method: "PUT",
        body: body ? JSON.stringify(body) : undefined,
      });
    },
    [request]
  );

  const patch = useCallback(
    (endpoint: string, body?: any) => {
      return request(endpoint, {
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
      });
    },
    [request]
  );

  const del = useCallback(
    (endpoint: string) => {
      return request(endpoint, { method: "DELETE" });
    },
    [request]
  );

  return {
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    loading,
  };
}

// Hook para buscar dados na montagem do componente
export function useFetch<T = any>(endpoint: string, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await api.get(endpoint);
    setData(result.data);
    setError(result.error);
    setLoading(false);
  }, [endpoint, api]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  return { data, error, loading, refetch: fetchData };
}

// Hook para mutações (POST, PUT, DELETE)
export function useMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>
) {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setLoading(true);
      setError(null);

      try {
        const result = await mutationFn(variables);
        setData(result.data);
        setError(result.error);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);
        return { data: null, error: errorMessage, loading: false };
      } finally {
        setLoading(false);
      }
    },
    [mutationFn]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { mutate, data, error, loading, reset };
}
 */
