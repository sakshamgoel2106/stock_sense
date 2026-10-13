# StockSense

StockSense is a modern multi-warehouse inventory intelligence platform built for companies that manage product catalogs, warehouse movement, stock health, supplier operations, and financial inventory visibility across multiple sites. It combines a production-ready full-stack MERN architecture with advanced decision support features like forecast-driven replenishment, automated transfer recommendations, AI copilots, custody-aware stock aging, and FIFO-based valuation.

This project is designed for real-world B2B and distribution operations where inventory is not just a count, but a live operational, financial, and decision-making asset.

## Why StockSense exists

Most inventory systems stop at basic stock counts. StockSense goes further by giving teams a single operational layer for:

- managing warehouses and team access across locations
- tracking stock movement in real time
- protecting cash through smarter replenishment decisions
- reducing inventory risk before it becomes a stockout
- preserving accurate financial inventory values with FIFO logic
- enabling inventory audits, approvals, reservations, and transfer governance
- using AI to answer operational questions from live warehouse data

This makes it useful not only for warehouse teams but also for operations managers, finance teams, and leadership who need visibility over both stock health and business risk.

---

## Core value proposition / USP

### 1. Multi-warehouse operational control
The system is built around a multi-hub network model. Businesses can manage multiple warehouses, assign them to teams, restrict user visibility by warehouse, and run stock movement across the network without losing control over permissions or accountability.

### 2. Multi-tenant company architecture
Each company operates in its own isolated workspace. The backend applies a tenant-aware plugin that scopes data by company and ownership, which helps enforce business separation and privacy for teams managing multiple organizations or entities.

### 3. Intelligent replenishment and shortage prevention
StockSense does not just show current stock; it evaluates risk categories like critical shortage, high risk, reorder soon, and excess inventory using demand trends, lead time, safety stock thresholds, and stock movement history. That turns stock data into operational decisions.

### 4. Transfer optimization instead of unnecessary buying
The platform identifies surplus stock in one warehouse and shortage risk in another, then calculates whether an inter-warehouse transfer is faster, safer, and cheaper than reordering from suppliers. It preserves source safety stock and recommends transfer quantities before approvals are processed.

### 5. FIFO-based stock aging and valuation
The system tracks stock layers by receipt and age, allowing it to calculate inventory value using remaining quantity and unit cost. This improves financial reporting and helps managers understand what is aging, what is moving, and what is at risk of obsolescence or write-down.

### 6. AI inventory copilot grounded in live business data
A dedicated AI Copilot helps users ask plain-language questions such as:

- Which products will run out within 7 days?
- Which warehouses have excess stock to transfer?
- What is our total inventory valuation?
- What items are older than 90 days?
- Which transfer approvals are pending?

It uses tool-grounded logic connected to live recommendations, stock aging, transfer opportunities, and warehouse intelligence instead of generic guesswork.

### 7. Approval-ready transfer governance
For sensitive warehouse movements, the workflow supports approval states such as pending, approved, and rejected. This lets managers validate transfers before stock changes are finalized, which is critical in regulated or operationally sensitive distribution environments.

### 8. Audit-ready inventory operations
Every validated stock movement is recorded in a stock ledger, and audits can be performed by product and warehouse. This ensures traceability from warehouse movements to inventory verification and reconciliation.

### 9. Finance and operations alignment
StockSense connects inventory health to business value by combining product cost, warehouse value, and movement history. It supports the practical need to manage both stock level and financial exposure in one place.

---

## What this project delivers

StockSense is built as a full-stack inventory management and intelligence platform with the following business and technical goals:

- reduce stockouts and emergency purchasing
- improve warehouse utilization across regions
- optimize transfer decisions between facilities
- strengthen stock traceability and ledger accountability
- support inventory audits and cycle counts
- give leadership a single dashboard for risk and financial visibility
- keep access secure through multi-role company-based permissions

---

## Main features

### 1. Company onboarding and account setup
Users can either:

- create a company workspace as the admin
- join an existing company through an invite token

The platform then sets appropriate roles and permissions automatically. This makes onboarding faster and safer for enterprise teams.

### 2. Roles and access control
The system supports company-based roles such as:

- COMPANY_ADMIN
- MANAGER
- WORKER

It also supports warehouse-specific access restrictions, so a worker can be limited to certain hub responsibilities while managers and admins retain broader visibility.

### 3. Product catalog management
Each product includes:

- name and SKU
- category and description
- cost price and pricing metadata
- reorder threshold and safety logic
- unit of measure
- lead time and reorder strategy
- active/archive lifecycle status

This provides the master data foundation for purchasing, operations, and forecasting.

### 4. Warehouse management
Each warehouse stores:

- warehouse code and name
- geographic location
- transfer costs and transit times
- active/inactive state

This makes it easy to model regional or branch-level network operations and evaluate transfer efficiency across them.

