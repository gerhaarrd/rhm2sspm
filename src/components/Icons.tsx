type IconProps = { className?: string };

const base = "stroke-current fill-none";

export function IconUpload({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <g className={base}>
        <path d="M12 15V4" />
        <path d="M7.5 8.5 12 4l4.5 4.5" />
        <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </g>
    </svg>
  );
}

export function IconFolder({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path
        className={base}
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
      />
    </svg>
  );
}

export function IconBolt({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="m13 3-8 11h6l-1 7 8-11h-6l1-7Z" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="m5 13 4 4L19 7" />
    </svg>
  );
}

export function IconX({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function IconAlert({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M12 9v4m0 4h.01M10.3 3.9 2.7 17.1a1.8 1.8 0 0 0 1.56 2.7h15.5a1.8 1.8 0 0 0 1.55-2.7L13.7 3.9a1.8 1.8 0 0 0-3.1 0Z" />
    </svg>
  );
}

export function IconMusic({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M9 18V5l11-2v13" />
      <circle className={base} cx="6" cy="18" r="3" />
      <circle className={base} cx="17" cy="16" r="3" />
    </svg>
  );
}

export function IconGrid({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <g className={base}>
        <circle cx="6" cy="6" r="1.4" />
        <circle cx="12" cy="6" r="1.4" />
        <circle cx="18" cy="6" r="1.4" />
        <circle cx="6" cy="12" r="1.4" />
        <circle cx="18" cy="12" r="1.4" strokeOpacity="0.4" />
        <circle cx="6" cy="18" r="1.4" />
        <circle cx="12" cy="18" r="1.4" />
        <circle cx="18" cy="18" r="1.4" strokeOpacity="0.4" />
      </g>
      <circle cx="15" cy="9.6" r="1.7" className="fill-amber-400 stroke-none" />
    </svg>
  );
}

export function IconClock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle className={base} cx="12" cy="12" r="9" />
      <path className={base} d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function IconExternal({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M14 4h6v6M20 4 10 14M9 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-1 0v12a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V7h6Z" />
    </svg>
  );
}

export function IconRefresh({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M20 11a8 8 0 0 0-14.5-4.5M4 4v5h5M4 13a8 8 0 0 0 14.5 4.5M20 20v-5h-5" />
    </svg>
  );
}

export function IconPlay({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M7 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

export function IconPause({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M8 5.5v13M16 5.5v13" />
    </svg>
  );
}

export function IconArchive({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H4V7Z" />
      <path className={base} d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4" />
    </svg>
  );
}

export function IconSun({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle className={base} cx="12" cy="12" r="4.5" />
      <path
        className={base}
        d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
      />
    </svg>
  );
}

export function IconMoon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

export function IconMonitor({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect className={base} x="3" y="4.5" width="18" height="12" rx="1.5" />
      <path className={base} d="M8.5 20.5h7M12 16.5v4" />
    </svg>
  );
}

export function IconPencil({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path
        className={base}
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
      />
    </svg>
  );
}

export function IconGlobe({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle className={base} cx="12" cy="12" r="9" />
      <path className={base} d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  );
}

export function IconDownload({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M12 4v11" />
      <path className={base} d="M7.5 10.5 12 15l4.5-4.5" />
      <path className={base} d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function IconSpinner({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${className ?? ""} animate-spin`} strokeWidth="2.5" strokeLinecap="round">
      <path className={base} d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}
