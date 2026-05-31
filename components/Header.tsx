'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LogOut, Building2, ReceiptText, TrendingUp, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { companies, activeCompany, setActiveCompany } = useCompany()

  async function handleLogout() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Failed to sign out')
      return
    }
    router.push('/login')
    router.refresh()
  }

  function handleCompanyChange(companyId: string | null) {
    if (!companyId) return
    const company = companies.find((c) => c.id === companyId)
    if (company) setActiveCompany(company)
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2 font-semibold text-sm shrink-0">
          <Building2 className="size-4 shrink-0" />
          <span className="hidden sm:inline">Financial Runway</span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'gap-1.5',
              pathname === '/income' && 'bg-muted'
            )}
            render={<Link href="/income" />}
          >
            <TrendingUp className="size-4" />
            <span className="hidden sm:inline">Income</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-1.5', pathname === '/expenses' && 'bg-muted')}
            render={<Link href="/expenses" />}
          >
            <ReceiptText className="size-4" />
            <span className="hidden sm:inline">Expenses</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-1.5', pathname === '/planned' && 'bg-muted')}
            render={<Link href="/planned" />}
          >
            <CalendarClock className="size-4" />
            <span className="hidden sm:inline">Planned</span>
          </Button>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 ml-auto">
          {companies.length > 0 && activeCompany && (
            <Select value={activeCompany.id} onValueChange={handleCompanyChange}>
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
