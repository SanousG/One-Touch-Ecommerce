import type { SVGProps } from "react";

export type IconName =
  | "hub"
  | "terminal"
  | "store"
  | "chevron"
  | "grid"
  | "inventory"
  | "storefront"
  | "chat"
  | "receipt"
  | "warehouse"
  | "settings"
  | "logout"
  | "search"
  | "bell"
  | "help"
  | "person"
  | "sync"
  | "lock"
  | "check"
  | "arrow"
  | "eye"
  | "eyeOff"
  | "plus"
  | "inbox"
  | "edit"
  | "folder"
  | "image"
  | "star"
  | "trash"
  | "archive"
  | "upload"
  | "chevronRight"
  | "sort"
  | "filter"
  | "tag"
  | "moveLeft"
  | "moveRight"
  | "box"
  | "bag"
  | "minus"
  | "arrowLeft"
  | "whatsapp"
  | "rocket"
  | "link"
  | "copy"
  | "play"
  | "split";

const paths: Record<IconName, React.ReactNode> = {
  hub: <><circle cx="12" cy="12" r="3" /><circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><path d="M7 6.5 10 10M17 6.5 14 10M7 17.5 10 14" /></>,
  terminal: <><rect x="2.5" y="4" width="19" height="16" rx="2" /><path d="m6.5 9 3 3-3 3M12.5 15h5" /></>,
  store: <><path d="M3 10h18l-1.5-5h-15L3 10Z" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  chevron: <path d="m7 10 5 5 5-5" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  inventory: <><path d="m3 7 9-4 9 4-9 4-9-4Z" /><path d="M3 7v10l9 4 9-4V7M12 11v10" /></>,
  storefront: <><path d="M4 9h16v11H4V9Z" /><path d="M4 9 6 4h12l2 5M9 20v-6h6v6" /></>,
  chat: <path d="M20 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9Z" />,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  warehouse: <><path d="M3 20V9l9-5 9 5v11H3Z" /><path d="M7 20v-7h10v7M7 16h10" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-3v-.2a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3v-3h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L6.5 6l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3h3v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19 6.5l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21v3h-.2a1.7 1.7 0 0 0-1.4 2Z" /></>,
  logout: <><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M15 16l4-4-4-4M19 12H9" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  bell: <><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z" /><path d="M10 20h4" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-.9.7-1.5 1.2-1.5 2.5M12 17h.01" /></>,
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" /></>,
  sync: <><path d="M20 11a8 8 0 0 0-14-5L4 8" /><path d="M4 4v4h4M4 13a8 8 0 0 0 14 5l2-2" /><path d="M20 20v-4h-4" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  eyeOff: <><path d="M3 3l18 18M10.6 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.3 3.7M6.3 8.2A17 17 0 0 0 2 12s3.5 6 10 6a10 10 0 0 0 3.6-.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  inbox: <><path d="M4 5h16l2 10v4H2v-4L4 5Z" /><path d="M2 15h5l1.5 3h7L17 15h5" /></>,
  edit: <><path d="m4 16 10-10 4 4L8 20H4v-4Z" /><path d="m14 6 2-2a1.4 1.4 0 0 1 2 2l-2 2" /></>,
  folder: <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="m21 16-5-5L5 20" /></>,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />,
  trash: <><path d="M4 7h16M9 7V5h6v2M6 7l1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></>,
  archive: <><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v12h14V8M10 12h4" /></>,
  upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  sort: <><path d="M4 7h10M4 12h7M4 17h4" /><path d="m16 14 3 3 3-3M19 17V7" /></>,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
  tag: <><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="7.5" r="1" /></>,
  moveLeft: <path d="M19 12H5m6-6-6 6 6 6" />,
  moveRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
  box: <><path d="m3 7 9-4 9 4-9 4-9-4Z" /><path d="M3 7v10l9 4 9-4V7M12 11v10" /></>,
  bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
  minus: <path d="M5 12h14" />,
  arrowLeft: <path d="M19 12H5m6 6-6-6 6-6" />,
  whatsapp: <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.7 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.2-4-1-3.3-1.4-5.4-4.7-5.6-4.9-.1-.2-1.3-1.8-1.3-3.4s.8-2.4 1.1-2.7c.3-.3.7-.4.9-.4h.6c.2 0 .5 0 .8.6.3.7.9 2.3 1 2.4.1.2.1.4 0 .7-.1.3-.2.4-.4.6-.2.2-.4.5-.6.7-.2.2-.4.4-.2.8.2.4 1.1 1.8 2.3 2.8 1.6 1.4 2.9 1.8 3.3 2 .4.2.6.2.9-.1.3-.3 1-1.2 1.3-1.6.3-.4.5-.3.9-.2.4.1 2.3 1.1 2.7 1.3.4.2.7.3.8.5.1.2.1.9-.2 1.6Z" />,
  rocket: <><path d="M13 4c4-1 7 2 6 6-1 5-5 8-9 9l-4-4c1-4 4-8 7-11Z" /><circle cx="14.5" cy="9.5" r="1.5" /><path d="m8 16-3 3M6 13l-3 1 3 3 2-1" /></>,
  link: <><path d="M10 13a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 11a4 4 0 0 0-6-.5l-2 2A4 4 0 0 0 11.7 18l1-1" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  split: <><path d="M6 4v6a4 4 0 0 0 4 4h8M6 20v-4a4 4 0 0 1 4-4" /><path d="m15 11 3 3-3 3M15 8l3-3-3-3" /></>,
};

type IconProps = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
