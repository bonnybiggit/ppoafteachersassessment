import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface CommonProps {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    as?: 'button'
    href?: never
    to?: never
  }

type ButtonAsAnchor = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    as: 'a'
    href: string
    to?: never
  }

type ButtonAsLink = CommonProps & {
  as: 'link'
  to: string
  href?: never
}

type ButtonProps = ButtonAsButton | ButtonAsAnchor | ButtonAsLink

const baseStyles =
  'inline-flex items-center justify-center gap-2 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md'

const variants: Record<Variant, string> = {
  primary: 'bg-[#0c3b6e] text-white hover:bg-[#082a50] focus:ring-[#0c3b6e]',
  secondary: 'bg-[#b81c1c] text-white hover:bg-[#8f1515] focus:ring-[#b81c1c]',
  outline: 'border-2 border-[#0c3b6e] text-[#0c3b6e] hover:bg-[#0c3b6e] hover:text-white focus:ring-[#0c3b6e]',
  ghost: 'text-[#0c3b6e] hover:bg-blue-50 focus:ring-[#0c3b6e]',
}

const sizes: Record<Size, string> = {
  sm: 'text-sm px-4 py-2',
  md: 'text-sm px-6 py-2.5',
  lg: 'text-base px-8 py-3',
}

export default function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', children, className = '' } = props
  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`

  if (props.as === 'a') {
    const { as: _as, variant: _v, size: _s, children: _c, className: _cl, ...rest } = props
    return (
      <a className={classes} {...rest}>
        {children}
      </a>
    )
  }

  if (props.as === 'link') {
    return (
      <Link to={props.to} className={classes}>
        {children}
      </Link>
    )
  }

  const { as: _as, variant: _v, size: _s, children: _c, className: _cl, href: _h, to: _t, ...rest } = props as ButtonAsButton
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
