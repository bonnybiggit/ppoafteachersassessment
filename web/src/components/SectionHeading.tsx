import type { ReactNode } from 'react'

interface SectionHeadingProps {
  label?: string
  title: string
  description?: string
  centered?: boolean
  light?: boolean
  children?: ReactNode
}

export default function SectionHeading({
  label,
  title,
  description,
  centered = true,
  light = false,
  children,
}: SectionHeadingProps) {
  return (
    <div className={`mb-12 ${centered ? 'text-center' : ''}`}>
      {label && (
        <span
          className={`inline-block text-xs font-semibold tracking-widest uppercase mb-3 ${
            light ? 'text-blue-200' : 'text-[#b81c1c]'
          }`}
        >
          {label}
        </span>
      )}
      <h2
        className={`text-3xl sm:text-4xl font-bold leading-tight mb-4 ${
          light ? 'text-white' : 'text-[#0c3b6e]'
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`text-base leading-relaxed max-w-2xl ${centered ? 'mx-auto' : ''} ${
            light ? 'text-blue-100' : 'text-gray-600'
          }`}
        >
          {description}
        </p>
      )}
      {children}
    </div>
  )
}
