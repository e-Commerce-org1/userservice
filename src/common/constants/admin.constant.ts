export const packageName = 'useradmin';

export const grpcService = 'UserAdminGrpcService';

export const grpcMethods = {
  getAll: 'GetAllUsers',

  getbyId: 'GetUserById',

  update: 'UpdateUserStatus',

  delete: 'DeleteUser',

  unblock: 'UnblockUser',

  search: 'SearchUsers',

  getByStatus: 'GetUsersByStatus',

  getAllWithoutPagination: 'GetAllUsersWithoutPagination',

  AddAddress: 'AddAddress',

  GetUserAddresses: 'GetUserAddresses',

  UpdateAddress: 'UpdateAddress',

  deleteAddress: 'DeleteAddress',
};
