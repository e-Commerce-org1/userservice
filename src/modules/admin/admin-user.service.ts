import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../../schema/user.schema';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  GetAllUsersRequest,
  GetAllUsersResponse,
  GetUserByIdRequest,
  GetUserByIdResponse,
  UpdateUserStatusRequest,
  UpdateUserStatusResponse,
  SearchUsersRequest,
  SearchUsersResponse,
  UserData,
  UnblockUserResponse,
  UnblockUserRequest,
} from '../../interface/user-admin-grpc.interface';
import { mapUserToUserData } from '../../transformer/user.transformer';
import { RESPONSE_MESSAGES } from '../../common/constants/user-messages';

@Injectable()
export class UserAdminService {
  private readonly logger = new Logger(UserAdminService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async getAllUsers(
    request: GetAllUsersRequest,
  ): Promise<GetAllUsersResponse> {
    try{
    const page = Number(request.page) || 1;
    const limit = Number(request.limit) || 10;
    const sortBy = request.sortBy || 'createdAt';
    const sortOrder = request.sortOrder || 'desc';
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
      message: RESPONSE_MESSAGES.USER_FETCHED,
    };

    this.logger.log(`Fetched ${users.length} users`);

    return response;
    }
    catch (error) {
      this.logger.error('Error fetching users', error);
      return {
        users: [],
        total: 0,
        page: request.page || 1,
        limit: request.limit || 10,
        totalPages: 0,
        success: false,
        message: RESPONSE_MESSAGES.ERROR_FETCHING_USERS,
      };
    }
    
  }

  async getUserById(
    request: GetUserByIdRequest,
  ): Promise<GetUserByIdResponse> {
    try{
      const user = await this.userModel.findById(request.userId).exec();

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
    }
    catch (error) {
      this.logger.error(`Error fetching user by ID ${request.userId}`, error);
      return {
        user: undefined,
        success: false,
        message: RESPONSE_MESSAGES.ERROR_FETCHING_USER,
      };
    }
    
  }

  async updateUserStatus(
    request: UpdateUserStatusRequest,
  ): Promise<UpdateUserStatusResponse> {
    try{
      const { userId, status } = request;
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return {
        user: undefined,
        success: false,
        message: RESPONSE_MESSAGES.USER_NOT_FOUND,
      };
    }
    user.isActive = status;
    await user.save();

    return {
      user: mapUserToUserData(user),
      success: true,
     message:RESPONSE_MESSAGES.STATUS_UPDATED,
    };
    }
    catch (error) {
      this.logger.error(`Error updating user status for ID ${request.userId}`, error);
      return {
        user: undefined,
        success: false,
        message: RESPONSE_MESSAGES.ERROR_UPDATING_STATUS,
      };
    }
    
  }

//   async searchUsers(
//     request: SearchUsersRequest,
//   ): Promise<SearchUsersResponse> {
//     try{
//       const { query = '', searchBy = 'name', limit = 10 } = request;

//     const users = await this.userModel
//       .find({ [searchBy]: { $regex: query, $options: 'i' } })
//       .limit(limit)
//       .exec();

//     return {
//       users: users.map(mapUserToUserData),
//       total: users.length,
//       success: true,
//     };
//     }
//     catch (error) {
//       this.logger.error(`Error searching users with query "${request.query}"`, error);
//       return {
//         users: [],
//         total: 0,
//         success: false
//       };
//     }
//   }
// }

async unblockUser(request:UnblockUserRequest): Promise<UnblockUserResponse> {
  try {
    const user = await this.userModel.findById(request.userId).exec();

    if (!user) {
      return {
        user: undefined,
        success: false,
        message: RESPONSE_MESSAGES.USER_NOT_FOUND,
      };
    }

    if (user.isActive !== 'block') {
      return {
        user: mapUserToUserData(user),
        success: false,
        message: RESPONSE_MESSAGES.USER_NOT_BLOCKED,
      };
    }

    user.isActive = 'inactive'; // Set to inactive when unblocking
    await user.save();

    return {
      user: mapUserToUserData(user),
      success: true,
      message: RESPONSE_MESSAGES.USER_UNBLOCKED_SUCCESSFULLY,
    };
  } catch (error) {
    this.logger.error(`Error unblocking user ID ${request.userId}`, error);
    return {
      user: undefined,
      success: false,
      message: RESPONSE_MESSAGES.ERROR_UNBLOCKING_USER,
    };
  }
}


async searchUsers(request: SearchUsersRequest): Promise<SearchUsersResponse> {
  try {
    const { query = '', limit = 10, status } = request;

    // Build dynamic OR condition for query match
    const searchConditions = [
      { name: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
      { phoneNumber: { $regex: query, $options: 'i' } },
    ];

    const finalQuery: any = { $or: searchConditions };

    // If status is provided (e.g. active/inactive/block), filter by isActive
    if (status !== undefined) {
      // Assuming: active = true, inactive = false, block = false (example)
      // You can customize this logic if you store status differently
      finalQuery.isActive = status === 'active';
    }

    const users = await this.userModel.find(finalQuery).limit(Number(limit)).exec();

    return {
      users: users.map(mapUserToUserData),
      total: users.length,
      success: true,
    };
  } catch (error) {
    this.logger.error(`Error searching users with query "${request.query}"`, error);
    return {
      users: [],
      total: 0,
      success: false,
    };
  }
}
}