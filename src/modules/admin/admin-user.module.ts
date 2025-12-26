import { Module } from '@nestjs/common';
import { UserAdminController } from './admin-user.controller';
import { UserAdminService } from './admin-user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schema/user.schema';
import { UserAdminDao } from './dao/admin.dao';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UserAdminController],
  providers: [UserAdminService, UserAdminDao],
})
export class UserAdminModule {}
