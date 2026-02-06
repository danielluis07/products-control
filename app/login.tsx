// app/login.tsx
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/auth";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets(); // Hook para margens seguras do iPhone
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const passwordInputRef = useRef<TextInput>(null);
  const { login } = useAuth();

  const validateForm = (): boolean => {
    let isValid = true;
    if (!email.trim() || !validateEmail(email)) {
      setEmailError("E-mail inválido");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (password.length < 8) {
      setPasswordError("Senha deve ter pelo menos 8 caracteres");
      isValid = false;
    } else {
      setPasswordError("");
    }
    return isValid;
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Erro", data.message || "Credenciais inválidas");
        return;
      }

      // Lógica de busca de Token e Sessão (mantida igual à sua)
      const jwtResponse = await fetch(`${API_BASE_URL}/api/auth/token`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${data.token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!jwtResponse.ok) throw new Error("Falha no JWT");

      const { token: jwtToken } = await jwtResponse.json();

      const sessionResponse = await fetch(
        `${API_BASE_URL}/api/auth/get-session`,
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );

      const session = await sessionResponse.json();
      await login({
        ...data,
        jwtToken,
        user: { ...data.user, ...session.user },
      });
    } catch (error) {
      Alert.alert("Erro de Conexão", "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.length > 0 && password.length >= 8;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0} // Respiro extra para o iPhone
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Seja bem-vindo</Text>
          <Text style={styles.subtitle}>Entre com suas credenciais</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="seu@email.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress" // Autofill iOS
              editable={!loading}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                ref={passwordInputRef}
                style={[
                  styles.passwordInput,
                  passwordError ? styles.inputError : null,
                ]}
                placeholder="••••••••"
                placeholderTextColor="#999"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setPasswordError("");
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password" // Autofill iOS
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}>
                <Text style={styles.eyeIcon}>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (!isFormValid || loading) && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading || !isFormValid}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" }, // Um cinza mais suave para iOS
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  headerContainer: { alignItems: "center", marginBottom: 40 },
  title: { fontSize: 32, fontWeight: "800", color: "#1a1a1a", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6c757d" },
  formContainer: { width: "100%", maxWidth: 400, alignSelf: "center" },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "700", color: "#495057", marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#212529",
  },
  inputError: { borderColor: "#ff3b30" },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 14,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#212529",
  },
  eyeButton: { padding: 12 },
  eyeIcon: { fontSize: 20 },
  errorText: { color: "#ff3b30", fontSize: 12, marginTop: 4, marginLeft: 4 },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: { backgroundColor: "#adb5bd", shadowOpacity: 0 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
