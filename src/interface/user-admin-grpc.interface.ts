export interface GetAllUsersRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
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
  status: string;
  reason: string;
}

export interface UpdateUserStatusResponse {
  success: boolean;
  message: string;
  user?: UserData;
}

export interface DeleteUserRequest {
  userId: string;
  reason: string;
}

export interface DeleteUserResponse {
  success: boolean;
  message: string;
}

export interface SearchUsersRequest {
  query: string;
  searchBy: string;
  limit?: number;
}

export interface SearchUsersResponse {
  users: UserData[];
  total: number;
  success: boolean;
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