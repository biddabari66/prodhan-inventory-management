import { defineEntity, erp } from '../api/erpClient';

// The User entity exposes both the standard CRUD methods (list/filter/get/...)
// and the auth helpers (me/login/logout/...) so legacy code that calls
// User.me() / User.logout() keeps working.
export const User = {
  ...defineEntity('User'),
  me: erp.auth.me,
  login: erp.auth.login,
  logout: erp.auth.logout,
  changePassword: erp.auth.changePassword,
  redirectToLogin: erp.auth.redirectToLogin,
};
