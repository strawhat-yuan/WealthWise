# WealthWise 📈

WealthWise is a professional, full-stack Portfolio Management System designed to provide a comprehensive, financial-grade lens into your investment journey. It combines real-time data visualization with persistent accounting to track holdings, calculate realized profits, and analyze historical performance.

## ✨ Key Features

### 📊 Professional Dashboard
- **Consolidated Metrics**: Real-time tracking of `Total Value`, `Total Gain`, `Total Daily P&L`, and `Total Realized P&L`.
- **Dynamic Allocations**: Visualize your portfolio distribution by **Ticker** or **Sector** using interactive Pie charts.
- **Historical Performance**: A 1-year performance trend chart with **trade markers** (orange dots) indicating your exact buy/sell points on the timeline.

### 💰 Intelligent Holdings Management
- **Active Holdings**: Monitor your current positions with live price updates and automatic FIFO (First-In-First-Out) cost basis tracking.
- **Realized Profits Summary**: A dedicated, database-persistent system that aggregates gains/losses for every ticker you've traded, providing a permanent record of your historical performance.
- **Financial-Grade UI**: 
    - Numerical columns (Price, Quantity, P&L) are **right-aligned** for instant visual comparison.
    - **Tabular Nums** typography ensures stable, non-wobbling displays during price updates.

### 🛒 Market & Trading
- **Integrated Market View**: Real-time market snapshots including Market Cap, 24h Change, and Sector badges.
- **Advanced Trade Entry**: A premium trade modal that automatically fetches historical closing prices for any selected date, ensuring your records match historical reality.
- **Automated Ledger**: Every trade is atomically recorded in a permanent transaction history, triggering real-time updates to your holdings and realized profit summaries.

## 💻 Technology Stack

- **Frontend**: React 18 + TypeScript + Vite, Styled with **TailwindCSS** and **Radix UI** primitives.
- **Backend**: **Spring Boot 3** (Java 17), utilizing **MyBatis-Plus** for advanced ORM and atomic database operations.
- **Database**: **MySQL 8.0** with a structured relational schema including:
    - `stock_holding`: Current asset quantities and costs.
    - `stock_trade`: Immutable transaction ledger.
    - `stock_realized_summary`: Persistent record of all-time gains/losses.
- **Visualization**: **Recharts** for high-performance SVG charting and **Lucide Icons** for a modern interface.

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or higher
- **Java**: JDK 17
- **Maven**: 3.8+
- **MySQL**: 8.0+

### 1. Database Setup
1. Create a MySQL database named `wealthwise`:
   ```sql
   CREATE DATABASE wealthwise;
   ```
2. Execute the schema script located at `management/sql/wealthwise.sql`. This will initialize all tables, constraints, and baseline market data.
3. Configure your credentials in `management/backend/src/main/resources/application.yml`.

### 2. Backend Execution
```bash
cd management/backend
./mvnw spring-boot:run
```
*The API will be available at `http://localhost:8080`.*

### 3. Frontend Execution
```bash
cd management/front
npm install
npm run dev
```
*The dashboard will launch at `http://localhost:5173`.*

## 🤝 Project Philosophy
WealthWise is built with a focus on **Data Integrity** and **User Experience**. By offloading complex calculations (like FIFO and realized aggregation) to the backend and utilizing specialized financial typography on the frontend, it provides a tool that is both powerful for analysis and delightful for daily use.
