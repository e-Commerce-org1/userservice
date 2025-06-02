import { Module } from '@nestjs/common';
import { UserModule } from './user/modules/user.module';

@Module({
  imports: [UserModule],
})
export class AppModule {}
