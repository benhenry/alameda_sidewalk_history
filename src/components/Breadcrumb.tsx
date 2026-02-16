'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
}

// Map of routes to their breadcrumb labels
const routeLabels: Record<string, string> = {
  '/': 'Home',
  '/admin': 'Admin Dashboard',
}

export default function Breadcrumb() {
  const pathname = usePathname()

  // Build breadcrumb items from the current path
  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    if (pathname === '/') {
      return []
    }

    const items: BreadcrumbItem[] = [{ label: 'Home', href: '/' }]
    const segments = pathname.split('/').filter(Boolean)

    let currentPath = ''
    for (const segment of segments) {
      currentPath += `/${segment}`
      const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1)
      items.push({ label, href: currentPath })
    }

    return items
  }

  const breadcrumbs = buildBreadcrumbs()

  // Don't render anything on the home page
  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm text-gray-600 mb-4">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1

        return (
          <span key={item.href} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-1 text-gray-400" aria-hidden="true" />
            )}
            {index === 0 && (
              <Home className="h-4 w-4 mr-1" aria-hidden="true" />
            )}
            {isLast ? (
              <span className="font-medium text-gray-900" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-blue-600 hover:underline transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
