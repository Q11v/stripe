# Stripe Demo

Stripe 支付接入的示例仓库。不同的接入方式拆分在不同分支上，`master` 只保留本说明，方便对照选择。

## 分支说明

| 分支 | 说明 |
| --- | --- |
| `master` | 仓库入口，只包含本 README 与分支导航 |
| `stripe_checkout_session` | Checkout Session 方式：后端创建 Session，前端跳转到 Stripe 托管的收银台页面 |
| `stripe_payment_element` | Payment Element 方式：后端创建 PaymentIntent，前端用 Stripe.js 内嵌支付组件，用户不离开自己的站点 |

## 两种方式怎么选

### Checkout Session（托管收银台）

- 流程：后端调用 `checkout.sessions.create` → 拿到 `url` → 前端重定向 → 支付完成后回跳 `success_url` / `cancel_url`
- 优点：接入最快，页面、校验、3DS、多语言、多支付方式都由 Stripe 负责，PCI 合规范围最小
- 代价：UI 定制能力有限，用户会跳出站点

适合：快速上线、标准商品/订阅收款。

### Payment Element（内嵌组件）

- 流程：后端调用 `paymentIntents.create` → 返回 `client_secret` → 前端 `elements.create('payment')` 挂载 → `stripe.confirmPayment` 提交
- 优点：支付流程留在自己的页面，样式可定制，能和现有结算流程深度整合
- 代价：前端代码更多，需要自己处理加载状态、错误提示与支付结果确认

适合：对结算体验和品牌一致性有要求的场景。

## 通用注意事项

- **密钥**：`STRIPE_SECRET_KEY` 只能放在后端；前端只使用 `pk_test_` / `pk_live_` 开头的 publishable key。不要提交到仓库，用 `.env` 管理。
- **金额单位**：Stripe 用最小货币单位，例如 `amount: 1000` + `currency: 'usd'` 表示 $10.00。
- **支付结果以 Webhook 为准**：前端回跳只代表跳转完成，真正的订单状态要监听 `checkout.session.completed` / `payment_intent.succeeded`，并校验 webhook 签名。
- **幂等**：创建支付相关对象时带上 `idempotencyKey`，避免重复扣款。
- **测试卡号**：`4242 4242 4242 4242`（成功）、`4000 0025 0000 3155`（触发 3DS 验证），有效期填未来任意日期，CVC 任意。

## 本地查看

```bash
# 查看 Checkout Session 实现
git checkout stripe_checkout_session

# 查看 Payment Element 实现
git checkout stripe_payment_element
```

各分支的运行方式见该分支下的说明。

## 参考

- [Stripe Checkout 文档](https://docs.stripe.com/payments/checkout)
- [Payment Element 文档](https://docs.stripe.com/payments/payment-element)
- [Webhook 签名校验](https://docs.stripe.com/webhooks/signature)
