import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { UserService } from '../services/user.service';
import { UserController } from '../controllers/user.controller';
import { User, UserSchema } from '../schemas/user.schema';
//import { Address, AddressSchema } from './schemas/address.schema';
import { EmailModule } from '../provider/email/email.module';
import { RedisModule } from '../provider/redis/redis.module';
import { AuthGuard } from '../middleware/auth.guard';
import { UserAdminController } from '../controllers/admin-user.controller';
import { UserAdminService } from '../services/admin-user.service';
import { GoogleStrategy } from '../middleware/google.strategy';

@Module({
  imports: [
    ConfigModule.forRoot(),

    // gRPC client for AuthService
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            protoPath: join(__dirname, '../../proto/auth.proto'),
            url: configService.get<string>('AUTH_SERVICE_URL') || '0.0.0.0:5051',
          },
        }),
        inject: [ConfigService],
      },
    ]),
    
    // Connect once using the shared DB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'), // shared DB
      }),
      inject: [ConfigService],
    }),

    // Register both schemas in the same DB
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      //   { name: Address.name, schema: AddressSchema },
    ]),
    EmailModule,
    RedisModule,
  ],
  controllers: [UserController,UserAdminController],
  providers: [UserService,UserAdminService, AuthGuard,GoogleStrategy],
})
export class UserModule {}
