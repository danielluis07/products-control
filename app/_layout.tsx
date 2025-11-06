// app/_layout.tsx
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/context/auth";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Componente separado para gerenciar a navegação protegida
function ProtectedNavigator() {
  const { isAuth, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isLoading) return; // Aguarda carregar o token

    // const inAuthGroup = segments[0] === "(tabs)";
    const inLoginScreen = segments[0] === "login";

    if (!isAuth) {
      // Se não está autenticado e não está na tela de login, redireciona para login
      if (!inLoginScreen) {
        router.replace("/login");
      }
    } else {
      // Se está autenticado e está na tela de login, redireciona para tabs
      if (inLoginScreen) {
        router.replace("/(tabs)");
      }
    }
  }, [isAuth, segments, isLoading]);

  // Mostra loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colorScheme === "dark" ? "#000" : "#fff" },
        ]}>
        <ActivityIndicator
          size="large"
          color={colorScheme === "dark" ? "#fff" : "#007AFF"}
        />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
            // Previne o gesto de voltar no iOS quando está na tela de login
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            // Previne o gesto de voltar no iOS quando está autenticado
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="inventory"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ProtectedNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
