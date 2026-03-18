export type ActivityStatus = 'success' | 'info' | 'warning' | 'error';

export type InventoryAdjustmentType = 'ADD' | 'DEDUCT' | 'SET';

export type ReportRange = 'today' | 'this-week' | 'this-month' | 'this-year' | 'all-time';

export type ReportType = 'inventory' | 'activity' | 'low-stock';

export type NotificationPreferences = {
  stockAlerts: boolean;
  activityUpdates: boolean;
  systemNotifications: boolean;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  twoFactorEnabled: boolean;
  notificationPreferences: NotificationPreferences;
  createdAt: string;
};

export type InventoryItem = {
  id: string;
  title: string;
  isbn: string;
  sku: string;
  author: string;
  category: string;
  stock: number;
  reorderLevel: number;
  unitPrice: number;
  coverUrl: string;
  createdAt: string;
  updatedAt: string;
  updatedAtLabel: string;
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  inventoryValue: number;
};

export type ActivityLog = {
  id: string;
  type: string;
  action: string;
  status: ActivityStatus;
  createdAt: string;
  timeLabel: string;
  browser: string;
  ip: string;
  userId?: string;
  userName?: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type DashboardStats = {
  totalItems: number;
  inStock: number;
  todaysUpdates: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryValue: number;
};

export type DashboardActivityRow = {
  id: string;
  isbn: string;
  title: string;
  action: string;
  quantity: number;
  timeLabel: string;
};

export type HeaderNotification = {
  id: string;
  title: string;
  description: string;
  timeLabel: string;
  href: string;
  level: 'success' | 'info' | 'warning' | 'error';
};

export type TrendPoint = {
  label: string;
  count: number;
};

export type GeneratedReport = {
  id: string;
  type: ReportType;
  range: ReportRange;
  title: string;
  createdAt: string;
  createdAtLabel: string;
  fileName: string;
  rowCount: number;
  summary: {
    inventoryValue: number;
    stockMovements: number;
    lowStockItems: number;
    outOfStock: number;
  };
};

export type AutomationSession = {
  id: string;
  name: string;
  notes: string;
  status: 'active' | 'completed';
  startedAt: string;
  startedAtLabel: string;
  endedAt?: string;
  endedAtLabel?: string;
  startedByName: string;
  processedItems: number;
  processedUnits: number;
};

export type InventorySaveInput = {
  id?: string;
  title: string;
  isbn: string;
  sku?: string;
  author?: string;
  category?: string;
  stock: number;
  reorderLevel: number;
  unitPrice: number;
  coverUrl?: string;
};

export type InventoryBatchItemInput = {
  isbn: string;
  count: number;
  action?: InventoryAdjustmentType;
  title?: string;
  sku?: string;
  author?: string;
  category?: string;
  reorderLevel?: number;
  unitPrice?: number;
  coverUrl?: string;
};

export type InventorySearchFilters = {
  query?: string;
  sort?: 'title' | 'stock' | 'recent' | 'value';
};
