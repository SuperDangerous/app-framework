/**
 * Context Menu Components
 *
 * A headless context menu system with positioning, submenus, and variants.
 *
 * @example
 * ```tsx
 * import { ContextMenu, ContextMenuItem, ContextMenuSeparator, ContextMenuSubmenu } from '@superdangerous/app-framework/ui';
 *
 * function MyComponent() {
 *   const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
 *
 *   return (
 *     <>
 *       <div onContextMenu={(e) => {
 *         e.preventDefault();
 *         setContextMenu({ x: e.clientX, y: e.clientY });
 *       }}>
 *         Right-click me
 *       </div>
 *
 *       {contextMenu && (
 *         <ContextMenu position={contextMenu} onClose={() => setContextMenu(null)}>
 *           <ContextMenuItem onClick={() => console.log('Edit')}>Edit</ContextMenuItem>
 *           <ContextMenuItem variant="destructive" onClick={() => console.log('Delete')}>Delete</ContextMenuItem>
 *           <ContextMenuSeparator />
 *           <ContextMenuSubmenu label="More options">
 *             <ContextMenuItem>Option 1</ContextMenuItem>
 *             <ContextMenuItem>Option 2</ContextMenuItem>
 *           </ContextMenuSubmenu>
 *         </ContextMenu>
 *       )}
 *     </>
 *   );
 * }
 * ```
 */

export { ContextMenu } from './ContextMenu';
export type { ContextMenuProps, ContextMenuPosition } from './ContextMenu';

export { ContextMenuItem, ContextMenuSeparator } from './ContextMenuItem';
export type { ContextMenuItemProps } from './ContextMenuItem';

export { ContextMenuSubmenu } from './ContextMenuSubmenu';
export type { ContextMenuSubmenuProps } from './ContextMenuSubmenu';
