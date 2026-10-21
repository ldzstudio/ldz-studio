# LDZ Studio · Loja virtual

Loja completa para produtos de impressão 3D, com painel administrativo.

**Loja:** página inicial, catálogo com filtros e busca, página de produto com variações (cor, tamanho…), carrinho, checkout com busca de CEP, cupom de desconto, frete e página de acompanhamento do pedido.

**Pagamentos:**
- **Mercado Pago** (Pix, cartão em até 12x e boleto): o pedido vira “Pago” sozinho quando o pagamento é aprovado.
- **Pix direto** (sem taxa): o cliente recebe QR Code e copia e cola com o valor exato; você confere e marca como pago.
- **Combinar pelo WhatsApp** (opcional).

**Painel (`/admin`):**
- Visão geral com faturamento, pedidos, ticket médio, visitantes, conversão, funil de vendas, gráfico diário, mais vendidos, origem das visitas e estoque baixo.
- Produtos: fotos (envio direto), preços, preço “de”, custo, estoque, variações com acréscimo de preço, destaque, ocultar, duplicar.
- Pedidos: status (pago, em produção, enviado, entregue, cancelado), código de rastreio, anotações e botão para avisar o cliente no WhatsApp.
- Categorias, cupons (% / valor fixo / frete grátis, mínimo, limite de usos, validade).
- Conteúdo do site: textos, banner, cor de destaque, “como funciona”, sobre, FAQ, contatos, redes e páginas (trocas, privacidade…).
- Frete e pagamento, e acessos ao painel (trocar senha, adicionar pessoas).

## Tecnologia

Next.js 15 + PostgreSQL. As fotos ficam no próprio banco, então só é preciso **um banco Postgres** e **uma hospedagem Node** (ex.: Vercel). Este projeto é independente: use banco, contas e chaves exclusivos da LDZ Studio.

## Publicar (Vercel + Neon, plano grátis)

1. Crie um banco em [neon.tech](https://neon.tech) (ou Supabase/Railway) **só para a LDZ Studio** e copie a connection string.
2. Suba esta pasta para um repositório novo no GitHub (ex.: `ldz-studio`).
3. Em [vercel.com](https://vercel.com) → *Add New Project* → importe o repositório.
4. Em *Environment Variables*, preencha as variáveis do arquivo `.env.example`:
   - `DATABASE_URL`, `SITE_URL` (ex.: `https://ldzstudio.com.br`), `AUTH_SECRET` (texto aleatório longo),
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   - `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET` (quando tiver o Mercado Pago).
5. No seu computador, uma vez só, crie as tabelas e o admin:
   ```bash
   npm install
   cp .env.example .env   # e coloque a mesma DATABASE_URL e o admin
   npm run db:setup
   ```
   (Para não criar os produtos de exemplo: `SEED=0 npm run db:setup`.)
6. Faça o deploy, acesse `/admin`, entre e personalize tudo.

### Mercado Pago
1. Em mercadopago.com.br/developers → *Suas integrações* → crie uma aplicação (Checkout Pro).
2. Copie o **Access Token de produção** para `MP_ACCESS_TOKEN`.
3. Em *Webhooks*, cadastre `https://SEU-DOMINIO/api/webhooks/mercadopago` com o evento **Pagamentos** e copie a assinatura secreta para `MP_WEBHOOK_SECRET`.

### Domínio próprio
Na Vercel: *Settings → Domains* → adicione `ldzstudio.com.br` e siga as instruções de DNS. Depois atualize `SITE_URL`.

## Rodar no computador

```bash
npm install
cp .env.example .env   # preencha
npm run db:setup
npm run dev            # http://localhost:3000  ·  painel em /admin
```
