/**
 * EpiSensor App Framework - UI Components
 * Export all UI components and utilities
 */

// Base components (already exported via shadcn)
export * from '../components/base/alert';
export * from '../components/base/badge';
export * from '../components/base/button';
export * from '../components/base/card';
export * from '../components/base/checkbox';
export * from '../components/base/dialog';
export * from '../components/base/dropdown-menu';
export * from '../components/base/input';
export * from '../components/base/label';
export * from '../components/base/popover';
export * from '../components/base/progress';
export * from '../components/base/scroll-area';
export * from '../components/base/select';
export * from '../components/base/separator';
export * from '../components/base/slider';
export * from '../components/base/switch';
export * from '../components/base/table';
export * from '../components/base/tabs';
export * from '../components/base/textarea';
export * from '../components/base/tooltip';

// Auth components
export { LoginPage } from '../components/auth/LoginPage';
export { ProtectedRoute } from '../components/auth/ProtectedRoute';

// Page components
// Page wrappers (kept for compatibility). Prefer components: LogViewer, SettingsFramework
export { LogsPage } from '../components/logs/LogsPage';
export type { LogsPageProps } from '../components/logs/LogsPage';
export { SettingsPage } from './pages/SettingsPage';
export type { SettingsPageProps } from './pages/SettingsPage';

// Status components
export { ConnectionStatus } from '../components/connections/ConnectionStatus';
export { ConnectionLostOverlay } from '../components/connections/ConnectionLostOverlay';
export { ConnectionOverlay } from '../components/connections/ConnectionOverlay';
export { ConnectionStatusBanner } from '../components/base/ConnectionStatusBanner';
// useConnectionStatus will be exported later with other hooks
export { RestartBanner } from '../components/base/RestartBanner';
export { TestModeIndicator } from '../components/base/TestModeIndicator';
export { ConnectionIndicator } from '../components/connections/ConnectionIndicator';

// UI components
export { DeviceIcon } from '../components/base/DeviceIcon';
export { DogEarBadge } from '../components/base/DogEarBadge';
export { EmptyState } from '../components/base/EmptyState';
export * from '../components/base/DomainEmptyStates';
export { LoadingState, CardSkeleton, TableSkeleton } from '../components/base/LoadingState';
export { HelpTooltip } from '../components/base/HelpTooltip';
export { NetworkInterfaceSelect } from '../components/connections/NetworkInterfaceSelect';
export { MarkdownViewer, MarkdownCard, MarkdownScrollArea } from '../components/base/MarkdownViewer';
export { TruncatedText } from '../components/base/TruncatedText';
export { ColorPalette, TAG_COLORS, getRandomTagColor, getNextTagColor, getNextAvailableColor } from '../components/base/ColorPalette';
export { ConfirmDialog, useConfirmDialog } from '../components/base/ConfirmDialog';
export type { ConfirmDialogVariant } from '../components/base/ConfirmDialog';
export { ResizableDialog } from '../components/base/ResizableDialog';
export { ContextMenu, ContextMenuItem, ContextMenuSeparator, ContextMenuSubmenu } from '../components/base/context-menu';
export type { ContextMenuProps, ContextMenuPosition, ContextMenuItemProps, ContextMenuSubmenuProps } from '../components/base/context-menu';
export { CodeViewer, CodeSnippet } from '../components/base/CodeViewer';
export type { CodeViewerProps } from '../components/base/CodeViewer';

// Utilities
export * from './utils/dateFormat';
export * from './utils/numberFormat';
export * from './utils/tagColors';
export * from './utils/time';
export * from './utils/apiReadiness';

// Hooks
export { useFormState } from './hooks/useFormState';
export type { UseFormStateOptions, FormState } from './hooks/useFormState';

// Layout components
export { AppLayout, SidebarLayout } from '../components/layout/AppLayout';
export type { AppLayoutProps, SidebarLayoutProps, NavItem } from '../components/layout/AppLayout';

// Sidebar Layout (BMS-style)
export { SidebarAppLayout } from '../components/layout/SidebarAppLayout';
export type { SidebarAppLayoutProps, SidebarNavItem, SidebarNavGroup } from '../components/layout/SidebarAppLayout';

// Sidebar primitives
export {
  SidebarProvider,
  useSidebar,
  Sidebar,
  SidebarTrigger,
  SidebarInset,
  SidebarRail,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSection,
  SidebarSeparator,
  SidebarMenuBadge,
} from '../components/layout/sidebar';

