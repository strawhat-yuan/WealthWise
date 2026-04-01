# WealthWise 📈

WealthWise is a modern, full-stack Portfolio Management System designed to give you a dynamic lens into your investment journey. Easily track holdings, manage historical trades, and visualize your financial growth over time.

## ✨ Features

- **Dashboard Intelligence**: At-a-glance portfolio totals, top 5 asset allocations, and high-level summaries.
- **Stock Market & Holdings**: Live view of your assets alongside an interactive "Available Stocks" market. Easily dial in your quantity and immediately inject shares into your portfolio.
- **Transactions Ledger**: Automated tracking array out of the box! Every time you acquire shares, the system transparently logs a permanent `BUY` receipt in the transactions table. 
- **Interactive Recharts (with Snapping Markers) 📍**: Click any ticker to summon an interactive 1-year historical pricing line chart. Watch as your exact purchase actions vividly map to intelligent "orange dot markers" right on the line, complete with custom Tooltops showing share volume!

## 💻 Tech Stack

- **Frontend**: React + TypeScript + Vite, using TailwindCSS and beautifully crafted components from `shadcn/ui`.
- **Backend**: Java 17 + Spring Boot, leveraging MyBatis-Plus for rapid database interaction.
- **Database**: MySQL (structured relational storage with `stock_holding`, `stock_price`, and `stock_trade` schemas).
- **Visualization**: Industry-standard `Recharts` for stunning and responsive SVG charting.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Java (JDK 17)
- Maven
- MySQL Server (Port: 3306)

### 1. Database Setup

1. Create a MySQL database named `wealthwise`:
   ```sql
   CREATE DATABASE wealthwise;
   ```
2. Import the included schema and mock data using `management/sql/wealthwise.sql`.
3. *(Optional)* Update the backend MySQL credentials in `management/backend/src/main/resources/application.yml` if your password isn't `Dadujin123`.

### 2. Run the Backend (Spring Boot)

Open your terminal in the backend directory:

```bash
cd management/backend
./mvnw spring-boot:run
```
*The Spring Boot server will run in the background on `http://localhost:8080`.*

### 3. Run the Frontend (Vite)

Open another terminal in the frontend directory:

```bash
cd management/front
npm install
npm run dev
```
*Your frontend will launch at `http://localhost:5173` with an automatic proxy forwarding `/api/*` to the backend!*

## 🤝 Contribution

This project was developed incrementally with agile pairing to refine core visualizations, automated workflows, and UI polishing. Feel free to clone or fork this repository!
