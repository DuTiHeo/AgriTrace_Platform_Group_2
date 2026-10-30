export type OwnerAccount = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  address: string;
  role: "owner";
  joinedAt: string;
  lastLoginAt: string;
};

export type UpdateOwnerAccountInput = Pick<
  OwnerAccount,
  "fullName" | "phone" | "email" | "dateOfBirth" | "address"
>;

export type AccountPreferences = {
  cultivationReminders: boolean;
  taskUpdates: boolean;
  harvestAlerts: boolean;
  weeklyDigest: boolean;
};

