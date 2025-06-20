import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { EmailModule } from '../../provider/email/email.module';
import { RedisModule } from '../../provider/redis/redis.module';
import { AuthGuard } from '../../middleware/auth.guard';
import { GoogleStrategy } from '../../middleware/google.strategy';
import { UserDao } from './dao/user.dao';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schema/user.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            protoPath: join(__dirname, '../../proto/auth.proto'),
            url: configService.get<string>('AUTH_SERVICE_URL'),
          },
        }),
        inject: [ConfigService],
      },
    ]),

    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    EmailModule,
    RedisModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserDao, AuthGuard, GoogleStrategy],
})
export class UserModule {}
