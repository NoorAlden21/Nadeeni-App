# Nadeeni frontend reference

Source of truth for a **new** Next.js repository that will hold the cashier dashboard, the customer tracking pages, the service worker, and later the platform admin.

Extracted on 31 Oct 2026 from this landing repo:

- `app/page.jsx`
- `app/globals.css`
- `app/layout.js`
- `package.json`, `postcss.config.mjs`, `jsconfig.json`, `next.config.mjs`
- `public/logo.png`
- `app/digital_pager_mvp_documentation.md` (revised 29 Oct 2026)

The MVP document remains the source of truth for product rules, the API, and authorization. This file records the visual system already built here and the client rules the new app must follow. Do not invent a parallel order model.

## 1. What each repo owns

| Place | Owns |
| --- | --- |
| This repo | The marketing landing page only. It does not call the order API. |
| New Next.js repo | Cashier UI, `/r/{slug}`, `/o/{token}`, service worker, platform admin. |
| Laravel repo | Business rules, tenant isolation, orders, tokens, and push delivery. |

Next.js renders UI and calls the API. It does not decide whether an order number matches, whether a status change is legal, or whether a push was sent.

Customer copy is Arabic. The API returns English error codes. This app chooses the Arabic sentence.

## 2. Product in one page

Working name: **ناديني** (Nadeeni). Digital pager for restaurants. Initial market: Syria. Pilot language: Arabic, right-to-left, for the customer, the cashier, and the platform admin.

A cashier types the order number the restaurant already uses. The customer opens a link by scanning a QR or by typing that number, and waits on a status page. When the food is ready, the cashier presses **تنبيه**. The open page updates by polling. Supported phones may also get a Web Push. Customers need no app and no account.

Two entry points, one order, one status page, one notify action:

1. **Shared QR.** One permanent code per restaurant: `{FRONTEND_URL}/r/{slug}`. The customer types the number and is attached to the order the cashier already created.
2. **Per-order QR.** Creating an order also creates one private link: `{FRONTEND_URL}/o/{token}`. **Show QR** draws that same link again. It does not create an order and it does not rotate the token.

`preferred_qr_mode` is `shared` or `per_order`. It only changes which control the dashboard emphasizes. Both entry points work either way.

The cashier creates the order first. If the customer arrives earlier, registration fails with the same generic error as a wrong or expired number.

### Statuses

`waiting` → `ready` → `collected`, plus `cancelled` and `expired`.

| From | To | Who |
| --- | --- | --- |
| `waiting` | `ready` | **Notify** only |
| `waiting` | `collected` | Customer already took the food; no notification |
| `waiting` or `ready` | `cancelled` | Cashier |
| `ready` | `collected` | Cashier |
| `waiting` or `ready` | `expired` | Scheduler only |

`collected`, `cancelled`, and `expired` are final.

**Notify** is idempotent. The first call from `waiting` sets `ready` and then sends push. A second call returns HTTP 200 with `already_notified: true` and does not push. The status change is kept even when every push fails. **Resend** is allowed only from `ready`, does not change status, and is rate limited.

`order_number` is a string, max 32, trimmed, case-sensitive, leading zeros preserved. It is not an integer. A restaurant has at most one live (`waiting` or `ready`) order per number. The same number may return after `collected`, `cancelled`, or `expired`, and may exist at the same time in another restaurant. A duplicate create is a validation error: the cashier opens the existing order and uses **Show QR**.

Default retention is 240 minutes (`order_ttl_minutes`). Display timestamps in the restaurant timezone. Default timezone is `Asia/Damascus`. Store and compare instants in UTC.

### Out of scope

Do not build native apps, customer accounts, public signup, password reset, billing, menus, kitchen screens, POS, payments, loyalty, reservations, SMS, WhatsApp, email, voice, WebSockets, Redis, Firebase, or a "revoke this QR" action.

The landing comparison table says a rating can be requested from the page after pickup. That is marketing copy. Ratings are not in the MVP. Do not build them.

The landing footer links to WhatsApp. That is a sales contact on the marketing site. The product does not notify customers on WhatsApp.

