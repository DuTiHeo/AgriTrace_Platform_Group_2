import { Route, Routes } from "react-router-dom";
import { lazy } from "react";
import AppLayout from "./AppLayout_wb";
import { FarmProvider } from "../../contexts/FarmContext_wb";

const AccountPage = lazy(() => import("../../features/account/website/AccountPage_wb"));
const CreateFarmPage = lazy(() => import("./CreateFarmPage_wb"));
const CreateHarvestPage = lazy(() => import("./CreateHarvestPage_wb"));
const CreatePersonnelPage = lazy(() => import("./CreatePersonnelPage_wb"));
const CreatePlotPage = lazy(() => import("./CreatePlotPage_wb"));
const CreateSeasonPage = lazy(() => import("./CreateSeasonPage_wb"));
const CreateTeamPage = lazy(() => import("./CreateTeamPage_wb"));
const DashboardPage = lazy(() => import("./DashboardPage_wb"));
const FarmDetailPage = lazy(() => import("./FarmDetailPage_wb"));
const FarmsPage = lazy(() => import("./FarmsPage_wb"));
const FarmingLogDetailPage = lazy(() => import("./FarmingLogDetailPage_wb"));
const FarmingLogsPage = lazy(() => import("./FarmingLogsPage_wb"));
const HarvestDetailPage = lazy(() => import("./HarvestDetailPage_wb"));
const HarvestsPage = lazy(() => import("./HarvestsPage_wb"));
const NotFoundPage = lazy(() => import("./NotFoundPage_wb"));
const NotificationsPage = lazy(() => import("./NotificationsPage_wb"));
const PersonnelDetailPage = lazy(() => import("./PersonnelDetailPage_wb"));
const PersonnelPage = lazy(() => import("./PersonnelPage_wb"));
const PlotDetailPage = lazy(() => import("./PlotDetailPage_wb"));
const PlotsPage = lazy(() => import("./PlotsPage_wb"));
const SeasonDetailPage = lazy(() => import("./SeasonDetailPage_wb"));
const SeasonsPage = lazy(() => import("./SeasonsPage_wb"));
const TeamDetailPage = lazy(() => import("./TeamDetailPage_wb"));
const TeamsPage = lazy(() => import("./TeamsPage_wb"));
const TasksPage = lazy(() => import("./TasksPage_wb"));
const SupportPage = lazy(() => import("./SupportPage_wb"));

export default function App() {
  return (
    <Routes>
      <Route element={<FarmProvider><AppLayout /></FarmProvider>}>
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
    </Routes>
  );
}
