import { type AnchorHTMLAttributes, type ReactNode } from 'react'

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string
  children: ReactNode
}

export function Link({ to, children, ...props }: LinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('navigate', { detail: to }))
    if (to.startsWith('/')) {
      window.history.pushState({}, '', to)
    }
  }

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}