## 3. Stack

Match this landing repo unless the MVP doc is revised.

| Piece | Value here |
| --- | --- |
| Language | JavaScript, `.js` / `.jsx`. Not TypeScript. |
| Framework | Next.js 16.4.3, App Router |
| UI | React 19.3.0, React DOM 19.3.0 |
| CSS | Tailwind CSS 4.3.3 |
| Tailwind entry | `@import "tailwindcss"` in `app/globals.css` |
| PostCSS | `postcss.config.mjs` with only `@tailwindcss/postcss` |
| `tailwind.config.js` | None. Tokens live in `@theme inline`. |
| Fonts | `next/font/google` |
| Motion on the landing page | `framer-motion` ^14.8.0 |
| Lint | ESLint 9, `eslint-config-next` 16.4.3 |
| Alias | `@/*` → `./*` in `jsconfig.json` |

`shadcn/ui` is optional. Polling only. No socket client.

This Next.js release differs from older training data. Before writing app code, read the guides under `node_modules/next/dist/docs/` for the installed version.

### Auth

Cashier and admin sessions use Sanctum personal access tokens:

```http
Authorization: Bearer <token>
```

Cookie SPA auth is out of scope. The server resolves the cashier's restaurant from `users.restaurant_id`. Never send a `restaurant_id` that the client expects the server to trust.

Public customer routes send no bearer token. They authorize with the unguessable token in the URL, not with a numeric id or the order number.

### Environment

Next.js:

- API base URL
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, equal to Laravel's public key

Laravel (not stored in Next.js): `FRONTEND_URL` with no trailing path, `FRONTEND_ORIGIN` as the single CORS origin, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, database credentials, `APP_KEY`.

Never commit real secrets. Never put the VAPID private key, subscription keys, or raw tokens in the client bundle or in logs. The cashier list may return the single cashier QR token on create and on `GET /api/orders/{order}` only.

Production must be HTTPS. Service workers and push require a secure context.

### Dev server note from this repo

`next.config.mjs` allows LAN dev origins so hot reload works when the page is opened at a non-localhost host:

```js
allowedDevOrigins: ["10.2.0.2", "192.168.137.1"]
```

Without the matching origin, the HTML can load while `/_next` client scripts are blocked. Motion that starts at `opacity: 0` then stays invisible. Add each LAN host you actually use, and restart `next dev` after changing the config.

`cacheComponents: true` is on in this repo. It can show a client tree, run a passive `useEffect`, clean it up, and not run it again. Do not drive a required screen change with a one-shot timer. See section 11.

## 4. Design system

Copy these tokens into the new app's `app/globals.css`. They were sampled from `public/logo.png`.

```css
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-plex), "IBM Plex Sans Arabic", sans-serif;
  --font-display: var(--font-messiri), "El Messiri", serif;
  --color-ivory: #fdfaf1;
  --color-paper: #fffdf8;
  --color-ink: #2a1016;
  --color-burgundy: #7e062a;
  --color-burgundy-deep: #4a0418;
  --color-gold: #cda649;
  --color-gold-deep: #8c6e2c;
  --color-foam: #f8e8ed;
}
```

Also used as raw values, not tokens:

| Use | Value |
| --- | --- |
| Warm section band | `#f7f1e4` |
| Intro / ring track | `#f3e6c8` |
| Gold hover on a gold button | `#d7b45a` |
| Scan line | `#ffe7a3`, glow `rgba(255, 196, 60, 0.95)` and `rgba(205, 166, 73, 0.55)` |
| Text selection | background `#7e062a`, color `#fdfaf1` |
| Page wash | `color-scheme: light` |

Tailwind names that follow from `@theme`: `bg-ivory`, `bg-paper`, `text-ink`, `bg-burgundy`, `text-burgundy-deep`, `bg-gold`, `text-gold-deep`, `bg-foam`, `font-sans`, `font-display`.

### Document and type

```jsx
<html lang="ar" dir="rtl" className={`${messiri.variable} ${plex.variable}`}>
  <body className="bg-ivory font-sans text-ink antialiased">{children}</body>
</html>
```

