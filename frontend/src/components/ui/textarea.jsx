import * as React from 'react';
import { cva } from 'class-variance-authority';
import { HiXMark } from 'react-icons/hi2';
import { cn } from '../../lib/utils';

const textareaVariants = cva(
  'flex min-h-[72px] w-full rounded-xl border border-border bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical transition-colors',
  {
    variants: {
      variant: {
        default: 'border-border',
        destructive: 'border-destructive focus-visible:ring-destructive',
        ghost: 'border-transparent bg-accent focus-visible:bg-input focus-visible:border-border',
      },
      size: {
        default: 'min-h-[92px] px-3 py-2',
        sm: 'min-h-[70px] px-3 py-2 text-xs',
        lg: 'min-h-[110px] px-4 py-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Textarea = React.forwardRef(
  ({ className, variant, size, error, clearable, onClear, value, onChange, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(props.defaultValue || '');
    const isControlled = value !== undefined;
    const textareaValue = isControlled ? value : internalValue;
    const showClearButton = clearable && textareaValue && String(textareaValue).length > 0;
    const currentVariant = error ? 'destructive' : variant;

    const handleChange = (event) => {
      if (!isControlled) setInternalValue(event.target.value);
      onChange?.(event);
    };

    const handleClear = () => {
      if (!isControlled) setInternalValue('');
      onClear?.();
      const synthetic = {
        target: { value: '' },
        currentTarget: { value: '' },
      };
      onChange?.(synthetic);
    };

    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          className={cn(textareaVariants({ variant: currentVariant, size, className }), showClearButton && 'pr-10')}
          value={isControlled ? textareaValue : undefined}
          defaultValue={!isControlled ? props.defaultValue : undefined}
          onChange={handleChange}
          {...props}
        />
        {showClearButton && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            <HiXMark className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
