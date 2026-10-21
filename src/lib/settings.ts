import { cache } from "react";
import { one, q } from "./db";

export type ShippingOption = { id: string; name: string; price_cents: number; days: string; requires_address: boolean };
export type Faq = { q: string; a: string };
export type Page = { slug: string; title: string; content: string };
export type Step = { title: string; text: string };

export type SiteSettings = {
  store_name: string;
  tagline: string;
  seo_description: string;
  announcement: string;
  accent: string;
  hero: { kicker: string; title: string; subtitle: string; cta_label: string; cta_link: string; image: string };
  steps_title: string;
  steps: Step[];
  about_title: string;
  about_text: string;
  custom_cta: { title: string; text: string; button: string };
  faq: Faq[];
  pages: Page[];
  contact: { whatsapp: string; email: string; instagram: string; tiktok: string; city: string };
  footer_text: string;
  shipping: { options: ShippingOption[]; free_above_cents: number; origin_cep: string };
  payments: {
    mercadopago: boolean;
    pix: boolean;
    whatsapp: boolean;
    pix_key: string;
    pix_name: string;
    pix_city: string;
    pix_discount_percent: number;
    instructions: string;
  };
};

export const DEFAULT_SETTINGS: SiteSettings = {
  store_name: "LDZ Studio",
  tagline: "Impressão 3D com atitude",
  seo_description: "LDZ Studio: peças impressas em 3D, decoração, colecionáveis e projetos sob medida.",
  announcement: "Frete grátis acima de R$ 199 · Cupom BEMVINDO10 na primeira compra",
  accent: "#ffffff",
  hero: {
    kicker: "Impressão 3D sob encomenda",
    title: "Ideias que ganham forma, camada por camada.",
    subtitle: "Decoração, colecionáveis e utilidades impressas em 3D com acabamento premium. Feito sob medida para você.",
    cta_label: "Ver produtos",
    cta_link: "/produtos",
    image: "",
  },
  steps_title: "Como funciona",
  steps: [
    { title: "Escolha", text: "Escolha a peça, a cor e o tamanho direto na loja." },
    { title: "Produção", text: "Imprimimos sua peça sob encomenda, com revisão de acabamento." },
    { title: "Entrega", text: "Enviamos para todo o Brasil com código de rastreio." },
  ],
  about_title: "Sobre a LDZ Studio",
  about_text:
    "Somos um estúdio de impressão 3D apaixonado por design e detalhes. Cada peça é produzida e revisada à mão, do arquivo ao acabamento final.",
  custom_cta: {
    title: "Tem uma ideia? A gente imprime.",
    text: "Mande sua referência, desenho ou arquivo STL e receba um orçamento sem compromisso.",
    button: "Pedir orçamento no WhatsApp",
  },
  faq: [
    { q: "Qual o prazo de produção?", a: "Cada produto mostra o prazo de produção na página. Depois disso, o prazo de envio depende da forma de entrega escolhida." },
    { q: "Qual material vocês usam?", a: "Trabalhamos principalmente com PLA e PETG de alta qualidade. Para peças especiais, consulte outras opções." },
    { q: "Fazem peças personalizadas?", a: "Sim! Fale com a gente pelo WhatsApp com sua ideia ou arquivo e faremos um orçamento." },
    { q: "Como acompanho meu pedido?", a: "Depois da compra você recebe um link do pedido, onde aparecem o status e o código de rastreio." },
  ],
  pages: [
    { slug: "trocas-e-devolucoes", title: "Trocas e devoluções", content: "Você pode solicitar a devolução em até 7 dias após o recebimento, conforme o Código de Defesa do Consumidor.\n\nPeças personalizadas não podem ser devolvidas, exceto em caso de defeito de fabricação.\n\nEntre em contato pelo WhatsApp ou e-mail informando o número do pedido." },
    { slug: "privacidade", title: "Política de privacidade", content: "Usamos seus dados apenas para processar e entregar seus pedidos. Não vendemos nem compartilhamos suas informações com terceiros, exceto quando necessário para pagamento e envio." },
  ],
  contact: { whatsapp: "", email: "", instagram: "", tiktok: "", city: "" },
  footer_text: "Feito camada por camada no Brasil.",
  shipping: {
    options: [
      { id: "pac", name: "Correios PAC", price_cents: 2490, days: "5 a 10 dias úteis", requires_address: true },
      { id: "sedex", name: "Correios SEDEX", price_cents: 3990, days: "2 a 5 dias úteis", requires_address: true },
      { id: "retirada", name: "Retirar pessoalmente", price_cents: 0, days: "Combinar pelo WhatsApp", requires_address: false },
    ],
    free_above_cents: 19900,
    origin_cep: "",
  },
  payments: {
    mercadopago: true,
    pix: true,
    whatsapp: false,
    pix_key: "",
    pix_name: "LDZ STUDIO",
    pix_city: "SAO PAULO",
    pix_discount_percent: 5,
    instructions: "Depois de pagar, seu pedido é confirmado e entra em produção.",
  },
};

function merge<T>(base: T, over: any): T {
  if (Array.isArray(base)) return (Array.isArray(over) ? over : base) as T;
  if (base && typeof base === "object") {
    const out: any = { ...base };
    for (const k of Object.keys(over ?? {})) {
      out[k] = k in (base as any) ? merge((base as any)[k], over[k]) : over[k];
    }
    return out;
  }
  return (over === undefined || over === null ? base : over) as T;
}

export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const row = await one<{ value: any }>("select value from settings where key='site'");
    return merge(DEFAULT_SETTINGS, row?.value ?? {});
  } catch (e) {
    console.error("Falha ao ler configurações", e);
    return DEFAULT_SETTINGS;
  }
});

export async function saveSettings(patch: Partial<SiteSettings>) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await q(
    "insert into settings(key, value, updated_at) values ('site',$1,now()) on conflict (key) do update set value=excluded.value, updated_at=now()",
    [JSON.stringify(next)],
  );
}

export function mercadoPagoReady() {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

export function whatsappLink(number: string, text?: string) {
  const digits = number.replace(/\D/g, "");
  if (!digits) return "";
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
