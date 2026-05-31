'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Company {
  id: string
  name: string
  currency: string
  fiscal_year_start: number
  opening_cash: number
}

interface CompanyContextValue {
  companies: Company[]
  activeCompany: Company | null
  setActiveCompany: (company: Company) => void
  currencySymbol: string
}

const CompanyContext = createContext<CompanyContextValue>({
  companies: [],
  activeCompany: null,
  setActiveCompany: () => {},
  currencySymbol: '',
})

const COOKIE_NAME = 'active_company_id'

function getCurrencySymbol(currency: string) {
  if (currency === 'AED') return 'AED'
  if (currency === 'INR') return '₹'
  return currency
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}`
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null)

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return
    }
    const supabase = createClient()
    supabase
      .from('companies')
      .select('id, name, currency, fiscal_year_start, opening_cash')
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          console.error('CompanyContext: failed to load companies', error.message)
          return
        }
        if (!data || data.length === 0) return
        setCompanies(data as Company[])

        const savedId = readCookie(COOKIE_NAME)
        const initial = data.find((c) => c.id === savedId) ?? data[0]
        setActiveCompanyState(initial as Company)
      })
  }, [])

  const setActiveCompany = useCallback((company: Company) => {
    setActiveCompanyState(company)
    writeCookie(COOKIE_NAME, company.id)
  }, [])

  const currencySymbol = activeCompany
    ? getCurrencySymbol(activeCompany.currency)
    : ''

  return (
    <CompanyContext.Provider
      value={{ companies, activeCompany, setActiveCompany, currencySymbol }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  return useContext(CompanyContext)
}
