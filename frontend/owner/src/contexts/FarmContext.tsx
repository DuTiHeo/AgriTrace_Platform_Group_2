import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ReactNode,
} from "react";
import { farmService } from "../services/farmService";
import type {
  Farm,
} from "../types/farm";

type SelectedFarmId = "all" | string;

type FarmContextValue = {
  farms: Farm[];
  selectedFarmId: SelectedFarmId;
  selectedFarm: Farm | null;
  loadingFarms: boolean;
  farmError: string;
  selectFarm: (farmId: SelectedFarmId) => void;
  refreshFarms: () => Promise<void>;
};

type FarmProviderProps = {
  children: ReactNode;
};

const SELECTED_FARM_KEY =
  "farmer_quicklog_selected_farm";

const FarmContext =
  createContext<FarmContextValue | null>(null);

export function FarmProvider({
  children,
}: FarmProviderProps) {
  const requestId = useRef(0);
  const [farmError, setFarmError] = useState("");
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loadingFarms, setLoadingFarms] =
    useState(true);

  const [selectedFarmId, setSelectedFarmId] =
    useState<SelectedFarmId>(() => {
      return (
        localStorage.getItem(SELECTED_FARM_KEY) ||
        "all"
      );
    });

  const refreshFarms = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoadingFarms(true);
    setFarmError("");
    try {
      const data = await farmService.getAll();
      if (currentRequest !== requestId.current) return;
      setFarms(data);
      setSelectedFarmId((current) => {
        if (current === "all" || data.some((farm) => farm.id === current)) return current;
        localStorage.setItem(SELECTED_FARM_KEY, "all");
        return "all";
      });
    } catch (error) {
      if (currentRequest === requestId.current) setFarmError(error instanceof Error ? error.message : "Không thể tải nông trại.");
    } finally {
      if (currentRequest === requestId.current) setLoadingFarms(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshFarms(), 0);
    return () => { window.clearTimeout(timer); requestId.current += 1; };
  }, [refreshFarms]);

  useEffect(() => {
    const handleFarmUpdate = () => {
      void refreshFarms();
    };

    window.addEventListener(
      "farms-updated",
      handleFarmUpdate,
    );

    return () => {
      window.removeEventListener(
        "farms-updated",
        handleFarmUpdate,
      );
    };
  }, [refreshFarms]);

  const selectFarm = useCallback(
    (farmId: SelectedFarmId) => {
      setSelectedFarmId(farmId);

      localStorage.setItem(
        SELECTED_FARM_KEY,
        farmId,
      );
    },
    [],
  );

  const selectedFarm = useMemo(() => {
    if (selectedFarmId === "all") {
      return null;
    }

    return (
      farms.find(
        (farm) => farm.id === selectedFarmId,
      ) ?? null
    );
  }, [farms, selectedFarmId]);

  const value = useMemo<FarmContextValue>(
    () => ({
      farms,
      selectedFarmId,
      selectedFarm,
      loadingFarms,
      farmError,
      selectFarm,
      refreshFarms,
    }),
    [
      farms,
      selectedFarmId,
      selectedFarm,
      loadingFarms,
      farmError,
      selectFarm,
      refreshFarms,
    ],
  );

  return (
    <FarmContext.Provider value={value}>
      {children}
    </FarmContext.Provider>
  );
}

// Hook and provider intentionally share this module to keep context identity stable.
// eslint-disable-next-line react-refresh/only-export-components
export function useFarmContext() {
  const context = useContext(FarmContext);

  if (!context) {
    throw new Error(
      "useFarmContext phải được sử dụng bên trong FarmProvider",
    );
  }

  return context;
}
