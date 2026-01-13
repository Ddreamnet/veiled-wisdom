import { atom } from 'jotai';

/**
 * Global atom to track if a chat is currently open (mobile).
 * When true, MobileBottomNav should be hidden.
 */
export const isChatOpenAtom = atom(false);
