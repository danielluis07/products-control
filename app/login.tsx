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
import { useAuth } from "../context/auth";

// Configuração da API
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// Validação de email
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function LoginScreen() {
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

    // Validar email
    if (!email.trim()) {
      setEmailError("Email é obrigatório");
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError("Email inválido");
      isValid = false;
    } else {
      setEmailError("");
    }

    // Validar senha
    if (!password.trim()) {
      setPasswordError("Senha é obrigatória");
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError("Senha deve ter pelo menos 6 caracteres");
      isValid = false;
    } else {
      setPasswordError("");
    }

    return isValid;
  };

  const handleLogin = async () => {
    // Esconde o teclado
    Keyboard.dismiss();

    // Valida o formulário
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Tratamento específico de erros
        if (response.status === 401) {
          Alert.alert("Erro", "Email ou senha incorretos");
        } else if (response.status === 404) {
          Alert.alert("Erro", "Usuário não encontrado");
        } else if (response.status === 429) {
          Alert.alert("Erro", "Muitas tentativas. Tente novamente mais tarde.");
        } else {
          Alert.alert(
            "Erro",
            data.error || data.message || "Não foi possível fazer o login"
          );
        }
        return;
      }

      // Verifica se recebeu os dados necessários
      if (!data.token || !data.user) {
        Alert.alert("Erro", "Resposta inválida do servidor");
        return;
      }

      // Agora busca o JWT token usando o session token
      const jwtResponse = await fetch(`${API_BASE_URL}/api/auth/token`, {
        method: "GET",
        headers: {
          "ngrok-skip-browser-warning": "true",
          Authorization: `Bearer ${data.token}`,
        },
      });

      if (!jwtResponse.ok) {
        Alert.alert("Erro", "Não foi possível obter o token JWT");
        return;
      }

      const jwtData = await jwtResponse.json();
      const jwtToken = jwtData.token;

      // Busca a sessão completa com o role usando o JWT
      const sessionResponse = await fetch(
        `${API_BASE_URL}/api/auth/get-session`,
        {
          headers: {
            "ngrok-skip-browser-warning": "true",
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );

      if (sessionResponse.ok) {
        const session = await sessionResponse.json();

        // Mescla os dados da sessão com os dados do login
        const completeData = {
          ...data,
          jwtToken, // Adiciona o JWT token
          user: {
            ...data.user,
            ...session.user, // Isso deve incluir o role
          },
        };

        // Faz login usando o contexto com os dados completos
        await login(completeData);
      } else {
        // Se falhar ao buscar a sessão, faz login com os dados que temos
        console.warn("Não foi possível buscar a sessão, usando dados do login");
        await login({ ...data, jwtToken });
      }

      // O redirecionamento será feito automaticamente pelo layout
      console.log("Login bem-sucedido, aguardando redirecionamento...");
    } catch (error) {
      console.error("Erro no login:", error);

      if (
        error instanceof TypeError &&
        error.message === "Network request failed"
      ) {
        Alert.alert(
          "Erro de Conexão",
          "Não foi possível conectar ao servidor. Verifique sua conexão com a internet."
        );
      } else {
        Alert.alert("Erro", "Ocorreu um erro inesperado. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    validateEmail(email) &&
    password.length >= 6;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
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
              textContentType="emailAddress"
              editable={!loading}
              caretHidden={false} // ← Adicione isso
              selectTextOnFocus={false} // ← Teste também
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
                textContentType="password"
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
            disabled={loading || !isFormValid}
            activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
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
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
  },
  inputError: {
    borderColor: "#ff3b30",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
  },
  eyeButton: {
    padding: 12,
  },
  eyeIcon: {
    fontSize: 20,
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: "#b0b0b0",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  forgotPassword: {
    alignItems: "center",
    marginTop: 20,
  },
  forgotPasswordText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  debugContainer: {
    marginTop: 40,
    padding: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
  },
  debugText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
});
