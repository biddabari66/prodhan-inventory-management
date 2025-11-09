
import PerformanceHub from './PerformanceHub';

/**
 * This file acts as a compatibility layer to resolve routing errors.
 * The system router expects a kebab-case page name ('performance-hub'), 
 * while the component is defined in PascalCase ('PerformanceHub').
 * This file bridges that gap, ensuring notifications and links work correctly.
 */
export default PerformanceHub;
