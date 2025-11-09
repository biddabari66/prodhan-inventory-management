
import Employees from './Employees';

/**
 * This file acts as a compatibility layer to resolve case-sensitivity import errors.
 * Some parts of the system may be incorrectly trying to import 'pages/employees' (lowercase)
 * instead of 'pages/Employees' (uppercase). This file catches the incorrect import and
 * correctly exports the 'Employees' component, fixing potential build errors.
 */
export default Employees;
