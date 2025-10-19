// Remove this line since we're getting it directly in api.ts
// export const API_BASE_URL = import.meta.env.VITE_API_BASE;

export const MESSAGE_ROLES = {
    USER: 'user',
    ASSISTANT: 'assistant',
} as const;

export const COLORS = {
    background: {
        main: 'bg-amber-50',
        sidebar: 'bg-stone-100',
        paper: 'bg-orange-50',
    },
    message: {
        user: 'bg-amber-100 border-amber-200',
        assistant: 'bg-white border-stone-200',
    },
    accent: {
        primary: 'bg-amber-600 hover:bg-amber-700',
        secondary: 'bg-stone-600 hover:bg-stone-700',
    },
} as const;

export const ANIMATION = {
    transition: 'transition-all duration-200',
    hover: 'hover:scale-[1.02]',
} as const;