| Role | Font | Weights | CSS variable |
| --- | --- | --- | --- |
| Display, headings, the word «جاهز» | El Messiri | 500, 600, 700 | `--font-messiri` |
| Body, UI, order numbers | IBM Plex Sans Arabic | 400, 500, 600, 700 | `--font-plex` |

Load both with `subsets: ["arabic", "latin"]`.

Render order numbers in `font-sans`. El Messiri draws Eastern digits in a way that is easy to misread. The API value is the cashier's string. Show that string. Do not parse it, do not strip leading zeros, and do not convert `47` into `٤٧` unless a later product decision says so. The landing mock uses `٤٧` only as a picture.

Phone fields inside RTL use `dir="ltr"` and `text-end`.

### Shape, elevation, focus

| Pattern | Classes used on the landing page |
| --- | --- |
| Buttons and inputs | `rounded-2xl` (about 16px). Not pills, except small status chips. |
| Cards | `rounded-[1.6rem]`, white or `bg-white/80`, `ring-1 ring-burgundy/10` |
| Primary button | `bg-burgundy text-ivory`, hover `bg-burgundy-deep` and `-translate-y-0.5` |
| Gold button | `bg-gold text-burgundy-deep`, hover `#d7b45a` |
| Input | `border border-burgundy/15 bg-white`, focus `border-gold ring-2 ring-gold` |
| Card shadow | `shadow-[0_20px_50px_-28px_rgba(74,4,24,0.28)]` |
| Phone shadow | `shadow-[0_30px_60px_-28px_rgba(74,4,24,0.55)]` |
| Hover lift | `transition duration-300 hover:-translate-y-0.5` |
| Section anchor offset | `scroll-margin-top: 5.5rem` on `section[id]` |

Burgundy is the action color. Gold is the highlight: rules, rings, badges, the ready check. Ivory is the page. Deep burgundy is large type and the phone bezel.

### Logo

Copy `public/logo.png`. The file is 1170×2080 with a large cream margin. Do not show it raw.

Header / toast crop (`BrandMark`): a square `overflow-hidden` span, image absolutely placed at `width: 297%`, `left: -108%`, `top: -219%`.

Icon-only crop (`BrandIcon`): `rounded-2xl bg-ivory`, image at `width: 403%`, `left: -156%`, `top: -268%`.

Larger mark (`FormMark`): parent `h-28 w-28 overflow-hidden rounded-[1.5rem]`, image `h-[300%] w-auto max-w-none object-contain object-center` centered with `-translate-x-1/2 -translate-y-[46%]`.

Alt text on a meaningful logo is `Nadeeni Logo`. Decorative repeats use `alt=""`.

The wordmark in the asset is ناديني. Use a normal `<img>`. `next/image` is not required for this file; the landing page disables the `no-img-element` lint on these crops.

### Phone chrome

Used for marketing mocks. Reuse the proportions if the cashier preview or a customer empty state shows a phone. The real customer page is the phone: do not wrap `/o/{token}` in a fake device.

- Bezel: `bg-burgundy-deep`, padding 9–10px, radius about `2.2rem`–`2.35rem`.
- Screen: slightly smaller radius, `overflow-hidden`, height roughly 1.7× the width.
- Notch: `absolute top-2.5 left-1/2 -translate-x-1/2`. Use physical `left`, not logical `start`. `start-1/2` plus `translate-x` puts the notch off center in RTL.
- Waiting screen: ivory. Ready screen: `bg-burgundy` with ivory type and a gold check.

### Customer screen language already drawn

These strings are the visual contract for the status page. Use them.

| State | Screen | Words |
| --- | --- | --- |
| `waiting` | Ivory | Restaurant name. Order number, large, `font-sans`. Chip **يُحضَّر**. Optional line **الصفحة تتجدد**. |
| `ready` | Burgundy | Gold check. **جاهز**. Gold rule. **للاستلام من الصندوق**. Chip **رقم {order_number}**. |
| Ready notice | White card on top of the phone mock | Logo, **جاهز**, **للاستلام من الصندوق**, gold badge with the number. |

