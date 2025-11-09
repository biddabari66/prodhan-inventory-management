
import Expenses from './Expenses';

/**
 * This file acts as a compatibility layer to resolve case-sensitivity import errors.
 * Some parts of the system may be incorrectly trying to import 'pages/expenses' (lowercase)
 * instead of 'pages/Expenses' (uppercase'. This file catches the incorrect import and
 * correctly exports the 'Expenses' component, fixing potential build errors.
 */
export default Expenses;
