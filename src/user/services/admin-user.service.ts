// src/user/services/user-admin.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Model } from 'mongoose';
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
  UserData,
} from '../interface/user-admin-grpc.interface';
import { mapUserToUserData } from '../transformer/user.transformer';

@Injectable()
export class UserAdminService {
  private readonly logger = new Logger(UserAdminService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async getAllUsers(
    request: GetAllUsersRequest,
  ): Promise<GetAllUsersResponse> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } =
      request;
    const skip = (page - 1) * limit;

    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      this.userModel
        .find()
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(),
    ]);

    const response: GetAllUsersResponse = {
      users: users.map(mapUserToUserData),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      success: true,
      message: 'Users fetched successfully',
    };

    this.logger.log(`Fetched ${users.length} users`);

    return response;
  }

  async getUserById(
    request: GetUserByIdRequest,
  ): Promise<GetUserByIdResponse> {
    const user = await this.userModel.findById(request.userId).exec();

    if (!user) {
      return {
        user: undefined,
        success: false,
        message: 'User not found',
      };
    }

    return {
      user: mapUserToUserData(user),
      success: true,
      message: 'User fetched successfully',
    };
  }

  async updateUserStatus(
    request: UpdateUserStatusRequest,
  ): Promise<UpdateUserStatusResponse> {
    const { userId, status } = request;
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return {
        user: undefined,
        success: false,
        message: 'User not found',
      };
    }
    user.isActive = status === 'active';
    await user.save();

    return {
      user: mapUserToUserData(user),
      success: true,
      message: `User status updated to ${status}`,
    };
  }

  async deleteUser(request: DeleteUserRequest): Promise<DeleteUserResponse> {
    const user = await this.userModel.findByIdAndDelete(request.userId).exec();

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  async searchUsers(
    request: SearchUsersRequest,
  ): Promise<SearchUsersResponse> {
    const { query = '', searchBy = 'name', limit = 10 } = request;

    const users = await this.userModel
      .find({ [searchBy]: { $regex: query, $options: 'i' } })
      .limit(limit)
      .exec();

    return {
      users: users.map(mapUserToUserData),
      total: users.length,
      success: true,
    };
  }
}
