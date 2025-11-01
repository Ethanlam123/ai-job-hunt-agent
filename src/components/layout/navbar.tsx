'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { signout } from '@/actions/auth'
import { toast } from 'sonner'

export function Navbar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()

  async function handleSignOut() {
    try {
      await signout()
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/cv-analysis', label: 'CV Analysis' },
    { href: '/cover-letter', label: 'Cover Letter' },
    { href: '/interview', label: 'Interview Prep' },
    { href: '/workflow', label: 'Workflow' },
    { href: '/history', label: 'History' },
  ]

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold">
            Job Hunt Agent
          </Link>
          <div className="hidden md:flex items-center gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === item.href
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {userEmail && (
            <>
              <Avatar>
                <AvatarFallback>
                  {userEmail.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <form action={handleSignOut}>
                <Button variant="outline" type="submit">
                  Sign out
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
