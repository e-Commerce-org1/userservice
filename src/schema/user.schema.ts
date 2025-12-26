import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { USER_CONSTANTS } from 'src/common/constants/user.constant';

export type UserDocument = User &
  Document & {
    _id: Types.ObjectId;
  };

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({
    type: String,
    enum: USER_CONSTANTS.IS_ACTIVE.VALUES,
    default: USER_CONSTANTS.IS_ACTIVE.INACTIVE,
  })
  isActive: string;

  @Prop({ type: String })
  phoneNumber: string;

  @Prop()
  deviceId: string;
  @Prop({
    type: [
      {
        name: { type: String, required: true },
        phoneNumber: { type: String, required: true, unique: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true },
        postalCode: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
        addressType: {
          type: String,
          enum: USER_CONSTANTS.ADDRESS_TYPE.VALUES,
          default: USER_CONSTANTS.ADDRESS_TYPE.HOME,
        },
      },
    ],
    default: [],
  })
  addresses: Array<{
    _id?: Types.ObjectId;
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    isDefault?: boolean;
    addressType?: string;
  }>;
}

export const UserSchema = SchemaFactory.createForClass(User);
