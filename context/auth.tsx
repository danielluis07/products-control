// context/auth.tsx
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// Tipo do usuário retornado pelo Better Auth
type User = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  role: "user" | "admin" | "moderator" | string;
  stationId: string | null;
};

// Resposta do login do Better Auth com JWT
type LoginResponse = {
  token: string; // session token do Better Auth
  jwtToken: string; // JWT token para APIs
  user: User;
  redirect?: boolean;
};

interface AuthContextData {
  token: string | null; // session token
  jwtToken: string | null; // JWT token
  user: User | null;
  isAuth: boolean;
  isLoading: boolean;
  error: string | null;
  login: (response: LoginResponse) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshJWT: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const TOKEN_KEY = "session_token";
const JWT_TOKEN_KEY = "jwt_token";
const USER_KEY = "user_data";

// Constantes para configuração
const JWT_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutos antes da expiração
const SESSION_VERIFY_TIMEOUT = 10000; // 10 segundos
const isDevelopment = __DEV__;

// Helper para logs condicionais
const debugLog = (...args: unknown[]) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

// Função para decodificar JWT
const parseJWT = (token: string): { exp: number } | null => {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Erro ao decodificar JWT:", error);
    return null;
  }
};

// Função para verificar se JWT está expirado
const isJWTExpired = (token: string): boolean => {
  const decoded = parseJWT(token);
  if (!decoded || !decoded.exp) return true;

  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();

  return currentTime >= expirationTime;
};

