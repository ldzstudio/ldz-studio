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

Next.js 15 + PostgreSQL. As fotos ficam no próprio banco, então só é preciso **um banco Postgres** e **uma hospedagem Node** (ex.: Netlify; o plano grátis da Vercel não permite uso comercial). Este projeto é independente: use banco, contas e chaves exclusivos da LDZ Studio.

## Publicar (Netlify + Neon, plano grátis)

1. Crie um banco em [neon.tech](https://neon.tech) **só para a LDZ Studio** (região São Paulo) e copie a connection string.
2. Em [netlify.com](https://app.netlify.com) → *Add new project → Import an existing project → GitHub* → escolha `ldz-studio`.
3. Em *Environment Variables*, preencha (veja `.env.example`):
   - `DATABASE_URL`: a connection string do Neon
   - `SITE_URL`: o endereço do site (ex.: `https://ldz-studio.netlify.app`, sem barra no final)
   - `AUTH_SECRET`: um texto aleatório longo
   - `ADMIN_EMAIL` e `ADMIN_PASSWORD`: seu login do painel
   - `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET`: quando tiver o Mercado Pago
4. Clique em *Deploy*. No primeiro acesso a loja cria sozinha as tabelas, o seu login e os produtos de exemplo (para não criar os exemplos, defina `SEED=0`).
5. Acesse `/admin`, entre e personalize tudo. Depois de entrar, você pode trocar a senha em *Conta e acessos*.

### Mercado Pago
1. Em mercadopago.com.br/developers → *Suas integrações* → crie uma aplicação (Checkout Pro).
2. Copie o **Access Token de produção** para `MP_ACCESS_TOKEN`.
3. Em *Webhooks*, cadastre `https://SEU-DOMINIO/api/webhooks/mercadopago` com o evento **Pagamentos** e copie a assinatura secreta para `MP_WEBHOOK_SECRET`.

### Domínio próprio
Na Netlify: *Domain management → Add a domain* → adicione `ldzstudio.com.br` e siga as instruções de DNS. Depois atualize `SITE_URL`.

## Rodar no computador

```bash
npm install
cp .env.example .env   # preencha
npm run dev            # http://localhost:3000  ·  painel em /admin
```
