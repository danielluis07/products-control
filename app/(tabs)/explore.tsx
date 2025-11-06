import CreateProductModal from "@/components/modals/create-product";
import LotModal from "@/components/modals/lot";
import ManualBarcodeModal from "@/components/modals/manual-barcode";
import { useAuth } from "@/context/auth";
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useFocusEffect } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Button,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function CameraScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  const [isManualModalVisible, setIsManualModalVisible] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");

  const { token, user } = useAuth(); // Pega o token para a API
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission, requestPermission]);

  useFocusEffect(() => {
    setScanned(false);
  });

  useEffect(() => {
    // Animação da linha branca
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const startAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    startAnimation();
  }, []);

  const closeLotModal = () => {
    setFoundProduct(null);
    setIsLoadingProduct(false);
    setScanned(false);
    animation.setValue(0);
    startAnimation();
  };

  const closeCreateModal = () => {
    setIsCreateModalVisible(false);
    setIsLoadingProduct(false);
    setScanned(false);
  };

  const handleBarCodeScanned = async (
    scanningResult: BarcodeScanningResult
  ) => {
    if (scanned || isLoadingProduct) return;
    setScanned(true);
    setIsLoadingProduct(true);
    const barcode = scanningResult.data;

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/products?barcode=${barcode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404 && user?.role === "admin") {
          setScannedBarcode(barcode);
          setIsCreateModalVisible(true); // Correto: Admin cadastra
          setIsLoadingProduct(false);
        } else if (response.status === 404) {
          Alert.alert(
            "Erro",
            `Produto com código "${barcode}" não encontrado no catálogo.`
          );
          closeLotModal(); // Correto: Gerente recebe erro
        } else {
          Alert.alert("Erro", data.message || "Erro ao buscar produto.");
          closeLotModal();
        }
      } else {
        if (user?.role === "admin") {
          // É ADMIN e o produto FOI encontrado (200 OK)
          // Apenas mostre o aviso e resete o scanner.
          Alert.alert(
            "Produto Já Cadastrado",
            `O produto "${data.data.name}" já existe no catálogo.`
          );
          closeLotModal(); // Reseta o scanner
        } else {
          // É GERENTE e o produto FOI encontrado (200 OK)
          // Fluxo normal do Gerente: abre o modal de adicionar lote [cite: 21, 30]
          setFoundProduct(data.data);
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Erro de Conexão", "Não foi possível conectar à API.");
      setIsLoadingProduct(false);
      setScanned(false);
    }
  };

  const handleManualEntryPress = () => {
    setIsManualModalVisible(true);
  };

  const handleConfirmManualEntry = () => {
    if (manualBarcode) {
      // Simula o resultado do scanner e chama a mesma função
      handleBarCodeScanned({
        data: manualBarcode,
        type: "manual",
      } as BarcodeScanningResult);
    }
    // Fecha o modal e limpa o estado
    setIsManualModalVisible(false);
    setManualBarcode("");
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ margin: 10, textAlign: "center" }}>
          Precisamos da sua permissão para usar a câmera.
        </Text>
        <Button onPress={requestPermission} title="Conceder Permissão" />
      </View>
    );
  }

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  return (
    <View style={styles.container}>
      {!foundProduct && !isCreateModalVisible && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "qr", "code128"],
          }}
          facing="back"
        />
      )}

      {isLoadingProduct && !foundProduct && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Buscando produto...</Text>
        </View>
      )}

      {!foundProduct && !isCreateModalVisible && (
        <View style={styles.overlayContainer}>
          <View style={styles.markerContainer}>
            {/* Cantos do marcador */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Linha animada branca */}
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [{ translateY }],
                },
              ]}
            />
          </View>

          <View style={styles.bottomContainer}>
            <Text style={styles.overlayText}>
              Aponte a câmera para o código de barras
            </Text>
            <TouchableOpacity
              style={styles.manualButton}
              onPress={handleManualEntryPress}>
              <Text style={styles.manualButtonText}>Digitar Manualmente</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <LotModal
        visible={!!foundProduct}
        foundProduct={foundProduct}
        onClose={closeLotModal}
      />

      <CreateProductModal
        visible={isCreateModalVisible}
        scannedBarcode={scannedBarcode}
        onClose={closeCreateModal}
      />

      <ManualBarcodeModal
        isManualModalVisible={isManualModalVisible}
        manualBarcode={manualBarcode}
        setManualBarcode={setManualBarcode}
        handleConfirmManualEntry={handleConfirmManualEntry}
        closeManualModal={() => setIsManualModalVisible(false)}
        isLoadingProduct={isLoadingProduct}
      />
    </View>
  );
}

const MARKER_WIDTH = width * 0.8;
const MARKER_HEIGHT = 100;
const CORNER_SIZE = 40;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 10,
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    alignItems: "center",
  },
  markerContainer: {
    marginTop: "40%",
    width: MARKER_WIDTH,
    height: MARKER_HEIGHT,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.15)",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "rgba(255,255,255,0.9)",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 2,
    backgroundColor: "white",
    opacity: 0.9,
  },
  bottomContainer: {
    backgroundColor: "rgba(0,0,0,0.5)",
    width: "100%",
    paddingVertical: 20,
    alignItems: "center",
    // rounded corners at the top
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  overlayText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
  },
  manualButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  manualButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});
