import { Controller, UseFilters } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UserAdminService } from './admin-user.service';
import {
  GetAllUsersRequest,
  GetAllUsersResponse,
  GetUserByIdRequest,
  GetUserByIdResponse,
  UpdateUserStatusRequest,
  UpdateUserStatusResponse,
  SearchUsersRequest,
  SearchUsersResponse,
  GetUsersByStatusRequest,
  GetUsersByStatusResponse,
  GetAllUsersWithoutPaginationRequest,
  GetAllUsersWithoutPaginationResponse,
} from '../../interface/user-admin-grpc.interface';
import { GrpcExceptionFilter } from '../../common/filters/grpc-exception.filter';
import { grpcMethods, grpcService } from '../../common/constants/admin.constant';

@Controller()
@UseFilters(new GrpcExceptionFilter())
export class UserAdminController {
  constructor(private readonly userAdminService: UserAdminService) {}

  @GrpcMethod(grpcService, grpcMethods.getAll)
  getAllUsers(data: GetAllUsersRequest): Promise<GetAllUsersResponse> {
    try {
      return this.userAdminService.getAllUsers(data);
    } catch (error) {
      throw new Error(`Error fetching all users: ${error.message}`);
    }
  }

  @GrpcMethod(grpcService, grpcMethods.getbyId)
  getUserById(data: GetUserByIdRequest): Promise<GetUserByIdResponse> {
    try {
      return this.userAdminService.getUserById(data);
    } catch (error) {
      throw new Error(`Error fetching user by ID: ${error.message}`);
    }
  }

  @GrpcMethod(grpcService, grpcMethods.update)
  updateUserStatus(data: UpdateUserStatusRequest): Promise<UpdateUserStatusResponse> {
    try {
      return this.userAdminService.updateUserStatus(data);
    } catch (error) {
      throw new Error(`Error updating user status: ${error.message}`);
    }
  }

  @GrpcMethod(grpcService, grpcMethods.unblock)
  unblockUser(data: GetUserByIdRequest): Promise<GetUserByIdResponse> {
    try {
      return this.userAdminService.unblockUser(data);
    } catch (error) {
      throw new Error(`Error unblocking user: ${error.message}`);
    }
  }

  @GrpcMethod(grpcService, grpcMethods.search)
  searchUsers(data: SearchUsersRequest): Promise<SearchUsersResponse> {
    try {
      return this.userAdminService.searchUsers(data);
    } catch (error) {
      throw new Error(`Error searching users: ${error.message}`);
    }
  }

  @GrpcMethod(grpcService, grpcMethods.getByStatus)
  getUsersByStatus(data: GetUsersByStatusRequest): Promise<GetUsersByStatusResponse> {
    try {
      return this.userAdminService.getUsersByStatus(data);
    } catch (error) {
      throw new Error(`Error fetching users by status: ${error.message}`);
    }
  }
  @GrpcMethod(grpcService, grpcMethods.getAllWithoutPagination)
  getUsersByRole(
    data: GetAllUsersWithoutPaginationRequest,
  ): Promise<GetAllUsersWithoutPaginationResponse> {
    try {
      return this.userAdminService.getAllUsersWithoutPagination();
    } catch (error) {
      throw new Error(`Error fetching users by role: ${error.message}`);
    }
  }
}
