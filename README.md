# ShopNest - Online Shopping

An Amazon-style online shopping web app with a customer store and an admin panel.

**Live site:** https://jebin-santhosh-psiog.github.io/Online-Shopping/

Built with **HTML, CSS, JavaScript and jQuery (Ajax)** on the client, and **Firebase (Authentication + Cloud Firestore)** on the server. All Firebase calls go through the **Firebase REST APIs** using `$.ajax`. The Firebase SDK is not used.

---

## Features

### Customer
- Sign up, sign in and reset password, with form validations
- Amazon-style store: header search bar, category bar, product grid with pagination
- Search by keywords, browse by category, sort by price or newest
- Product page with quantity selector, Add to Cart, Buy Now and related items
- Cart saved in the database: change quantity, remove items, live totals
- Discount coupons (percentage or flat, minimum order, expiry)
- Checkout with delivery address and payment by **Cash on Delivery** or **ShopNest Credit** (within the credit limit set by admin)
- Bill page after every order, printable or saved as PDF
- Order history with credit summary

### Admin (single admin account)
- Dashboard with live counts: products, low stock, customers, credit outstanding, orders and sales this month
- **Categories:** create, read with pagination, update, activate/deactivate, delete with Yes/No confirmation
- **Inventory:** create item (category, title, description, qty, price, image), read all / by category / single item, update all fields except Id, activate/deactivate, delete with confirmation
- **Customers:** set, edit and reset credit limit (max 1000, default 0)
- **Coupons:** create, edit, activate/deactivate, delete
- **Reports** (with CSV export and print):
  - Customer: all details, top 10 customers, cash purchases, credit purchases (date range)
  - Inventory: current stock (all / category wise), high stock (> 100), low stock (< 15)
  - Sales: all, category wise, cash, credit, top 10 and bottom 10 selling items (date range)

---

## Architecture

```
Browser (HTML / CSS / JS / jQuery)
        |
        |  JSON over Ajax (REST)
        v
Firebase Auth REST API      ->  identitytoolkit.googleapis.com, securetoken.googleapis.com
Cloud Firestore REST API    ->  firestore.googleapis.com
```

1. The user signs in with `accounts:signInWithPassword`. Firebase returns an **idToken** (valid 1 hour) and a **refreshToken**.
2. Every Firestore request sends `Authorization: Bearer <idToken>`.
3. **Firestore security rules** check the token on the server (admin or customer, own data only).
4. Before each request, `fresh()` renews the idToken with the refreshToken when it is about to expire.

### REST endpoints used

| Purpose | Endpoint |
|---|---|
| Sign up / Sign in | `POST accounts:signUp`, `POST accounts:signInWithPassword` |
| Reset password mail | `POST accounts:sendOobCode` (PASSWORD_RESET) |
| Refresh token | `POST securetoken.googleapis.com/v1/token` |
| Create document | `POST /documents/{collection}` or `?documentId={id}` |
| Read document | `GET /documents/{collection}/{id}` |
| Update fields | `PATCH /documents/{collection}/{id}?updateMask.fieldPaths=...` |
| Delete document | `DELETE /documents/{collection}/{id}` |
| Filter, sort, paginate | `POST /documents:runQuery` |
| Read many documents | `POST /documents:batchGet` |
| Count and sum | `POST /documents:runAggregationQuery` |
| Place order atomically | `POST /documents:commit` |

### Placing an order
One `:commit` request with all writes together, so either everything succeeds or nothing changes:
1. Reduce stock of each item (`increment` by minus quantity)
2. Add the total to `creditUsed` (credit payment only)
3. Create the order document
4. Empty the cart

Security rules reject the whole request if stock would go below 0 or credit would go above the limit.

---

## Firestore collections

| Collection | Fields |
|---|---|
| `categories` | name, key, active, createdAt |
| `inventory` | catId, title, key, des, qty, price, img, active, createdAt |
| `customers/{uid}` | name, email, mob, creditLimit (default 0), creditUsed, createdAt |
| `coupons/{CODE}` | code, type (pct / flat), val, minAmt, exp, active, createdAt |
| `carts/{uid}` | items { itemId: qty }, coupon, updatedAt |
| `orders/{orderNo}` | uid, name, email, mob, addr, pin, items [ {id, catId, catName, title, price, qty, amt} ], count, sub, coupon, disc, total, payType, status, createdAt |

---

## Security
- **Firestore rules** (`firestore.rules`): admin has full access; customers can read products, manage only their own cart, read only their own orders, and can only reduce stock and increase their own credit used within the limit.
- **API key** is restricted in Google Cloud Console to this website and to the Identity Toolkit, Token Service and Cloud Firestore APIs.
- The key is **not stored in the repo**. It lives in `js/env.js` (git ignored) locally, and is generated from **GitHub Secrets** during deployment.

---

## Setup (run locally)

1. Create a Firebase project. Enable **Authentication > Email/Password** and create a **Cloud Firestore** database.
2. In Authentication > Users, add the admin user `admin@shop.com`.
3. Paste the contents of `firestore.rules` into Firestore > Rules and publish.
4. Copy `js/env.example.js` to `js/env.js` and fill in your values:
   ```js
   const KEY = "your Web API key";
   const PID = "your project id";
   ```
5. Open the folder in VS Code and run `index.html` with **Live Server**.

---

## CI/CD (GitHub Actions)

| Workflow | Runs on | Does |
|---|---|---|
| `validate.yml` | push to main, develop, feature/**; PRs | HTMLHint, CSSLint, JavaScript syntax check |
| `pr-checks.yml` | PRs to main, develop | Title tags, image alt text, no console.log, no Firebase SDK |
| `deploy.yml` | push to main | Builds `env.js` from secrets and deploys to GitHub Pages |
| `notify.yml` | after deploy | Prints success or failure with the site link |
| `lighthouse.yml` | after deploy, weekly | Lighthouse audit report |

Repository secrets needed: `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`.

### Branching
`feature/<module>` -> Pull Request -> `develop` -> Pull Request -> `main` (deploys)

---

## Folder structure

```
Online-Shopping/
|-- index.html, signup.html, reset.html
|-- admin/      dashboard, categories, inventory, customers, coupons, reports
|-- customer/   shop, product, cart, checkout, bill, orders
|-- css/        style.css (common, admin), shop.css (store)
|-- js/
|   |-- env.example.js   template for env.js
|   |-- config.js        REST helpers, Firestore JSON converters, db functions
|   |-- session.js       login session, page guards, shared UI helpers
|   |-- auth.js          sign up, sign in, reset password
|   |-- admin/           one file per admin page
|   |-- customer/        common.js (header, cart, coupons) + one file per page
|-- firestore.rules
|-- .github/workflows/
```
