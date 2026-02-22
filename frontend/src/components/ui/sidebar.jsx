import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const Sidebar = React.forwardRef(({ className, ...props }, ref) => (
  <aside
    ref={ref}
    className={cn('flex h-full w-full flex-col rounded-2xl border border-border bg-card text-card-foreground', className)}
    {...props}
  />
));
Sidebar.displayName = 'Sidebar';

const SidebarHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('border-b border-border p-4', className)} {...props} />
));
SidebarHeader.displayName = 'SidebarHeader';

const SidebarContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex-1 overflow-y-auto p-3', className)} {...props} />
));
SidebarContent.displayName = 'SidebarContent';

const SidebarFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('border-t border-border p-4', className)} {...props} />
));
SidebarFooter.displayName = 'SidebarFooter';

const SidebarGroup = React.forwardRef(({ className, ...props }, ref) => (
  <section ref={ref} className={cn('mb-4 last:mb-0', className)} {...props} />
));
SidebarGroup.displayName = 'SidebarGroup';

const SidebarGroupLabel = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('mb-2 px-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground', className)}
    {...props}
  />
));
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

const SidebarMenu = React.forwardRef(({ className, ...props }, ref) => (
  <ul ref={ref} className={cn('space-y-1', className)} {...props} />
));
SidebarMenu.displayName = 'SidebarMenu';

const SidebarMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <li ref={ref} className={cn('', className)} {...props} />
));
SidebarMenuItem.displayName = 'SidebarMenuItem';

const sidebarMenuButtonVariants = cva(
  'inline-flex w-full items-center justify-start gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      variant: {
        default: 'text-muted-foreground hover:bg-accent hover:text-foreground',
        active: 'bg-primary/10 text-primary hover:bg-primary/15',
      },
      size: {
        default: 'h-10',
        sm: 'h-9 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const SidebarMenuButton = React.forwardRef(
  ({ asChild = false, className, variant, size, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(sidebarMenuButtonVariants({ variant, size, className }))}
        type={asChild ? undefined : 'button'}
        {...props}
      />
    );
  }
);
SidebarMenuButton.displayName = 'SidebarMenuButton';

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
};
