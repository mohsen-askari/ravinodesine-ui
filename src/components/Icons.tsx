// Direction-aware icons: "forward" points along the reading direction, so it mirrors in RTL
// via the shared `.mirror` class (see globals), never via a hard-coded left/right choice.
export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <path d="M3 10h13M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  )
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  )
}

export function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="26" height="16" viewBox="0 0 26 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M0 1h26M0 8h26M0 15h26" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 014.5 9l1-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M2 3.5h12v9H2zM2.5 4l5.5 4.5L13.5 4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}