### 5. Stock overview and real-time balance visibility
The system tracks stock balances by product and warehouse, showing:

- current quantity
- reserved quantity
- availability after reservations
- product hierarchy and warehouse distribution

This gives operations teams a live view of where inventory is sitting and what is actually available for dispatch.

### 6. Receipt operations
Receipts represent inbound stock additions. When a receipt is validated:

- inventory quantity increases
- a stock layer is created with the arrival time and unit cost
- the stock ledger records the exact movement

This supports later FIFO valuation and aging analysis.

### 7. Delivery operations
Deliveries represent outbound stock reductions. When a delivery is validated:

- stock decreases from the source warehouse
- the FIFO engine consumes older stock layers first
- stock ledger entries are recorded for operational traceability

This is the backbone of accurate stock movement logic and aging visibility.

### 8. Transfer operations
Transfers move stock between warehouse locations. The platform:

- reduces inventory in the source warehouse
- increases inventory in the destination warehouse
- preserves original batch age using the same receivedAt reference when inbound transfer layers are created
- supports approval states before validation to avoid unauthorized moves

This helps maintain accurate historical aging and warehouse balancing.

### 9. Adjustment operations
Adjustments allow warehouse teams to fix mismatches or count variances. They may:

- increase stock with a positive adjustment
- decrease stock with a negative adjustment
- create new layers for gains
- consume FIFO layers for losses

These are particularly useful during cycle counts and physical verification.

### 10. Reservation management
Reservations ensure inventory is held for future fulfillment without immediately reducing actual available stock. The model supports:

- reservation creation against a warehouse and product
- availability checks before reserving
- reservation cancellation
- fulfillment workflows

This is useful for sales orders, production planning, or high-priority outbound assignments.

### 11. Stock ledger and audit trail
Every movement is written to the stock ledger with:

- operation type
- warehouse
- product
- quantity delta
- before/after inventory quantity
- user who triggered the action
- associated operation reference

This creates an immutable operational trail for auditing and accountability.

### 12. Stock aging analysis
The platform groups stock based on how long batches have been sitting in inventory:

- 0–30 days
- 31–60 days
- 61–90 days
- 90+ days

This helps businesses identify stale inventory, slow-moving stock, and material that may need discounting, reallocation, or disposal.

### 13. Inventory valuation
Using stock layers and unit cost, the system calculates inventory value as the sum of remaining quantity multiplied by unit cost. This is essential for:

- balance sheet visibility
- product value reporting
- warehouse-level asset tracking
- inventory-based financial analysis

### 14. Demand forecasting and replenishment
StockSense tracks demand patterns from delivery history and evaluates replenishment risk. It estimates:

- lead-time demand
- stock runway
- safety thresholds
- reorder urgency
- days until stockout

This gives operations teams a practical early warning system before critical shortfalls occur.

### 15. Transfer opportunity optimization
The intelligence layer identifies when it is smarter to move surplus stock from a warehouse with excess to a warehouse with shortage. It evaluates:

- source surplus quantity
- destination risk level
- transfer cost
- transit days
- supplier lead time comparison
- capital preserved through transfer decisions

This reduces unnecessary procurement costs and protects working capital.

### 16. What-if simulation
Users can test scenarios such as:

- increased demand over a horizon
- custom quantity fluctuations
- reduced stock for a particular product
- warehouse-specific shortage conditions

This makes it easier to evaluate operational decisions before placing purchase orders or approving moves.

### 17. AI Copilot for plain-language decisions
The built-in AI Copilot acts as a decision-support assistant. It queries operational data and returns grounded answers to questions about product risk, transfer feasibility, aging, and urgent activities. It can be used by warehouse managers and executives who need insight without digging through multiple screens.

### 18. Invoices and commercial operations
The app includes invoice management for commercial transactions, including invoice number generation, payment status handling, and invoice-level linking to stock movements for operational traceability.

### 19. Audits and reconciliation
Audit workflows let teams compare expected stock vs counted stock, record variances, and review or re-count when discrepancies emerge. This is especially valuable in physical inventory verification projects.

### 20. Team and company management
Admins can manage:

- member roles
- company membership status
- team access by warehouse
- invitations and access approvals

This makes StockSense suitable for scaling across entire operations teams.

---

## Internal architecture and how it is built

### Frontend
The frontend is built using React and Vite and includes:

- React Router for navigation
- Tailwind CSS for responsive design
- Recharts for KPI and charting
- Lucide icons and modern UI cards
- Axios for API communication
- role-aware pages for operational and executive workflows

The client is organized by features such as dashboard, products, warehouses, receipts, deliveries, transfers, audits, intelligence, and settings.

### Backend
The backend is built with Node.js and Express. It handles:

- authentication and authorization
- multi-company workspace logic
- inventory validation and movement processing
- repository layer and schemas via Mongoose
- tenant-scoped queries
- integration endpoints for analytics and intelligence

