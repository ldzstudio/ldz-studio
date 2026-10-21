import { ShippingPaymentForm } from "./form";
import { getSettings, mercadoPagoReady } from "@/lib/settings";

export default async function AdminShippingPayment() {
  const s = await getSettings();
  return (
    <>
      <div className="adm-top"><h1>Frete e pagamento</h1></div>
      <ShippingPaymentForm shipping={s.shipping} payments={s.payments} mpReady={mercadoPagoReady()} siteUrl={(process.env.SITE_URL || "").replace(/\/$/, "")} />
    </>
  );
}
