import * as React from 'react';
import { cva } from 'class-variance-authority';
import { HiEye, HiEyeSlash, HiXMark } from 'react-icons/hi2';
import { cn } from '../../lib/utils';

const inputVariants = cva(
  'flex w-full rounded-xl border border-border bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
  {
    variants: {
      variant: {
        default: 'border-border',
        destructive: 'border-destructive focus-visible:ring-destructive',
        ghost: 'border-transparent bg-accent focus-visible:bg-input focus-visible:border-border',
      },
      size: {
        default: 'h-10 px-3 py-2',
        sm: 'h-9 px-2 py-1 text-xs',
        lg: 'h-11 px-4 py-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Input = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      type = 'text',
      leftIcon,
      rightIcon,
      error,
      clearable,
      onClear,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(props.defaultValue || '');
    const internalRef = React.useRef(null);
    const inputRef = ref || internalRef;
    const isControlled = value !== undefined;
    const inputValue = isControlled ? value : internalValue;
    const isPassword = type === 'password';
    const actualType = isPassword && showPassword ? 'text' : type;
    const currentVariant = error ? 'destructive' : variant;
    const showClearButton = clearable && inputValue && String(inputValue).length > 0;

    const handleInputChange = (event) => {
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
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4 z-10">
            {leftIcon}
          </div>
        )}

        <input
          ref={inputRef}
          type={actualType}
          className={cn(
            inputVariants({ variant: currentVariant, size, className }),
            leftIcon && 'pl-10',
            (rightIcon || isPassword || showClearButton) && 'pr-10'
          )}
          value={isControlled ? inputValue : undefined}
          defaultValue={!isControlled ? props.defaultValue : undefined}
          onChange={handleInputChange}
          {...props}
        />

        {(rightIcon || isPassword || showClearButton) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
            {rightIcon && <div className="text-muted-foreground">{rightIcon}</div>}
            {showClearButton && (
              <button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                <HiXMark className="h-4 w-4" />
              </button>
            )}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <HiEyeSlash className="h-4 w-4" /> : <HiEye className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
