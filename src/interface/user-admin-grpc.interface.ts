export interface GetAllUsersRequest {
  page?: number;
  limit?: number;
}

export interface GetAllUsersResponse {
  users: UserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  success: boolean;
  message: string;
}

export interface GetUserByIdRequest {
  userId: string;
}

export interface GetUserByIdResponse {
  user?: UserData;
  success: boolean;
  message: string;
}

export interface UpdateUserStatusRequest {
  userId: string;
}

export interface UpdateUserStatusResponse {
  success: boolean;
  message: string;
}

export interface SearchUsersRequest {
  query: string;
  // page: number;
  // limit: number;
}

export interface SearchUsersResponse {
  users: UserData[];
  success: boolean;
  message: string;
}
export interface GetUsersByStatusRequest {
  status: 'active' | 'inactive' | 'block';
}
export interface GetUsersByStatusResponse {
  users: UserData[];
  success: boolean;
  message: string;
}
export interface GetAllUsersWithoutPaginationRequest {}
export interface GetAllUsersWithoutPaginationResponse {
  users: UserData[];
  success: boolean;
  message: string;
}

export interface UnblockUserRequest {
  userId: string;
}

export interface UnblockUserResponse {
  success: boolean;
  message: string;
}

export interface UserData {
  id: string;
  email: string;
  name: string;
  phone: string;
  status: string;
  role: string;
  //  createdAt: string;
  // updatedAt: string;
}
