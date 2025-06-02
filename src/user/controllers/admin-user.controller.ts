// src/user/controllers/user-admin.controller.ts
import { Controller, UseFilters } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UserAdminService } from '../services/admin-user.service';
import {
  GetAllUsersRequest,
  GetAllUsersResponse,
  GetUserByIdRequest,
  GetUserByIdResponse,
  UpdateUserStatusRequest,
  UpdateUserStatusResponse,
  DeleteUserRequest,
  DeleteUserResponse,
  SearchUsersRequest,
  SearchUsersResponse,
} from '../interface/user-admin-grpc.interface';
import { GrpcExceptionFilter } from '../common/filters/grpc-exception.filter';

@Controller()
@UseFilters(new GrpcExceptionFilter())
export class UserAdminController {
  constructor(private readonly userAdminService: UserAdminService) {}

  @GrpcMethod('UserAdminGrpcService', 'GetAllUsers')
  getAllUsers(data: GetAllUsersRequest): Promise<GetAllUsersResponse> {
    return this.userAdminService.getAllUsers(data);
  }

  @GrpcMethod('UserAdminGrpcService', 'GetUserById')
  getUserById(data: GetUserByIdRequest): Promise<GetUserByIdResponse> {
    return this.userAdminService.getUserById(data);
  }

  @GrpcMethod('UserAdminGrpcService', 'UpdateUserStatus')
  updateUserStatus(
    data: UpdateUserStatusRequest,
  ): Promise<UpdateUserStatusResponse> {
    return this.userAdminService.updateUserStatus(data);
  }

  @GrpcMethod('UserAdminGrpcService', 'DeleteUser')
  deleteUser(data: DeleteUserRequest): Promise<DeleteUserResponse> {
    return this.userAdminService.deleteUser(data);
  }

  @GrpcMethod('UserAdminGrpcService', 'SearchUsers')
  searchUsers(data: SearchUsersRequest): Promise<SearchUsersResponse> {
    return this.userAdminService.searchUsers(data);
  }
}
