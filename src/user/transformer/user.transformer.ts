// src/user/transformers/user.transformer.ts
import { UserDocument } from '../schemas/user.schema';
import { UserData } from '../interface/user-admin-grpc.interface';

export const mapUserToUserData = (user: UserDocument): UserData => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phoneNumber || '',
  role: user.role,
  status: user.isActive ? 'active' : 'inactive',
});