### Database design
MongoDB is the system’s primary persistence layer. The app models high-level domain entities such as:

- User
- Company
- Membership
- Invitation
- Product
- Warehouse
- Stock
- Operation
- StockLayer
- StockLedger
- Reservation
- Audit
- Invoice

The domain model supports operational traceability and financial inventory analysis without creating a brittle spreadsheet workflow.

### Multi-tenancy model
A tenant plugin is applied globally to Mongo schemas. This ensures that dataset queries are automatically scoped by company ownership and by assigned warehouse memberships. This is one of the most important architectural features for making the app behave like a real multi-company SaaS platform instead of a single-user internal app.

### Stock movement engine
The core inventory logic is implemented as a transactional stock engine. It validates operations and updates:

- stock quantities
- FIFO layers
- ledger history
- approval status
- warehouse balances

This is the engine that makes the platform dependable for operational use.

---

## Repository structure

```text
stock_sense-odoo-hackthon/
├── client/                        # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/                        # Express backend
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── tests/
│   ├── utils/
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── ADVANCED_FEATURES_PLAN.md
│   └── API_CONTRACTS.md
├── generate.js
├── modify_schemas.js
├── README.md
└── .gitignore
```

---

## Technologies used

### Frontend
- React 19
- Vite
- React Router
- Tailwind CSS
- Recharts
- Lucide React
- Axios
- React Hot Toast

### Backend
- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- bcryptjs
- Joi validation
- Helmet and CORS
- Nodemailer for OTP email flow

### Intelligence layer
- custom forecasting logic
- replenishment recommendation engine
- transfer optimizer
- scenario simulator
- AI Copilot with tool-grounded responses
- optional Groq / Gemini API support for AI assistance

---

## Typical user workflows

### Warehouse operator flow
1. Log in to the company workspace.
2. View assigned warehouses and stock availability.
3. Create or validate a receipt, delivery, transfer, or adjustment.
4. Review ledger entries and stock info.
5. Confirm inventory status during audit or cycle count tasks.

### Manager flow
1. Review the executive dashboard and KPI cards.
2. See critical stockout risks and transfer opportunities.
3. Approve pending warehouse transfers.
4. Monitor aging, valuation, and excess inventory.
5. Use AI Copilot for risk and operation summaries.

### Admin flow
1. Create company and workspace structure.
2. Add team members and assign permissions by warehouse.
3. Define warehouse network and operational policies.
4. Review enterprise-level risk and operating performance.
5. Maintain settings and user access controls.

---

## Env setup

Create a backend environment file in the server folder:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/stocksense?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

GROQ_API_KEY=gsk_your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

For the frontend, create a local environment file in the client folder:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## Local development

### 1. Clone the repo

```bash
git clone https://github.com/sakshamgoel2106/stock_sense-odoo-hackthon.git
cd stock_sense-odoo-hackthon
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Install frontend dependencies

```bash
cd ../client
npm install
```

### 4. Start the backend

```bash
cd ../server
npm run dev
```

### 5. Start the frontend

```bash
cd ../client
npm run dev
```

By default, the frontend runs on a Vite development server and the backend runs on the configured Express port.

---

## Deployment notes

The project is structured for deployment in modern hosting environments:

- Frontend: Vercel or Netlify
- Backend: Render, Railway, or any Node-compatible hosting service
- Database: MongoDB Atlas or a self-hosted MongoDB instance

The application is designed to run as a standard full-stack web product with separate frontend and backend services.

---

## Key operational benefits

StockSense is valuable because it solves the gap between raw inventory data and actionable management decisions. It helps organizations:

- avoid stockouts before they escalate
- move inventory to the right place faster
- maintain financial accuracy through valuation logic
- preserve traceability in every commodity movement
- operate an inventory network with secure team access
- make better decisions from both analytics and live AI guidance

---

## Future-ready positioning

This project is not just a CRUD inventory tool. It is structured as an operational intelligence product with the foundations needed for:

- ERP-like inventory workflows
- warehouse control tower features
- AI operational recommendations
- purchase planning integration
- broader analytics across procurement, distribution, and finance

It is a strong base for a real-world stock and supply chain system that can grow from warehouse operations into a larger inventory management platform.

---

## Project status

StockSense is already implemented as a working multi-feature inventory management application with company onboarding, warehouse management, stock operations, valuation, risk intelligence, transfer optimization, AI assistant, invoice support, and audit workflows. It is a full product-ready application architecture that can be used as a foundation for production deployment, further expansion, or enterprise customization.

---

## License

This project is provided for educational, demo, and portfolio use unless otherwise specified by the repository owner.

## Links

- Live frontend: https://stock-sense-odoo-hackthon-iv5r.vercel.app/
- Backend API: https://stock-sense-odoo-hackthon.vercel.app/api/v1
- Demo video: https://youtu.be/dGGIwiUV6Ug?si=wz78s3EJzpOxL99k
