import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// A password field with a hold-to-reveal eye button: the value is only visible
// while the button is actively pressed (mouse or touch), and re-masks on release.
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  const [reveal, setReveal] = React.useState(false);
  const hide = () => setReveal(false);
  return (
    <div className="relative">
      <Input
        ref={ref}
        type={reveal ? 'text' : 'password'}
        className={cn('pr-10', className)}
        {...props}
      />
      <button
        type="button"
        aria-label={reveal ? 'Hide password' : 'Show password (hold)'}
        title="Hold to show password"
        tabIndex={-1}
        onMouseDown={() => setReveal(true)}
        onMouseUp={hide}
        onMouseLeave={hide}
        onTouchStart={(e) => {
          e.preventDefault();
          setReveal(true);
        }}
        onTouchEnd={hide}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
      >
        {reveal ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';
