export const USER_CONSTANTS = {
  IS_ACTIVE: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    BLOCK: 'block',
    UNBLOCK: 'unblock',
    VALUES: ['active', 'inactive', 'block', 'unblock'] as const,
  },
  ADDRESS_TYPE: {
    HOME: 'home',
    WORK: 'work',
    OTHER: 'other',
    VALUES: ['home', 'work', 'other'] as const,
  },
};

export const ROLE = 'user';

export const MAX_OTP_ATTEMPTS = 5;
export const OTP_WINDOW_SECONDS = 10 * 60; // 10 minutes
