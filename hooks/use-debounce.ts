import { useEffect, useState } from "react";

// Este hook pega um valor (value) e só o atualiza
// após um tempo (delay) que o usuário parou de digitar
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpa o timeout anterior se o valor mudar
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
