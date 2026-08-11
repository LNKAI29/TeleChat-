// Security management for App Lock and Chat Lock (WhatsApp style)

const APP_LOCK_KEY = "telechat:security:app_lock";
const APP_PIN_KEY = "telechat:security:pin";
const LOCKED_CHATS_KEY = "telechat:security:locked_chats";

export type SecurityState = {
  isAppLockEnabled: boolean;
  pin: string | null;
  lockedChatIds: string[];
};

export function getSecurityState(): SecurityState {
  if (typeof window === "undefined") {
    return { isAppLockEnabled: false, pin: null, lockedChatIds: [] };
  }
  try {
    const isAppLockEnabled = window.localStorage.getItem(APP_LOCK_KEY) === "true";
    const pin = window.localStorage.getItem(APP_PIN_KEY);
    const rawLocked = window.localStorage.getItem(LOCKED_CHATS_KEY);
    const lockedChatIds: string[] = rawLocked ? JSON.parse(rawLocked) : [];
    return { isAppLockEnabled, pin, lockedChatIds };
  } catch {
    return { isAppLockEnabled: false, pin: null, lockedChatIds: [] };
  }
}

export function setAppLockEnabled(enabled: boolean, pin?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APP_LOCK_KEY, enabled ? "true" : "false");
  if (pin) {
    window.localStorage.setItem(APP_PIN_KEY, pin);
  }
}

export function setPin(pin: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APP_PIN_KEY, pin);
}

export function toggleChatLock(chatId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const state = getSecurityState();
    let nextLocked: string[];
    let isNowLocked = false;
    if (state.lockedChatIds.includes(chatId)) {
      nextLocked = state.lockedChatIds.filter((id) => id !== chatId);
      isNowLocked = false;
    } else {
      nextLocked = [...state.lockedChatIds, chatId];
      isNowLocked = true;
    }
    window.localStorage.setItem(LOCKED_CHATS_KEY, JSON.stringify(nextLocked));
    return isNowLocked;
  } catch {
    return false;
  }
}

export function isChatLocked(chatId: string): boolean {
  const state = getSecurityState();
  return state.lockedChatIds.includes(chatId);
}
