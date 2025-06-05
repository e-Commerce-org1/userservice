// src/common/constants/response-messages.constants.ts
export const RESPONSE_MESSAGES = {
  // User Authentication Messages
  USER_REGISTERED_SUCCESS:
    'User registered successfully! Please check your email for verification.',
  EMAIL_VERIFIED_SUCCESS: 'Email verified successfully',
  VERIFICATION_EMAIL_SENT: 'Verification email sent successfully',
  LOGIN_SUCCESS: 'User logged in successfully',
  LOGOUT_SUCCESS: 'User logged out successfully',
  PASSWORD_CHANGED_SUCCESS: 'Password changed successfully',
  PASSWORD_RESET_OTP_SENT: 'Password reset OTP sent to your email',
  OTP_VERIFIED_SUCCESS: 'OTP verified successfully',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully',

  // User Profile Messages
  PROFILE_RETRIEVED_SUCCESS: 'User profile retrieved successfully',

  // Address Messages
  ADDRESS_ADDED_SUCCESS: 'Address added successfully',
  ADDRESS_UPDATED_SUCCESS: 'Address updated successfully',
  ADDRESS_DELETED_SUCCESS: 'Address deleted successfully',
  ADDRESSES_RETRIEVED_SUCCESS: 'Addresses retrieved successfully',
  ADDRESSES_RETRIEVAL_FAILED: 'Failed to retrieve addresses',

  //admin messages
  USER_FETCHED : 'Users fetched successfully',
  INDIVIDUAL_USER_FETCHED:'User fetched successfully',
  STATUS_UPDATED:'User status updated',
  DELETE_USER:'User deleted successfully',
  // Error Messages
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid credentials',
  EMAIL_NOT_VERIFIED: 'Email not verified',
  USER_BLOCKED:'User is blocked by admin',
  INVALID_VERIFICATION_TOKEN: 'Invalid verification token',
  USER_ALREADY_VERIFIED: 'User is already verified',
  INVALID_OTP: 'Invalid OTP',
  INVALID_RESET_TOKEN: 'Invalid reset token',
  INVALID_TOKEN: 'Invalid token',
  ADDRESS_NOT_FOUND: 'Address not found',
  SIGNUP_FAILED: 'Signup failed',
  LOGOUT_FAILED: 'Logout failed',
  PASSWORD_RESET_FAILED: 'Password reset failed',
  EMAIL_VERIFICATION_FAILED: 'Email verification failed',
  PASSWORD_CHANGE_FAILED: 'Password change failed',
  OTP_VERIFICATION_FAILED: 'OTP verification failed',
  ADDRESS_CREATION_FAILED: 'Address creation failed',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long',
  ADDRESS_DELETED_FAILED:'address delete failed',
  DATA_REQIRED:'User ID and token are required',
  FILL_EMAIL : 'email is required',
  ERROR_FETCHING_USERS: 'Error fetching users',
  ERROR_FETCHING_USER: 'Error fetching user',
  ERROR_UPDATING_STATUS: 'Error updating user status',
};
