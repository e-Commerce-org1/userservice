import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../schema/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';
import { CreateAddressDto } from '../dto/create-address.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';

@Injectable()
export class UserDao {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findUserByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  async findUserById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId);
  }

  async findUserByIdWithoutPassword(userId: string): Promise<any> {
    return this.userModel.findById(userId).select('-password');
  }

  async createUser(
    userData: CreateUserDto & { password: string; isVerified: boolean },
  ): Promise<UserDocument> {
    const createdUser = new this.userModel(userData);
    return createdUser.save();
  }

  async createGoogleUser(googleUserData: {
    email: string;
    name: string;
    isVerified: boolean;
    provider: string;
  }): Promise<UserDocument> {
    const user = new this.userModel(googleUserData);
    return user.save();
  }

  async updateUserVerificationStatus(
    userId: string,
    isVerified: boolean,
  ): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, { isVerified }, { new: true });
  }

  async updateUserActiveStatus(userId: string, isActive: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, { isActive }, { new: true });
  }

  async updateUserDeviceId(userId: string, deviceId: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, { deviceId }, { new: true });
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
  }

  async addUserAddress(user: UserDocument, addressData: CreateAddressDto): Promise<UserDocument> {
    if (addressData.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }
    user.addresses.push(addressData);
    return user.save();
  }

  async updateUserAddress(
    user: UserDocument,
    addressIndex: number,
    updateData: UpdateAddressDto,
  ): Promise<UserDocument> {
    if (updateData.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }
    Object.assign(user.addresses[addressIndex], updateData);
    return user.save();
  }

  async deleteUserAddress(user: UserDocument, addressIndex: number): Promise<UserDocument> {
    user.addresses.splice(addressIndex, 1);
    return user.save();
  }

  findAddressIndex(user: UserDocument, addressId: string): number {
    return user.addresses.findIndex((addr) => addr._id?.toString() === addressId);
  }

  async findByIdAndUpdateWithoutPassword(
    userId: string,
    updateData: Partial<User>,
  ): Promise<UserDocument | null> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: updateData }, { new: true })
      .select('-password')
      .exec();

    return user as UserDocument | null;
  }
}