// Activity components
export { ActivityLED } from '../components/activity/ActivityLED';
export type { ActivityLEDProps } from '../components/activity/ActivityLED';

// Data components
export { RealtimeDataTable } from '../components/data/RealtimeDataTable';
export type { RealtimeDataTableProps, DataColumn } from '../components/data/RealtimeDataTable';
export { Sparkline } from '../components/data/Sparkline';
export type { SparklineProps } from '../components/data/Sparkline';
export { DashboardStats, CompactStat } from '../components/data/DashboardStats';
export type { DashboardStatsProps, StatCard, CompactStatProps } from '../components/data/DashboardStats';

// Log components
// Legacy log viewer (deprecated)

// New log viewer with categories/archives + ANSI handling
export { LogViewer } from '../components/logs/LogViewer';
export type {
  LogViewerProps,
  LogEntry,
  LogFile
} from '../components/logs/LogViewer';

export { LogStats } from '../components/logs/LogStats';
export type { LogStatsProps } from '../components/logs/LogStats';


// Settings components
export { SettingsFramework } from '../components/settings/SettingsFramework';
export type { SettingsFrameworkProps, SettingsCategory, SettingDefinition, SettingsCategoryComponentProps, CustomFieldProps } from '../components/settings/SettingsFramework';
export { LogsSettings, LiveLogsSettings, LogArchivesSettings } from '../components/settings/LogsSettings';
export type { LogsSettingsProps, LiveLogsSettingsProps, LogArchivesSettingsProps } from '../components/settings/LogsSettings';
export { ThemeToggle, CompactThemeToggle } from '../components/settings/ThemeToggle';
export type { ThemeToggleProps } from '../components/settings/ThemeToggle';
export { defaultSettingsCategories, createSettingsCategory } from './config/defaultSettingsCategories';
// Settings component not found
// export { Settings } from '../components/settings/Settings';
// export type { SettingsProps } from '../components/settings/Settings';
// EnhancedSettings component not found
// export { EnhancedSettings } from '../components/settings/EnhancedSettings';
// export type { EnhancedSettingsProps } from '../components/settings/EnhancedSettings';

// Update components
export { UpdateNotification } from '../components/updates/UpdateNotification';

// Hooks
export { useSocketIO, socketManager } from './hooks/useSocketIO';
export { useDebounce } from './hooks/useDebounce';
// Deprecated: useWebSocket is no longer exported. Use useSocketIO + useConnectionStatus instead.
export { useConnectionStatus } from './hooks/useConnectionStatus';
export type { SocketIOConfig, SocketIOState, SocketIOActions } from './hooks/useSocketIO';

// Utilities
export { cn } from './utils/cn';
export { authHandler } from './utils/authHandler';
export { checkApiReadiness, waitForApiReady, apiRequest, useApiReadiness } from './utils/apiReadiness';
export type { ApiReadinessResult, ApiReadinessOptions } from './utils/apiReadiness';
// export { auth } from './utils/auth'; // Not exported from auth.ts

// Theme, Styles, and Icons
export * from './theme';
export { ThemeProvider, useTheme } from './theme/ThemeProvider';
export type { ThemeMode, ThemeConfig, ThemeProviderProps } from './theme/ThemeProvider';
export * from './styles';
export * from '../icons';

// Data Table components and hooks
export {
  DataTable,
  DataTablePage,
  PaginationControls,
  Pagination,
  BatchActionsBar,
  ColumnVisibility,
  TableFilters,
  MultiSelectFilter,
  usePagination,
  useColumnVisibility,
  useResizableColumns,
  useColumnOrder,
  useColumnDragDrop,
} from '../data-table';

export type {
  DataTableProps,
  ColumnDef,
  ColumnWidth,
  ColumnVisibilityConfig,
  HeaderCellProps,
  CellProps,
  ExternalPaginationState,
  ColumnConfigCompat,
  ColumnSizeConfig,
  DataTablePageProps,
  FilterOption,
  PaginationControlsProps,
  BatchActionsBarProps,
  TableFiltersProps,
  TableFilterOption,
  MultiSelectFilterProps,
  MultiSelectOption,
  ColumnConfig,
  ColumnVisibilityState,
  ResizableColumnResult,
  ColumnOrderConfig,
  DragState,
} from '../data-table';
