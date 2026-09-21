import { ApolloProvider } from "@apollo/client/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { client } from "./lib/apollo";
import { captureTokensFromUrl, getAccessToken } from "./lib/auth-storage";
import { AppShell } from "./components/AppShell";
import { RequireAccess } from "./components/RequireAccess";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import PosPage from "./pages/PosPage";
import InventoryPage from "./pages/InventoryPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import ProductsPage from "./pages/ProductsPage";
import ProductMetadataPage from "./pages/ProductMetadataPage";
import ProductTypesPage from "./pages/ProductTypesPage";
import CustomersPage from "./pages/CustomersPage";
import SalesPage from "./pages/SalesPage";
import PurchasesPage from "./pages/PurchasesPage";
import ServicesPage from "./pages/ServicesPage";
import AttendancePage from "./pages/AttendancePage";
import NotificationsPage from "./pages/NotificationsPage";
import ReturnsPage from "./pages/ReturnsPage";
import SyncPage from "./pages/SyncPage";
import MediaPage from "./pages/MediaPage";
captureTokensFromUrl();

function Protected({ children }: { children: React.ReactNode }) {
  if (!getAccessToken()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            element={
              <Protected>
                <AppShell />
              </Protected>
            }
          >
            <Route index element={<HomePage />} />
            <Route
              path="pos"
              element={
                <RequireAccess permission="sales.pos.access">
                  <PosPage />
                </RequireAccess>
              }
            />
            <Route
              path="sales"
              element={
                <RequireAccess permission="sales.read">
                  <SalesPage />
                </RequireAccess>
              }
            />
            <Route
              path="customers"
              element={
                <RequireAccess permission="customers.read">
                  <CustomersPage />
                </RequireAccess>
              }
            />
            <Route
              path="returns"
              element={
                <RequireAccess permission="sales.refund.create">
                  <ReturnsPage />
                </RequireAccess>
              }
            />
            <Route
              path="products"
              element={
                <RequireAccess permission="inventory.read">
                  <ProductsPage />
                </RequireAccess>
              }
            />
            <Route
              path="product-types"
              element={
                <RequireAccess permission="inventory.read">
                  <ProductTypesPage />
                </RequireAccess>
              }
            />
            <Route
              path="product-metadata"
              element={
                <RequireAccess permission="inventory.read">
                  <ProductMetadataPage />
                </RequireAccess>
              }
            />
            <Route
              path="inventory"
              element={
                <RequireAccess permission="inventory.read">
                  <InventoryPage />
                </RequireAccess>
              }
            />
            <Route
              path="purchases"
              element={
                <RequireAccess permission="purchases.read">
                  <PurchasesPage />
                </RequireAccess>
              }
            />
            <Route
              path="appointments"
              element={
                <RequireAccess permission="appointments.read">
                  <AppointmentsPage />
                </RequireAccess>
              }
            />
            <Route
              path="services"
              element={
                <RequireAccess permission="appointments.read">
                  <ServicesPage />
                </RequireAccess>
              }
            />
            <Route
              path="attendance"
              element={
                <RequireAccess permission="employees.read">
                  <AttendancePage />
                </RequireAccess>
              }
            />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route
              path="media"
              element={
                <RequireAccess permission="media.read">
                  <MediaPage />
                </RequireAccess>
              }
            />
            <Route path="sync" element={<SyncPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ApolloProvider>
  );
}
