import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../../../schema/user.schema';
import { FilterQuery, Model } from 'mongoose';

@Injectable()
export class UserAdminDao {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async findAll(skip: number, limit: number, sortBy = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') {
    return this.userModel.find()
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countAll() {
    return this.userModel.countDocuments().exec();
  }

  async findUserById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).exec();
  }

  async updateStatus(userId: string, status: string) {
    return this.userModel.updateOne({ _id: userId }, { $set: { isActive: status } }, { runValidators: true }).exec();
  }

  async searchUsers(query: any) {
    return this.userModel.find(query).exec();
  }

// async searchUsers(filter: FilterQuery<UserDocument>, options: { limit: number; skip: number }): Promise<User[]> {
//     const effectiveLimit = Math.max(1, Math.min(options.limit, 100)); // Ensure limit is between 1 and 100
//     const effectiveSkip = Math.max(0, options.skip); // Ensure skip is non-negative
//     return this.userModel.find(filter).sort({ createdAt: -1 }).skip(effectiveSkip).limit(effectiveLimit).lean();
// }

  // ✅ Find users by status
  async findByStatus(status: 'active' | 'inactive' | 'block'): Promise<User[]> {
    return this.userModel.find({ isActive: status }).sort({ createdAt: -1 }).lean();
  }

  // ✅ Get all users without pagination
  async findAllWithoutPagination(): Promise<User[]> {
    return this.userModel.find().sort({ createdAt: -1 }).lean();
  }
}
