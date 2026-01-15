import { Columns3, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/base/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/base/dropdown-menu';
import { cn } from '../../src/utils/cn';
import type { ColumnConfig } from '../hooks/useColumnVisibility';

interface ColumnVisibilityProps {
  columns: ColumnConfig[];
  isColumnVisible: (columnId: string) => boolean;
  toggleColumn: (columnId: string) => void;
  showAllColumns: () => void;
  hideAllColumns: () => void;
}

export function ColumnVisibility({
  columns,
  isColumnVisible,
  toggleColumn,
  showAllColumns,
  hideAllColumns,
}: ColumnVisibilityProps) {
  const visibleCount = columns.filter(c => isColumnVisible(c.id)).length;
  const toggleableColumns = columns.filter(c => !c.locked);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="h-4 w-4" />
          Columns
          <span className="text-muted-foreground text-xs">
            ({visibleCount}/{columns.length})
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
          Toggle columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {columns.map(column => {
          const visible = isColumnVisible(column.id);
          const isLocked = column.locked === true;

          return (
            <DropdownMenuItem
              key={column.id}
              onClick={(e) => {
                e.preventDefault();
                if (!isLocked) {
                  toggleColumn(column.id);
                }
              }}
              className={cn(
                'gap-2 cursor-pointer',
                isLocked && 'opacity-50 cursor-not-allowed'
              )}
              disabled={isLocked}
            >
              <div className="w-4 h-4 flex items-center justify-center">
                {visible ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <div className="h-3.5 w-3.5" />
                )}
              </div>
              <span className="flex-1">{column.label}</span>
              {isLocked && (
                <span className="text-xs text-muted-foreground">Required</span>
              )}
            </DropdownMenuItem>
          );
        })}

        {toggleableColumns.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                showAllColumns();
              }}
              className="gap-2 cursor-pointer"
            >
              <Eye className="h-4 w-4" />
              Show All
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                hideAllColumns();
              }}
              className="gap-2 cursor-pointer"
            >
              <EyeOff className="h-4 w-4" />
              Hide Optional
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
