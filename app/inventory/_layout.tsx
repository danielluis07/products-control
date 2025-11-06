import { Stack } from "expo-router";

export default function InventoryLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: "Detalhes do Lote",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
