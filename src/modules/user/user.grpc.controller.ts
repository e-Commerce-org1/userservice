import { Controller, UseFilters } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UserService } from './user.service';
import { logger } from '../../common/logger';
import { GrpcExceptionFilter } from '../../common/filters/grpc-exception.filter';
import { grpcMethods, grpcService } from '../../common/constants/admin.constant';
import {AddAddressRequest,GetUserAddressesRequest,UpdateAddressRequest,DeleteAddressRequest} from '../../interface/adress.interface'


@Controller()
@UseFilters(new GrpcExceptionFilter())
export class AddressController {
  constructor(private readonly userService: UserService) {}

  @GrpcMethod(grpcService, grpcMethods.AddAddress)
  async addAddress(data: AddAddressRequest) {
    try {
      const result = await this.userService.addAddress(data.userId, data.address);
      return {
        addressId: {result},
        message: 'Address added successfully',
      };
    } catch (error) {
      logger.error(`AddAddress failed: ${error.message}`, { data, error });
      throw error;
    }
  }

  @GrpcMethod(grpcService, grpcMethods.GetUserAddresses)
  async getUserAddresses(data: GetUserAddressesRequest) {
    try {
      const addresses = await this.userService.getUserAddresses(data.userId);
      return { addresses };
    } catch (error) {
      logger.error(`GetUserAddresses failed: ${error.message}`, { data, error });
      throw error;
    }
  }

  @GrpcMethod(grpcService, grpcMethods.UpdateAddress)
  async updateAddress(data:UpdateAddressRequest) {
    try {
      const updatedId = await this.userService.updateAddress(data.userId, data.addressId, data.address);
      return {
        addressId: updatedId,
        message: 'Address updated successfully',
      };
    } catch (error) {
      logger.error(`UpdateAddress failed: ${error.message}`, { data, error });
      throw error;
    }
  }

  @GrpcMethod(grpcService, grpcMethods.deleteAddress)
  async deleteAddress(data:DeleteAddressRequest) {
    try {
      await this.userService.deleteAddress(data.userId, data.addressId);
      return {
        message: 'Address deleted successfully',
      };
    } catch (error) {
      logger.error(`DeleteAddress failed: ${error.message}`, { data, error });
      throw error;
    }
  }
}
