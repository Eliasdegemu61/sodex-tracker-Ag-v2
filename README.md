# Sodex Tracker 🚀

A high-fidelity, comprehensive analytics dashboard and tracking platform built for the SoDex ecosystem. It provides traders and investors with deep insights into on-chain activity, personal portfolio performance, and community-wide trading metrics.

## 📊 Core Features

### 🔍 Wallet Tracker
Enter any SoDex `0x` address to instantly pull up a full analysis of their trading behavior. 
- **Live Net Worth**: Calculates total holdings (Spot, Futures, and Vault shares).
- **Position History**: Detailed table of every long/short position taken, including entry/close prices, leverage, and realized PnL.
- **Fund Flows**: Tracks all asset deposits and withdrawals. Accurately calculates net inflows/outflows by fetching real-time USD token prices for non-stablecoin assets (BTC, ETH, SOL, etc.).
- **Asset Allocation**: A visual breakdown of what tokens the wallet currently holds.

### 💼 Personal Portfolio
Bind your own wallet address to securely monitor your performance without needing to constantly check the main exchange.
- **30-Day Performance**: Tracks your realized profit and loss over the last month.
- **PnL Charts**: Visualizes your equity curve and trading consistency over time.
- **Vault Metrics**: Monitors your specific holdings in SoDex Vaults (e.g., MAG7 shares) and calculates accrued yield.

### 🏆 Leaderboard & Community Pulse
Stay connected to the broader SoDex ecosystem and see what the top traders are doing.
- **Perps Leaderboard**: Ranks the top traders by Volume and PnL across different timeframes (24H, 7D, 30D).
- **Community Pulse**: Analyzes market sentiment, tracks large "whale" movements vs. retail traders, and displays recent high-value liquidations or profits.

### 🧠 Trading Journal & Analytics (Beta)
Advanced tools designed to improve your trading psychology and execution.
- **Automated Journal**: Automatically logs your trades and calculates daily win rates.
- **Trade Analytics**: Deep dive into your risk management. Analyzes your average risk-to-reward ratio, execution efficiency, and long vs. short profitability.
- **Performance Streaks**: Gamifies your trading by tracking your consecutive profitable days.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS (featuring a custom, high-fidelity minimalist design system)
- **Database / Auth**: Supabase (Used for storing wallet bindings, custom site data, and user registries)
- **Data Syncing**: Automated Vercel Cron Jobs & GitHub Actions sync external registry data (CSV/JSON) directly into Supabase every 30 minutes.
- **Charting**: Recharts & Lightweight Charts for interactive financial data visualization.
- **APIs**: Integrates directly with SoDex Mainnet APIs, SoSoValue Index APIs (for real-time pricing), and custom Supabase edge functions.

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Eliasdegemu61/Sodex-Tracker.git
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up Environment Variables**:
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the Development Server**:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the dashboard in your browser.

## 🤝 Disclaimer
This dashboard is an independent, community-built analytics tool created for tracking on-chain activity related to SoDex. It is not officially affiliated with the SoDex team. All data is provided for informational purposes only.