Terminal states are not designed on the landing page. Give each a short final Arabic sentence and stop the celebration motion. Suggested lock, not yet in this repo:

| Status | Sentence |
| --- | --- |
| `collected` | تم استلام الطلب. |
| `cancelled` | أُلغي هذا الطلب. |
| `expired` | انتهت صلاحية هذا الرابط. |

Do not show a countdown that promises the food will be ready in N seconds. The landing ring labeled **ثوانٍ / الصفحة تتجدد** means the page polls. It is not a kitchen timer.

### Motion

Landing scroll reveal, if you reuse it on admin or marketing-like blocks:

```js
const rise = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.4 },
  transition: { duration: 0.55, ease: "easeOut" },
};
```

Cashier and customer screens should not depend on scroll reveal. Their first paint must be visible without waiting for `whileInView`.

Respect `prefers-reduced-motion: reduce`: no float, buzz, ripple, scan line, or intro. The landing CSS hides `.intro-film` immediately in that case.

Ready-state motion that is safe to reuse on the customer page when motion is allowed:

- Gold ripples, 1.6s, scale 1 → 1.9, three rings at 0 / 0.22s / 0.44s.
- A short horizontal buzz, 0.12s × 6, about 4px.
- Check mark scales in once.

Do not loop a buzz forever. Do not play a sound unless the customer gesture allows it. The landing demo's ready chime is a simulation inside the marketing page.

## 5. Routes in the new app

| Route | Who | Screen |
| --- | --- | --- |
| `/r/{slug}` | Public | Restaurant name, one order-number field, **تابع طلبي**. |
| `/o/{token}` | Public | Name, number, state. Notification prompt. Nothing else. |
| Cashier dashboard | Bearer, cashier | Tablet. Not named in the MVP doc; choose one path and keep it. |
| Platform admin | Bearer, `is_platform_admin` | Restaurants and cashiers. Cashiers never see it. |

`/r/{slug}` then navigates to `/o/{token}` after a successful register. Both flows share `/o/{token}`.

QR images are drawn in Next.js. Laravel returns the URL, not a QR file.

- Shared: `GET /api/restaurant/shared-qr` → `{FRONTEND_URL}/r/{slug}`
- Per order: create and `GET /api/orders/{order}` include the cashier token and `{FRONTEND_URL}/o/{token}`

## 6. API the client calls

Success bodies are Laravel API resources. Errors are `{ message, errors }`. Branch on these `message` codes:

| Code | HTTP | Meaning for the UI |
| --- | --- | --- |
| `order_unavailable` | error | Wrong number, not created yet, collected, cancelled, or expired. One sentence for all of them. |
| `order_link_limit` | error | This order already has 5 non-revoked links. |
| `already_notified` | **200**, not an error | Flag `already_notified: true` on the order payload. No second push. |

Field validation stays on the field. Duplicate active number: tell the cashier this number is already active and point them at **Show QR**.

### Cashier and admin, bearer required

- `POST /api/auth/login` — email, password. Inactive user or inactive restaurant is rejected.
- `POST /api/auth/logout` — revoke the current token.
- `GET /api/me` — user, `is_platform_admin`, and for a cashier the restaurant `name`, `slug`, `preferred_qr_mode`, `timezone`.

Admin:

- `GET /api/admin/restaurants`
- `POST /api/admin/restaurants`
- `PATCH /api/admin/restaurants/{restaurant}`
- `POST /api/admin/restaurants/{restaurant}/cashiers`

Cashier, always scoped by the token's restaurant:

- `GET /api/orders?status=waiting` — default list is `waiting` and `ready`, newest first. Terminal statuses only when requested.
- `POST /api/orders` — `{ order_number }`. Response includes the cashier token and the status URL.
- `GET /api/orders/{order}` — same QR payload. This is **Show QR**.
- `POST /api/orders/{order}/notify`
- `POST /api/orders/{order}/resend`
- `POST /api/orders/{order}/collect`
- `POST /api/orders/{order}/cancel`

### Public, no bearer

Responses contain no cashier data, no other orders, no subscription secrets, and no numeric ids.

