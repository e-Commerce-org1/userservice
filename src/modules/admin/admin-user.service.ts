import { Injectable } from '@nestjs/common';
import { UserAdminDao } from './dao/admin.dao';
import {
  GetAllUsersRequest,
  GetAllUsersResponse,
  GetUserByIdRequest,
  GetUserByIdResponse,
  UpdateUserStatusRequest,
  UpdateUserStatusResponse,
  SearchUsersRequest,
  SearchUsersResponse,
  UnblockUserRequest,
  UnblockUserResponse,
} from '../../interface/user-admin-grpc.interface';
import { mapUserToUserData } from '../../transformer/user.transformer';
import { RESPONSE_MESSAGES } from '../../common/constants/user-messages';
import { logger } from '../../common/logger';
import { CustomException } from '../../common/exceptions/user.exceptions';

@Injectable()
export class UserAdminService {
  constructor(private readonly userAdminDao: UserAdminDao) {}

  async getAllUsers(request: GetAllUsersRequest): Promise<GetAllUsersResponse> {
    const page = Number(request.page) || 1;
    const limit = Number(request.limit) || 10;
    const skip = (page - 1) * limit;

    try {
      const [users, total] = await Promise.all([
        this.userAdminDao.findAll(skip, limit),
        this.userAdminDao.countAll(),
      ]);

      logger.log({ level: 'info', message: `Fetched ${users.length} users` });

      return {
        users: users.map(mapUserToUserData),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        success: true,
        message: RESPONSE_MESSAGES.USER_FETCHED,
      };
    } catch (error) {
      logger.error(`Error fetching users: ${error.message}`);
      return {
        users: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        success: false,
        message: RESPONSE_MESSAGES.ERROR_FETCHING_USERS,
      };
    }
  }

  async getUserById(request: GetUserByIdRequest): Promise<GetUserByIdResponse> {
    try {
      const user = await this.userAdminDao.findUserById(request.userId);
      if (!user) {
        return {
          user: undefined,
          success: false,
          message: RESPONSE_MESSAGES.USER_NOT_FOUND,
        };
      }

      return {
        user: mapUserToUserData(user),
        success: true,
        message: RESPONSE_MESSAGES.INDIVIDUAL_USER_FETCHED,
      };
    } catch (error) {
      logger.error(`Error fetching user by ID ${request.userId}: ${error.message}`);
      return {
        user: undefined,
        success: false,
        message: RESPONSE_MESSAGES.ERROR_FETCHING_USER,
      };
    }
  }

  async updateUserStatus(request: UpdateUserStatusRequest): Promise<UpdateUserStatusResponse> {
    try {
      const user = await this.userAdminDao.findUserById(request.userId);
      if (!user) {
        return {
          success: false,
          message: RESPONSE_MESSAGES.USER_NOT_FOUND,
        };
      }

      await this.userAdminDao.updateStatus(request.userId, 'block');

      return {
        success: true,
        message: RESPONSE_MESSAGES.STATUS_UPDATED,
      };
    } catch (error) {
      logger.error(`Error updating user status for ID ${request.userId}: ${error.message}`);
      return {
        success: false,
        message: RESPONSE_MESSAGES.ERROR_UPDATING_STATUS,
      };
    }
  }

  async unblockUser(request: UnblockUserRequest): Promise<UnblockUserResponse> {
    try {
      const user = await this.userAdminDao.findUserById(request.userId);
      if (!user) {
        return {
          success: false,
          message: RESPONSE_MESSAGES.USER_NOT_FOUND,
        };
      }

      if (user.isActive !== 'block') {
        return {
          success: false,
          message: RESPONSE_MESSAGES.USER_NOT_BLOCKED,
        };
      }

      await this.userAdminDao.updateStatus(request.userId, 'inactive');

      return {
        success: true,
        message: RESPONSE_MESSAGES.USER_UNBLOCKED_SUCCESSFULLY,
      };
    } catch (error) {
      logger.error(`Error unblocking user ID ${request.userId}: ${error.message}`);
      return {
        success: false,
        message: RESPONSE_MESSAGES.ERROR_UNBLOCKING_USER,
      };
    }
  }

  async searchUsers(request: SearchUsersRequest): Promise<SearchUsersResponse> {
    const { query = '', limit = 10, status } = request;
    try {
      const searchConditions = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phoneNumber: { $regex: query, $options: 'i' } },
      ];

      const finalQuery: any = { $or: searchConditions };
      if (status !== undefined) finalQuery.isActive = status === 'active';

      const users = await this.userAdminDao.searchUsers(finalQuery, limit);

      return {
        users: users.map(mapUserToUserData),
        total: users.length,
        success: true,
      };
    } catch (error) {
      logger.error(`Error searching users with query "${query}": ${error.message}`);
      return {
        users: [],
        total: 0,
        success: false,
      };
    }
  }
}
