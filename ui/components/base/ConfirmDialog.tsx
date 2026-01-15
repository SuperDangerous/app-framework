/**
 * Confirm Dialog Component
 *
 * A styled confirmation dialog to replace browser's native confirm().
 * Supports customizable title, message, and button labels.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Info, Play, Pause, Trash2, type LucideIcon } from 'lucide-react';
import { cn } from '../../src/utils/cn';

export type ConfirmDialogVariant = 'default' | 'destructive' | 'warning' | 'success';

interface ConfirmDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 title: string;
 description: string;
 confirmLabel?: string;
 cancelLabel?: string;
 variant?: ConfirmDialogVariant;
 icon?: LucideIcon;
 onConfirm: () => void;
 onCancel?: () => void;
 loading?: boolean;
}

const variantConfig = {
 default: {
 icon: Info,
 iconColor: 'text-blue-600',
 iconBg: 'bg-blue-50 border-blue-100',
 },
 success: {
 icon: Play,
 iconColor: 'text-emerald-600',
 iconBg: 'bg-emerald-50 border-emerald-100',
 },
 warning: {
 icon: Pause,
 iconColor: 'text-amber-600',
 iconBg: 'bg-amber-50 border-amber-100',
 },
 destructive: {
 icon: Trash2,
 iconColor: 'text-red-600',
 iconBg: 'bg-red-50 border-red-100',
 },
};

export function ConfirmDialog({
 open,
 onOpenChange,
 title,
 description,
 confirmLabel = 'Confirm',
 cancelLabel = 'Cancel',
 variant = 'default',
 icon,
 onConfirm,
 onCancel,
 loading = false,
}: ConfirmDialogProps) {
 const config = variantConfig[variant];
 const Icon = icon || config.icon;

 const handleCancel = () => {
 onCancel?.();
 onOpenChange(false);
 };

 const handleConfirm = () => {
 onConfirm();
 if (!loading) {
 onOpenChange(false);
 }
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-[380px] p-0 gap-0 overflow-hidden">
 {/* Content */}
 <div className="px-5 pt-5 pb-4">
 <DialogHeader className="space-y-2">
  <div className="flex items-center gap-3">
  <Icon className={cn('h-5 w-5 flex-shrink-0', config.iconColor)} />
  <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
  </div>
  <DialogDescription className="text-sm text-muted-foreground leading-relaxed pl-8">
  {description}
  </DialogDescription>
 </DialogHeader>
 </div>

 {/* Actions */}
 <div className="flex border-t border-border">
 <button
  type="button"
  onClick={handleCancel}
  disabled={loading}
  className="flex-1 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 border-r border-border"
 >
  {cancelLabel}
 </button>
 <button
  type="button"
  onClick={handleConfirm}
  disabled={loading}
  className={cn(
  'flex-1 px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50',
  variant === 'destructive'
   ? 'text-red-600 hover:bg-red-50'
   : variant === 'success'
   ? 'text-emerald-600 hover:bg-emerald-50'
   : variant === 'warning'
   ? 'text-amber-600 hover:bg-amber-50'
   : 'text-primary hover:bg-muted/50'
  )}
 >
  {loading ? 'Processing...' : confirmLabel}
 </button>
 </div>
 </DialogContent>
 </Dialog>
 );
}

/**
 * Hook to manage confirm dialog state
 */
export function useConfirmDialog() {
 const [state, setState] = useState<{
 open: boolean;
 title: string;
 description: string;
 confirmLabel?: string;
 cancelLabel?: string;
 variant?: ConfirmDialogVariant;
 onConfirm: () => void;
 }>({
 open: false,
 title: '',
 description: '',
 onConfirm: () => {},
 });

 const confirm = (options: {
 title: string;
 description: string;
 confirmLabel?: string;
 cancelLabel?: string;
 variant?: ConfirmDialogVariant;
 }): Promise<boolean> => {
 return new Promise((resolve) => {
 setState({
 ...options,
 open: true,
 onConfirm: () => {
  resolve(true);
  setState((prev) => ({ ...prev, open: false }));
 },
 });
 });
 };

 const dialogProps = {
 ...state,
 onOpenChange: (open: boolean) => {
 if (!open) {
 setState((prev) => ({ ...prev, open: false }));
 }
 },
 onCancel: () => {
 setState((prev) => ({ ...prev, open: false }));
 },
 };

 return { confirm, dialogProps, ConfirmDialog };
}
