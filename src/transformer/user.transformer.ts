import { UserDocument } from '../schema/user.schema';
import { UserData } from '../interface/user-admin-grpc.interface';
import { ROLE } from 'src/common/constants/user.constant';

export const mapUserToUserData = (user: UserDocument): UserData => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phoneNumber || '',
  role: ROLE,
  status: user.isActive,
});
