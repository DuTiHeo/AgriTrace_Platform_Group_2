import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useSyncExternalStore, type ReactNode } from "react";
import AppLayout from "./layouts/AppLayout";
import { accountService } from "./services/accountService";
import { httpClient } from "./services/httpClient";
import { FarmProvider } from "./contexts/FarmContext";

const AccountPage = lazy(() => import("./pages/AccountPage"));
const CreateFarmPage = lazy(() => import("./pages/CreateFarmPage"));
const CreateHarvestPage = lazy(() => import("./pages/CreateHarvestPage"));
const CreatePersonnelPage = lazy(() => import("./pages/CreatePersonnelPage"));
const CreatePlotPage = lazy(() => import("./pages/CreatePlotPage"));
const CreateSeasonPage = lazy(() => import("./pages/CreateSeasonPage"));
const CreateTeamPage = lazy(() => import("./pages/CreateTeamPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const FarmDetailPage = lazy(() => import("./pages/FarmDetailPage"));
const FarmsPage = lazy(() => import("./pages/FarmsPage"));
const FarmingLogDetailPage = lazy(() => import("./pages/FarmingLogDetailPage"));
const FarmingLogsPage = lazy(() => import("./pages/FarmingLogsPage"));
const HarvestDetailPage = lazy(() => import("./pages/HarvestDetailPage"));
const HarvestsPage = lazy(() => import("./pages/HarvestsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const PersonnelDetailPage = lazy(() => import("./pages/PersonnelDetailPage"));
const PersonnelPage = lazy(() => import("./pages/PersonnelPage"));
const PlotDetailPage = lazy(() => import("./pages/PlotDetailPage"));
const PlotsPage = lazy(() => import("./pages/PlotsPage"));
const SeasonDetailPage = lazy(() => import("./pages/SeasonDetailPage"));
const SeasonsPage = lazy(() => import("./pages/SeasonsPage"));
const TeamDetailPage = lazy(() => import("./pages/TeamDetailPage"));
const TeamsPage = lazy(() => import("./pages/TeamsPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const TraceabilityPage = lazy(() => import("./pages/TraceabilityPage"));

function ProtectedAppLayout() {
  const location = useLocation();
  const authenticated = useSyncExternalStore(httpClient.subscribeAuth, accountService.isAuthenticated);

  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <FarmProvider><AppLayout /></FarmProvider>;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const authenticated = useSyncExternalStore(httpClient.subscribeAuth, accountService.isAuthenticated);
  return authenticated ? <Navigate to="/" replace /> : children;
}

function App() {
  return (
    <Suspense fallback={<div className="route-loading">Đang tải trang...</div>}>
      <Routes>
      <Route element={<ProtectedAppLayout />}>
        <Route index element={<DashboardPage />} />

        <Route path="tasks" element={<TasksPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="support" element={<SupportPage />} />

        <Route path="farming-logs">
          <Route index element={<FarmingLogsPage />} />
          <Route path=":logId" element={<FarmingLogDetailPage />} />
        </Route>

        <Route path="harvests">
          <Route index element={<HarvestsPage />} />
          <Route path="new" element={<CreateHarvestPage />} />
          <Route path=":batchId" element={<HarvestDetailPage />} />
        </Route>

        <Route path="farms">
          <Route index element={<FarmsPage />} />
          <Route
            path="new"
            element={<CreateFarmPage />}
          />
          <Route
            path=":farmId"
            element={<FarmDetailPage />}
          />
        </Route>

        <Route path="plots">
          <Route index element={<PlotsPage />} />
          <Route
            path="new"
            element={<CreatePlotPage />}
          />
          <Route
            path=":plotId"
            element={<PlotDetailPage />}
          />
        </Route>

        <Route path="seasons">
          <Route index element={<SeasonsPage />} />
          <Route
            path="new"
            element={<CreateSeasonPage />}
          />
          <Route
            path=":seasonId"
            element={<SeasonDetailPage />}
          />
        </Route>

        <Route path="personnel">
          <Route index element={<PersonnelPage />} />
          <Route
            path="new"
            element={<CreatePersonnelPage />}
          />
          <Route
            path=":personnelId"
            element={<PersonnelDetailPage />}
          />
        </Route>

        <Route path="teams">
          <Route index element={<TeamsPage />} />
          <Route
            path="new"
            element={<CreateTeamPage />}
          />
          <Route
            path=":teamId"
            element={<TeamDetailPage />}
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="trace/:batchCode" element={<TraceabilityPage />} />
      <Route path="login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
      </Routes>
    </Suspense>
  );
}

export default App;
