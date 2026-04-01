import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Holdings from "./pages/Holdings";
import Transactions from "./pages/Transactions";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "holdings", Component: Holdings },
      { path: "transactions", Component: Transactions },
      { path: "*", Component: NotFound },
    ],
  },
]);
