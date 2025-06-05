import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { UserService } from '../services/user.service';
import { UserController } from '../controllers/user.controller';
import { User, UserSchema } from '../schemas/user.schema';
import { EmailModule } from '../provider/email/email.module';
import { RedisModule } from '../provider/redis/redis.module';
import { AuthGuard } from '../middleware/auth.guard';
import { UserAdminController } from '../controllers/admin-user.controller';
import { UserAdminService } from '../services/admin-user.service';
import { GoogleStrategy } from '../middleware/google.strategy';
import { UserDao } from '../dao/user.dao';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            protoPath: join(__dirname, '../../proto/auth.proto'),
            url: configService.get<string>('AUTH_SERVICE_URL') || '172.50.3.60:5051',
          },
        }),
        inject: [ConfigService],
      },
    ]),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),

    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),
    EmailModule,
    RedisModule,
  ],
  controllers: [UserController,UserAdminController],
  providers: [UserService,UserDao,UserAdminService, AuthGuard,GoogleStrategy],
})
export class UserModule {}
