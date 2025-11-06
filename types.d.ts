type Product = {
  id: string;
  name: string;
  barcode: string;
  categoryId: string | null;
  notificationThresholdDays: number;
};

type Category = {
  id: string;
  name: string;
};
