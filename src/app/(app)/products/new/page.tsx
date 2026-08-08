import { Header } from "@/components/layout/Header";
import { ProductSaleForm } from "./ProductSaleForm";

export default function NewProductSalePage() {
  return (
    <div>
      <Header title="מכירת מוצר 🛍️" />
      <ProductSaleForm />
    </div>
  );
}
