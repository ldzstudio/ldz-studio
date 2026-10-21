import type { Metadata } from "next";
import { CheckoutForm } from "./form";
import { getCustomer } from "@/lib/customer";
import { getSettings, mercadoPagoReady } from "@/lib/settings";

export const metadata: Metadata = { title: "Finalizar compra" };

export default async function Checkout() {
  const [s, me] = await Promise.all([getSettings(), getCustomer()]);
  const methods = [
    s.payments.mercadopago && mercadoPagoReady() ? { id: "mercadopago", label: "Pix, cartão ou boleto", hint: "Pagamento seguro pelo Mercado Pago, em até 12x no cartão." } : null,
    s.payments.pix && s.payments.pix_key ? { id: "pix", label: `Pix direto${s.payments.pix_discount_percent ? ` (${s.payments.pix_discount_percent}% de desconto)` : ""}`, hint: "Você recebe o QR Code e o Pix copia e cola na próxima tela." } : null,
    s.payments.whatsapp ? { id: "whatsapp", label: "Combinar pelo WhatsApp", hint: "Finalizamos o pagamento com você pelo WhatsApp." } : null,
  ].filter(Boolean) as { id: string; label: string; hint: string }[];
  return (
    <div className="container">
      <div className="page-head"><h1>Finalizar compra</h1></div>
      <CheckoutForm shipping={s.shipping.options} methods={methods} customer={me ? { name: me.name, email: me.email, phone: me.phone, cpf: me.cpf, address: me.address } : null} />
    </div>
  );
}