- `GET /api/public/restaurants/{slug}` — `name` only, and only when active. Otherwise 404.
- `POST /api/public/restaurants/{slug}/register` — `{ order_number }`. On a match, a `shared_registration` token is returned once with the status payload. Then open `/o/{token}`.
- `GET /api/public/orders/{token}` — restaurant name, order number, status. This is the poll. It updates `last_seen_at`.
- `POST /api/public/orders/{token}/push-subscriptions` — `endpoint`, `keys.p256dh`, `keys.auth`, optional `content_encoding` and `expirationTime`.
- `DELETE /api/public/orders/{token}/push-subscriptions` — remove the subscription for this browser's endpoint.

### Polling

Every **4 seconds**.

- Customer: poll until `collected`, `cancelled`, or `expired`. Keep polling through `ready`.
- Cashier list: same interval. The tablet that just called Notify, Resend, Collect, or Cancel updates from that response immediately. Do not wait for the next poll.

A 4-second poll is 15 requests per minute. The status endpoint is limited per token and must allow more than that. Do not add a tight per-IP cap on status polls; a food court shares one public IP.

### Arabic sentences to lock

The landing page does not contain these yet. Lock them in the new app so every screen says the same thing.

| Situation | Arabic |
| --- | --- |
| `order_unavailable` | هذا الرقم غير متاح الآن. تأكدوا من الرقم، أو اطلبوا من الكاشير إدخاله، ثم أعيدوا المحاولة. |
| `order_link_limit` | اكتفى هذا الطلب بعدد الأجهزة المرتبطة به. |
| Active duplicate number | هذا الرقم مستخدم الآن. افتحوا الطلب واعرضوا رمزه من جديد. |
| Notify succeeded | أُرسل طلب التنبيه. |
| `already_notified` | التنبيه أُرسل من قبل. لم يُرسل إشعار آخر. |
| Resend succeeded | أُعيد إرسال طلب التنبيه. |
| Push unsupported or blocked | التنبيه من المتصفح غير متاح هنا. اتركوا الصفحة مفتوحة، فهي تتجدد وحدها. |
| iOS Safari tab | على آيفون، الإشعار يعمل بعد إضافة الموقع إلى الشاشة الرئيسية (iOS 16.4 أو أحدث) ثم السماح بالإشعارات. الصفحة المفتوحة تبقى المرجع. |

Never write "وصل الإشعار إلى الزبون" or "التنبيه وصل". Sending means the push service accepted the message.

Honest line already on the landing page, keep its meaning:

> الصفحة المفتوحة تتجدد وحدها خلال ثوانٍ، بلا زر تحديث. الإشعار يصل حيث يدعم المتصفح ذلك، وعلى آيفون بعد إضافة الموقع إلى الشاشة الرئيسية. الصفحة هي المرجع، ولا نعد بأن الإشعار وصل إلى يد الزبون.

## 7. Screens

### Cashier dashboard

Built for a busy cashier on a tablet. Large targets. Arabic, RTL.

- Restaurant name from `/api/me`.
- One create field and one primary button.
- `per_order`: show the new order's QR immediately.
- `shared`: emphasize viewing, printing, or downloading the permanent restaurant QR. **Show QR** stays on each row.
- Active list: number, created time in the restaurant timezone, status, large actions.
- **تنبيه** is the primary action. Disable it after the order leaves `waiting`.
- **إعادة التنبيه** on `ready` only.
- **تم الاستلام** and **إلغاء**.
- **عرض الرمز** reopens the existing cashier token.
- Loading and error states, including the duplicate-number sentence.
- Filter: active (`waiting` and `ready`), plus the terminal statuses.
- Poll every 4 seconds.

### Customer

Mobile-first. RTL. Nothing else on the screen: no marketing header, no WhatsApp, no trial form.

`/r/{slug}`:

- Restaurant name.
- Order number.
- **تابع طلبي**.
- The single `order_unavailable` sentence.

`/o/{token}`:

