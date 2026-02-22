import * as React from 'react';
import { createPortal } from 'react-dom';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

const DropdownMenuContext = React.createContext(null);

function assignRef(ref, value) {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  ref.current = value;
}

function DropdownMenu({ children, open: openProp, onOpenChange }) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const triggerRef = React.useRef(null);
  const contentRef = React.useRef(null);
  const isControlled = typeof openProp === 'boolean';
  const open = isControlled ? openProp : internalOpen;

  const setOpen = React.useCallback(
    (nextOpen) => {
      const resolvedOpen = typeof nextOpen === 'function' ? nextOpen(open) : nextOpen;
      if (!isControlled) {
        setInternalOpen(resolvedOpen);
      }
      onOpenChange?.(resolvedOpen);
    },
    [isControlled, onOpenChange, open]
  );

  const contextValue = React.useMemo(
    () => ({
      open,
      setOpen,
      triggerRef,
      contentRef,
    }),
    [open, setOpen]
  );

  return <DropdownMenuContext.Provider value={contextValue}>{children}</DropdownMenuContext.Provider>;
}

const DropdownMenuTrigger = React.forwardRef(({ asChild = false, className, onClick, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext);
  const Comp = asChild ? Slot : 'button';

  if (!context) {
    throw new Error('DropdownMenuTrigger must be used within DropdownMenu');
  }

  return (
    <Comp
      ref={(node) => {
        assignRef(context.triggerRef, node);
        assignRef(ref, node);
      }}
      className={cn('outline-none', className)}
      aria-haspopup="menu"
      aria-expanded={context.open}
      data-state={context.open ? 'open' : 'closed'}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        context.setOpen(!context.open);
      }}
      {...props}
    />
  );
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

const DropdownMenuContent = React.forwardRef(
  (
    {
      className,
      children,
      align = 'end',
      sideOffset = 6,
      onEscapeKeyDown,
      onPointerDownOutside,
      ...props
    },
    ref
  ) => {
    const context = React.useContext(DropdownMenuContext);
    const [position, setPosition] = React.useState({ top: 0, left: 0, visibility: 'hidden' });

    if (!context) {
      throw new Error('DropdownMenuContent must be used within DropdownMenu');
    }

    React.useEffect(() => {
      if (!context.open) return undefined;

      const updatePosition = () => {
        const trigger = context.triggerRef.current;
        const content = context.contentRef.current;
        if (!trigger || !content) return;

        const triggerRect = trigger.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();

        let left = triggerRect.left;
        if (align === 'end') {
          left = triggerRect.right - contentRect.width;
        } else if (align === 'center') {
          left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
        }

        const viewportPadding = 8;
        left = Math.max(viewportPadding, Math.min(left, window.innerWidth - contentRect.width - viewportPadding));

        let top = triggerRect.bottom + sideOffset;
        if (top + contentRect.height > window.innerHeight - viewportPadding) {
          top = Math.max(viewportPadding, triggerRect.top - contentRect.height - sideOffset);
        }

        setPosition({ top, left, visibility: 'visible' });
      };

      const handleClickOutside = (event) => {
        const target = event.target;
        const trigger = context.triggerRef.current;
        const content = context.contentRef.current;
        if (!(target instanceof Node)) return;
        if (trigger?.contains(target) || content?.contains(target)) return;
        onPointerDownOutside?.(event);
        context.setOpen(false);
      };

      const handleKeyDown = (event) => {
        if (event.key !== 'Escape') return;
        onEscapeKeyDown?.(event);
        context.setOpen(false);
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [align, context, onEscapeKeyDown, onPointerDownOutside, sideOffset]);

    if (!context.open) {
      return null;
    }

    return createPortal(
      <div
        ref={(node) => {
          assignRef(context.contentRef, node);
          assignRef(ref, node);
        }}
        role="menu"
        data-state={context.open ? 'open' : 'closed'}
        className={cn(
          'fixed z-[90] min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
          className
        )}
        style={position}
        {...props}
      >
        {children}
      </div>,
      document.body
    );
  }
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

const DropdownMenuItem = React.forwardRef(
  ({ className, inset = false, disabled = false, onSelect, onClick, ...props }, ref) => {
    const context = React.useContext(DropdownMenuContext);

    return (
      <button
        ref={ref}
        type="button"
        role="menuitem"
        disabled={disabled}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors',
          'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
          'disabled:pointer-events-none disabled:opacity-50',
          inset && 'pl-8',
          className
        )}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || disabled) return;
          onSelect?.(event);
          context?.setOpen(false);
        }}
        {...props}
      />
    );
  }
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

const DropdownMenuLabel = React.forwardRef(({ className, inset = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-2 py-1.5 text-sm font-semibold text-foreground', inset && 'pl-8', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

const DropdownMenuGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
DropdownMenuGroup.displayName = 'DropdownMenuGroup';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
};
