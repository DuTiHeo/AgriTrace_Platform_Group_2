import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./AppLayout_wb";

const AccountPage = lazy(() => import("../../features/account/website/AccountPage_wb"));
const DashboardPage = lazy(() => import("./DashboardPage_wb"));
const UsersPage = lazy(() => import("./UsersPage_wb"));
const ReportsPage = lazy(() => import("./ReportsPage_wb"));
const CatalogPage = lazy(() => import("./CatalogPage_wb"));
const LogsPage = lazy(() => import("./LogsPage_wb"));

export default function App() {
  return <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="account" element={<AccountPage admin />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="catalog" element={<CatalogPage />} />
      <Route path="logs" element={<LogsPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Route>
  </Routes>;
}