- Name, number, and the state from section 4.
- Works with polling before any notification permission.
- Ask for permission only where `Notification` and `PushManager` exist, and only after a user gesture.
- Unsupported or denied permission gets the honest Arabic line, including the iOS Home Screen step. No fake lock-screen graphic that claims a push arrived.
- Subscribe with `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `POST` the subscription.
- No refresh button is required for correctness.

### Service worker

Shows the Web Push. A click opens `{FRONTEND_URL}/o/{token}`. Payload is restaurant name, order number, and a ready message. No secrets in the payload.

### Platform admin

Later, after cashier, customer, and the service worker.

- Create and edit a restaurant: name, slug, preferred QR mode, timezone, TTL minutes, active flag.
- Create a cashier: name, email, password, bound to that restaurant.
- No password-reset flow. An admin replaces a password out of band.
- No public signup.

### Landing page

Stays in this repo. Do not port it into the app, and do not call the order API from it. The trial form only builds a copyable Arabic note. It does not create a restaurant.

## 8. Push behavior

1. The status page is useful with polling alone.
2. Detect support. Explain failure in Arabic. Do not invent a notification.
3. Where supported, ask, subscribe with the public VAPID key, `POST` the subscription.
4. The server saves `ready` first, then sends. Resend sends again without changing status.
5. The service worker displays the notification. A click opens the status URL.
6. The cashier UI may say the request was sent. It must not say the customer received it.

A normal iOS Safari tab cannot be assumed to receive background pushes. Web Push on iOS needs the site on the Home Screen (iOS/iPadOS 16.4+) and notification permission. The phone being off delivers nothing.

At most 5 subscriptions per order, and at most 5 non-revoked access tokens per order.

## 9. Build order

1. Cashier login and dashboard against the Laravel API.
2. Customer `/r/{slug}` and `/o/{token}`, including the 4-second poll.
3. Service worker and the real push path. Prove it on a real Android phone over HTTPS, and write the iOS Home Screen limit next to that result.
4. Platform admin.

Do not start customer pages or admin before the cashier can create an order, show its QR again, notify once, resend, collect, and cancel.

## 10. Security the UI must not weaken

- Never authorize from a client-supplied restaurant id.
- Customer routes use the token, not a sequential id or the order number.
- Public registration must not reveal whether a number exists. One sentence covers every failure.
- Do not log endpoints, `p256dh`, `auth`, bearer tokens, or the QR token.
- Do not put those values in analytics or in the push payload.
- CORS is the Laravel origin allow-list. The new app's origin has to be `FRONTEND_ORIGIN`.

## 11. Pitfalls already hit in this repo

- A section with `initial={{ opacity: 0 }}` stays blank when client JavaScript does not hydrate. The header was visible and the page looked empty. Hero content that must show up should render visible, or use `animate` rather than `whileInView`.
- `overflow-x: hidden` on a parent forces `overflow-y: auto` and can break `position: sticky` and `IntersectionObserver`. Use `overflow-x-clip`.
- `whileInView` with a high `amount` on a tall section never fires if too little of the section can enter the viewport.
- `scroll-behavior: smooth` makes `scrollIntoView` lag. Do not copy it onto a working dashboard.
- Passive `useEffect` timers are unsafe under `cacheComponents`. The intro overlay stuck on the first beat because the effect was cleaned up and did not restart. The landing intro now advances with CSS keyframes. Required product timers (the 4-second poll) need a loop that reschedules, and a visibility check, not a single `setTimeout` chain started once.
- `onAnimationEnd` bubbles. The intro ignores every animation except `intro-dismiss` before unmounting.
- Wide RTL screenshots look clipped when they are not. Trust layout measurements.
- Hot reload from a phone or another PC fails until that host is in `allowedDevOrigins` and the dev server is restarted.

## 12. Files to copy into the new repo

Copy the system, not the marketing page.

- `public/logo.png`
- The `@theme inline` block, selection color, and `prefers-reduced-motion` approach from `app/globals.css`
- Font setup from `app/layout.js` (`lang="ar"`, `dir="rtl"`)
- `postcss.config.mjs` and the Tailwind / PostCSS devDependencies
- `jsconfig.json` paths
- This file, plus `app/digital_pager_mvp_documentation.md`

