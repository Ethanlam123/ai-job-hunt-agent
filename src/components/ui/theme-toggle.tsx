'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

// Custom hook to handle SSR hydration gracefully
function useMounted() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  return mounted
}

interface ThemeToggleProps {
  variant?: 'ghost' | 'outline' | 'secondary' | 'default' | 'destructive' | 'link'
  size?: 'sm' | 'default' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'
  className?: string
}

// Extract icon transition styles for maintainability
const iconTransitionClasses = 'h-4 w-4 transition-all duration-300'

export function ThemeToggle({
  variant = 'ghost',
  size = 'icon-sm',
  className,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  if (!mounted) {
    // Prevent hydration mismatch by rendering a placeholder
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled
        aria-label="Loading theme toggle"
      >
        <div className="animate-pulse h-4 w-4 rounded bg-muted" />
      </Button>
    )
  }

  const isDark = theme === 'dark'
  const nextTheme = isDark ? 'light' : 'dark'

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => setTheme(nextTheme)}
      className={className}
      aria-label={`Switch to ${nextTheme} mode`}
    >
      <Sun
        className={`${iconTransitionClasses} rotate-0 scale-100 dark:-rotate-90 dark:scale-0`}
      />
      <Moon
        className={`absolute ${iconTransitionClasses} rotate-90 scale-0 dark:rotate-0 dark:scale-100`}
      />
    </Button>
  )
}
