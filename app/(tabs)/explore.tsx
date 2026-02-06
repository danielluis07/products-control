// app/(tabs)/explore.tsx
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
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Importação importante para iPhone
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function CameraScannerScreen() {
  const insets = useSafeAreaInsets(); // Hook para lidar com o Notch e a Barra Inferior
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  const [isManualModalVisible, setIsManualModalVisible] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");

  const { token, user } = useAuth();
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);

  const isScanning = !foundProduct && !isCreateModalVisible;

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  useFocusEffect(
    React.useCallback(() => {
      setScanned(false);
    }, [])
  );

  const startAnimation = () => {
    animation.setValue(0);
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
    if (isScanning) {
      startAnimation();
    } else {
      animation.stopAnimation();
    }
  }, [isScanning]);

  const closeLotModal = () => {
    setFoundProduct(null);
    setIsLoadingProduct(false);
    setScanned(false);
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

    let barcode = scanningResult.data;

    // --- CORREÇÃO PARA IOS: Tratamento de UPC-A / EAN-13 ---
    // O iOS frequentemente adiciona um '0' na frente de códigos de 12 dígitos.
    // Se o código tem 13 dígitos e começa com 0, e seu banco usa o padrão de 12,
    // removemos o zero para manter a consistência entre Android e iOS.
    if (barcode.length === 13 && barcode.startsWith("0")) {
      barcode = barcode.substring(1);
    }

    // Filtro de Ruído atualizado
    if (barcode.length < 8 || barcode.length > 13) return;

    setScanned(true);
    setIsLoadingProduct(true);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/products?barcode=${barcode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setScannedBarcode(barcode);
          setIsCreateModalVisible(true);
        } else {
          Alert.alert("Erro", data.message || "Erro ao buscar produto.");
          setScanned(false);
          setIsLoadingProduct(false);
        }
      } else {
        if (user?.role === "admin") {
          Alert.alert("Sucesso", `Produto "${data.data.name}" já cadastrado.`);
          closeLotModal();
        } else {
          setFoundProduct(data.data);
        }
      }
    } catch (error) {
      Alert.alert("Erro de Conexão", "Não foi possível conectar à API.");
      setScanned(false);
      setIsLoadingProduct(false);
    }
  };

  const handleProductCreated = (newProduct: Product) => {
    setIsCreateModalVisible(false);
    if (user?.role === "admin") {
      Alert.alert("Sucesso", `Produto "${newProduct.name}" cadastrado.`);
      setScanned(false);
    } else {
      setTimeout(() => {
        setFoundProduct(newProduct);
      }, 500);
    }
  };

  if (!permission)
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ marginBottom: 20, textAlign: "center" }}>
          Precisamos da permissão da câmera.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>
            Conceder Permissão
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, MARKER_HEIGHT],
  });

  return (
    <View style={styles.container}>
      {isScanning && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            // Adicionado upc_a que é essencial para iPhone ler códigos de 12 dígitos
            barcodeTypes: ["ean13", "ean8", "upc_a"],
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

      {isScanning && (
        <View style={styles.overlayContainer}>
          <View style={styles.markerContainer}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <Animated.View
              style={[styles.scanLine, { transform: [{ translateY }] }]}
            />
          </View>

          <View
            style={[
              styles.bottomContainer,
              { paddingBottom: insets.bottom + 20 }, // Ajuste dinâmico para iPhone
            ]}>
            <Text style={styles.overlayText}>
              Aponte para o código de barras
            </Text>
            <TouchableOpacity
              style={styles.manualButton}
              onPress={() => setIsManualModalVisible(true)}>
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
        onCreateSuccess={handleProductCreated}
      />
      <ManualBarcodeModal
        isManualModalVisible={isManualModalVisible}
        manualBarcode={manualBarcode}
        setManualBarcode={setManualBarcode}
        handleConfirmManualEntry={() => {
          handleBarCodeScanned({
            data: manualBarcode,
            type: "manual",
          } as BarcodeScanningResult);
          setIsManualModalVisible(false);
          setManualBarcode("");
        }}
        closeManualModal={() => setIsManualModalVisible(false)}
        isLoadingProduct={isLoadingProduct}
      />
    </View>
  );
}

const MARKER_WIDTH = width * 0.8;
const MARKER_HEIGHT = 120;
const CORNER_SIZE = 30;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: { color: "#fff", fontSize: 16, marginTop: 10 },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    alignItems: "center",
  },
  markerContainer: {
    marginTop: "45%",
    width: MARKER_WIDTH,
    height: MARKER_HEIGHT,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#fff",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 15,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 15,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 15,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 15,
  },
  scanLine: {
    position: "absolute",
    width: "100%",
    height: 3,
    backgroundColor: "#fff",
    opacity: 0.8,
  },
  bottomContainer: {
    backgroundColor: "rgba(0,0,0,0.6)",
    width: "100%",
    paddingVertical: 20,
    alignItems: "center",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  overlayText: { color: "white", fontSize: 15, marginBottom: 15, opacity: 0.9 },
  manualButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  manualButtonText: { color: "white", fontWeight: "600", fontSize: 14 },
  permissionButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
  },
});
