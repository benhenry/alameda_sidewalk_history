'use client'

interface SkipLinkProps {
  href?: string
  children?: React.ReactNode
}

export default function SkipLink({
  href = '#main-content',
  children = 'Skip to main content'
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const target = document.querySelector(href)
    if (target instanceof HTMLElement) {
      target.focus()
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
    >
      {children}
    </a>
  )
}
