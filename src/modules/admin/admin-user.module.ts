import { Module } from '@nestjs/common';
import { UserAdminController } from './admin-user.controller';
import { UserAdminService } from './admin-user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schema/user.schema';

@Module({
    imports:[
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers:[UserAdminController],
    providers:[UserAdminService,],
})
export class UserAdminModule{};