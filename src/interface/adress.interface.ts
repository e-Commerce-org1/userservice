import { CreateAddressDto } from "src/modules/user/dto/create-address.dto";
import { UpdateAddressDto } from "src/modules/user/dto/update-address.dto";

export interface AddAddressRequest {
  userId: string;
  address: CreateAddressDto;
}

export interface GetUserAddressesRequest {
  userId: string;
}

export interface UpdateAddressRequest {
  userId: string;
  addressId: string;
  address: UpdateAddressDto;
}

export interface DeleteAddressRequest {
  userId: string;
  addressId: string;
}

export interface AddAddressResponse {
  addressId: string;
  message: string;
}

export interface GetUserAddressesResponse {
  addresses: Address[];
}

export interface UpdateAddressResponse {
  addressId: string;
  message: string;
}

export interface DeleteAddressResponse {
  message: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
  addressType?: string;
}