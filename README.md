# DHOBI GHAT — Pilot Web App

A working end-to-end pilot: register/login → onboarding survey → home →
place an order (catalogue → cart → address) → order tracking → order
history → admin dashboard (view all orders, change status).

**Stack:** React + Vite + JavaScript (plain JSX, no TypeScript) + Tailwind
on the client · Node.js + Express + Mongoose on the server · MongoDB Atlas.

**What's stubbed out for this pilot** (marked in code comments):
- WhatsApp notifications — see the comment in `server/src/routes/orders.js`
  at the status-update endpoint.
- Razorpay payment — orders are created directly as "placed"; no real
  payment step yet.
- Rider role / live map / Socket.IO — the admin dashboard is the
  status-update tool for now; the tracking page polls every 5 seconds.

---

## 1. Prerequisites

- **Node.js** v18+ — https://nodejs.org
- A **MongoDB Atlas** cluster (you already have one connected — no local
  MongoDB install needed)

Check your Node version:
```bash
node -v
npm -v
```

---

## 2. Configure the backend

```bash
cd server
copy .env.example .env      # Windows cmd
# or: Copy-Item .env.example .env   (PowerShell)
```

Open `server/.env` and set your Atlas connection string, a JWT secret, and
the client origin:

```
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/ApnaLaundry?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=some_long_random_string_here
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

---

## 3. Install everything (one command from the project root)

```bash
npm run install:all
```

This installs dependencies for the root, `server/`, and `client/` in one
go.

---

## 4. Seed the database (one-time)

```bash
npm run seed --prefix server
```

This inserts the garment catalogue and creates a default admin account:
```
admin@dhobighat.com / admin123
```

---

## 5. Run both client and server together

From the **project root**:
```bash
npm run dev
```

This starts the API (with nodemon, auto-restarting on file changes) and
the Vite dev server together in one terminal, color-coded `SERVER` /
`CLIENT`. Open **http://localhost:5173** once both are up.

To stop both, press `Ctrl+C` once — `concurrently -k` kills both
processes together.

(If you ever want to run them separately instead: `npm run dev --prefix
server` and `npm run dev --prefix client` in two terminals.)

---

## 6. Try it out

**Customer side:**
1. Go to http://localhost:5173/register and create a customer account.
2. On the onboarding survey, either answer the 4 questions or tap
   **Skip for now** in the top-right corner — either way you land on Home.
3. Tap **Place a wash →**, pick items, choose Regular or Priority, enter
   an address, and place the order.
4. You'll land on the tracking screen, starting at `ORDER_PLACED`.
5. The app is responsive — resize your browser or open it on desktop to
   see the top nav bar and wider layout; on mobile you get the bottom tab
   bar and a back-arrow header instead.

**Admin side (separate login):**
1. Go to http://localhost:5173/admin/login (also linked from the bottom
   of the customer login page).
2. Sign in with `admin@dhobighat.com` / `admin123`.
3. From the sidebar (desktop) or the scrollable tab bar (mobile), you can:
   - **Dashboard** — order/customer/rider counts, revenue, quick links
   - **Orders** — every order, change status, expand to see full status
     history with who changed it and when
   - **Customers** — everyone registered, order count, onboarding status
   - **Riders** — list riders and add new rider accounts
   - **Services & Pricing** — edit prices per garment, add new garments,
     activate/deactivate items
   - Laundry Partners / Slots / Payments / Notifications / Issues /
     Settings — placeholder pages marking what's next on the roadmap

A sample rider account is also seeded: `rider1@dhobighat.com` / `rider123`
(no dedicated rider UI yet — riders are managed from the admin panel for
now).

**Where onboarding answers are stored:** in MongoDB, embedded directly on
each user's document (`users` collection → `onboarding` field) — not a
separate collection. See `server/src/models/User.js`.

---

## 7. Project structure

```
dhobi-ghat-pilot/
├── package.json        # root — "npm run dev" starts both apps together
├── server/              # Node + Express + MongoDB API
│   └── src/
│       ├── models/       # User, Garment, Order (schemas)
│       ├── routes/       # auth, garments, orders (incl. admin sub-routes)
│       ├── middleware/    # JWT auth + role check
│       ├── seed.js       # populates catalogue + default admin
│       └── server.js     # app entrypoint
└── client/              # React + Vite + JavaScript + Tailwind
    └── src/
        ├── pages/         # Login, Register, Onboarding, Home, NewOrder,
        │                  # OrderTracking, OrderHistory, Profile, AdminDashboard
        ├── components/    # Nav, ProtectedRoute
        ├── context/       # AuthContext (JWT session handling)
        └── api.js         # axios instance with auth header
```

---

## 8. Common issues

- **MongooseServerSelectionError** — your IP isn't whitelisted in Atlas.
  Go to **Network Access** in the Atlas dashboard → **Add IP Address** →
  **Allow Access from Anywhere** → wait for it to show **Active**.
- **CORS errors in the browser console** — confirm `CLIENT_ORIGIN` in
  `server/.env` matches the URL you're opening the frontend from.
- **"Invalid or expired token"** — make sure `JWT_SECRET` isn't empty,
  and restart the server after changing `.env`.
- **Port already in use** — change `PORT` in `server/.env` and update the
  `target` in `client/vite.config.js` to match.

---

## 9. Next steps (post-pilot)

- Wire up real Razorpay checkout in `NewOrder.jsx` + a `/payments` route
  on the server, verifying signatures server-side.
- Add the WhatsApp Business API call where marked in
  `server/src/routes/orders.js`.
- Split `OrderItem` / `OrderStatusHistory` into their own collections if
  order documents start growing large.
- Add a dedicated Rider role/view once you have riders to onboard.
- Move from polling to Socket.IO for real-time tracking.