// Função para calcular tempo até expiração
const getTimeUntilExpiration = (token: string): number => {
  const decoded = parseJWT(token);
  if (!decoded || !decoded.exp) return 0;

  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();

  return Math.max(0, expirationTime - currentTime);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs para manter valores atualizados e evitar stale closures
  const tokenRef = useRef<string | null>(null);
  const isRefreshingJWT = useRef(false);
  const refreshTimeoutRef = useRef<number | null>(null);

  // Atualiza ref sempre que token mudar
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Função para limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Função para limpar dados de autenticação
  const clearAuthData = useCallback(async () => {
    setToken(null);
    setJwtToken(null);
    setUser(null);
    setError(null);
    tokenRef.current = null;

    // Limpa timeout de refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    try {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(JWT_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
      ]);
      debugLog("Dados de autenticação limpos com sucesso");
    } catch (error) {
      console.error("Erro ao limpar dados do SecureStore:", error);
    }
  }, []);

  // Função para verificar se a sessão ainda é válida
  const verifySession = useCallback(
    async (sessionToken: string): Promise<boolean> => {
      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;

        if (!API_URL) {
          throw new Error("API_URL não configurada");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          SESSION_VERIFY_TIMEOUT
        );

        const response = await fetch(`${API_URL}/api/auth/get-session`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          debugLog("Verify Session Data:", data);

          if (data.user) {
            setUser(data.user);
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
            debugLog("Sessão verificada com sucesso");
            return true;
          }
        }

        if (response.status === 401) {
          debugLog("Sessão expirada ou inválida");
        }

        return false;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.error("Timeout ao verificar sessão");
          setError("Timeout ao verificar sessão");
        } else {
          console.error("Erro ao verificar sessão:", error);
          setError("Erro ao verificar sessão");
        }
        return false;
      }
    },
    []
  );

  // Função para renovar o JWT token - usando ref para evitar stale closure
  const refreshJWT = useCallback(async (): Promise<void> => {
    const currentToken = tokenRef.current;

    if (!currentToken) {
      debugLog("Não é possível renovar JWT: token de sessão ausente");
      return;
    }

    // Previne múltiplas requisições simultâneas
    if (isRefreshingJWT.current) {
      debugLog("Refresh do JWT já em andamento");
      return;
    }

    isRefreshingJWT.current = true;

    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;

      if (!API_URL) {
        throw new Error("API_URL não configurada");
      }

      debugLog("Renovando JWT...");

      const response = await fetch(`${API_URL}/api/auth/token`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.token) {
          setJwtToken(data.token);
          await SecureStore.setItemAsync(JWT_TOKEN_KEY, data.token);
          debugLog("JWT renovado com sucesso");

          // Agenda próximo refresh
          const timeUntilExpiration = getTimeUntilExpiration(data.token);
          if (timeUntilExpiration > 0) {
            const refreshTime = Math.max(
              0,
              timeUntilExpiration - JWT_REFRESH_BUFFER
            );

            debugLog(
              `Próximo JWT refresh agendado para ${Math.round(
                refreshTime / 1000
              )}s`
            );

            // Limpa timeout anterior
            if (refreshTimeoutRef.current) {
              clearTimeout(refreshTimeoutRef.current);
            }

            refreshTimeoutRef.current = setTimeout(() => {
              debugLog("Executando refresh automático do JWT");
              refreshJWT();
            }, refreshTime);
          }
        } else {
          console.warn("Resposta de refresh não contém token");
          setError("Erro ao renovar token de acesso");
        }
      } else if (response.status === 401) {
        console.warn("Sessão expirada, fazendo logout");
        setError("Sessão expirada");
        await clearAuthData();
      } else {
        console.warn(`Erro ao renovar JWT: ${response.status}`);
        setError("Erro ao renovar token de acesso");
      }
    } catch (error) {
      console.error("Erro ao renovar JWT:", error);
      setError("Erro de conexão ao renovar token");
    } finally {
      isRefreshingJWT.current = false;
    }
  }, [clearAuthData]); // Removido token das dependências

  // Função para agendar renovação automática do JWT
  const scheduleJWTRefresh = useCallback(
    (jwtTokenToSchedule: string) => {
      // Limpa timeout anterior
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      const timeUntilExpiration = getTimeUntilExpiration(jwtTokenToSchedule);

      if (timeUntilExpiration <= 0) {
        debugLog("JWT já expirado, renovando imediatamente");
        refreshJWT();
        return;
      }

      // Agenda refresh para 5 minutos antes da expiração
      const refreshTime = Math.max(0, timeUntilExpiration - JWT_REFRESH_BUFFER);

      debugLog(`JWT refresh agendado para ${Math.round(refreshTime / 1000)}s`);

      refreshTimeoutRef.current = setTimeout(() => {
        debugLog("Executando refresh automático do JWT");
        refreshJWT();
      }, refreshTime);
    },
    [refreshJWT]
  );

  // Carregar token e usuário ao inicializar
  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        debugLog("Carregando sessão armazenada...");

        const [storedToken, storedJwtToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(JWT_TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);

        if (!isMounted) return;

        if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser);

          // Atualiza ref e state
          tokenRef.current = storedToken;
          setUser(userData);
          setToken(storedToken);

          // Verifica se a sessão ainda é válida
          const isValid = await verifySession(storedToken);

          if (!isMounted) return;

          if (!isValid) {
            debugLog("Sessão inválida ou expirada, limpando dados...");
            await clearAuthData();
            return;
          }

          // Verifica JWT
          if (storedJwtToken) {
            if (isJWTExpired(storedJwtToken)) {
              debugLog("JWT expirado, buscando novo...");
              // Não seta o JWT expirado
              await refreshJWT();
            } else {
              setJwtToken(storedJwtToken);
              scheduleJWTRefresh(storedJwtToken);
              debugLog("JWT válido carregado");
            }
          } else {
            debugLog("JWT não encontrado, buscando novo...");
            await refreshJWT();
          }
        } else {
          debugLog("Nenhuma sessão armazenada encontrada");
        }
      } catch (error) {
        console.error("Erro ao carregar sessão:", error);
        if (isMounted) {
          setError("Erro ao carregar sessão");
          await clearAuthData();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [verifySession, clearAuthData, refreshJWT, scheduleJWTRefresh]);

  // Login com Better Auth e JWT
  const login = useCallback(
    async (response: LoginResponse): Promise<void> => {
      try {
        const { token: sessionToken, jwtToken: jwt, user: userData } = response;

        if (!sessionToken || !userData) {
          throw new Error("Resposta de login inválida");
        }

        // Valida JWT se fornecido
        if (jwt && isJWTExpired(jwt)) {
          console.warn("JWT fornecido já está expirado");
        }

        // Atualiza ref e state
        tokenRef.current = sessionToken;
        setToken(sessionToken);
        setJwtToken(jwt);
        setUser(userData);
        setError(null);

        // Salva no storage seguro
        await Promise.all([
          SecureStore.setItemAsync(TOKEN_KEY, sessionToken),
          SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData)),
          jwt
            ? SecureStore.setItemAsync(JWT_TOKEN_KEY, jwt)
            : Promise.resolve(),
        ]);

        // Agenda refresh do JWT
        if (jwt && !isJWTExpired(jwt)) {
          scheduleJWTRefresh(jwt);
        }

        debugLog("Login realizado com sucesso");
      } catch (error) {
        console.error("Erro ao fazer login:", error);
        setError("Erro ao fazer login");
        throw error;
      }
    },
    [scheduleJWTRefresh]
  );

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    const API_URL = process.env.EXPO_PUBLIC_API_URL;
    const currentToken = tokenRef.current;

    try {
      if (API_URL && currentToken) {
        const response = await fetch(`${API_URL}/api/auth/sign-out`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
            Origin: "http://localhost:3000",
          },
          body: JSON.stringify({}),
        });

        // Logs úteis para debug
        debugLog("Logout request status:", response.status);
        const responseText = await response.text();
        debugLog("Logout server response:", responseText || "(empty body)");

        if (!response.ok) {
          console.warn(
            `Logout remoto falhou (${response.status}): ${responseText}`
          );
        } else {
          debugLog("Logout remoto realizado com sucesso");
        }
      }

      await clearAuthData();
      debugLog("Logout local realizado com sucesso");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      setError("Erro ao fazer logout. Tente novamente.");
      await clearAuthData();
    }
  }, [clearAuthData]);

  // Atualizar dados do usuário
  const refreshUser = useCallback(async (): Promise<void> => {
    const currentToken = tokenRef.current;

    if (!currentToken) {
      debugLog("Não é possível atualizar usuário: token ausente");
      return;
    }

    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;

      if (!API_URL) {
        throw new Error("API_URL não configurada");
      }

      const response = await fetch(`${API_URL}/api/auth/get-session`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
          debugLog("Usuário atualizado com sucesso");
        }
      } else if (response.status === 401) {
        console.warn("Sessão expirada ao atualizar usuário");
        setError("Sessão expirada");
        await clearAuthData();
      }
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      setError("Erro ao atualizar dados do usuário");
    }
  }, [clearAuthData]);

  return (
    <AuthContext.Provider
      value={{
        token,
        jwtToken,
        user,
        isAuth: !!token && !!user,
        isLoading,
        error,
        login,
        logout,
        refreshUser,
        refreshJWT,
        clearError,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }

  return context;
}
