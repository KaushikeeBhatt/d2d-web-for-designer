import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('Button');

/**
 * Reusable Button component with multiple variants and states
 * @component
 * @param {Object} props - Component props
 * @param {string} props.variant - Button style variant
 * @param {string} props.size - Button size
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.fullWidth - Full width button
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Button content
 * @param {Function} props.onClick - Click handler
 */
const Button = forwardRef(({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  children,
  onClick,
  type = 'button',
  ...props
}, ref) => {
  try {
    // Base styles for all buttons
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    // Variant styles mapping
    const variantStyles = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 disabled:bg-primary-300',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100',
      outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 disabled:border-gray-200',
      ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
      success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-300'
    };
    
    // Size styles mapping
    const sizeStyles = {
      small: 'px-3 py-1.5 text-sm',
      medium: 'px-4 py-2 text-base',
      large: 'px-6 py-3 text-lg'
    };
    
    // Combine all styles
    const combinedStyles = [
      baseStyles,
      variantStyles[variant] || variantStyles.primary,
      sizeStyles[size] || sizeStyles.medium,
      fullWidth && 'w-full',
      (disabled || loading) && 'cursor-not-allowed opacity-60',
      className
    ].filter(Boolean).join(' ');
    
    /**
     * Handle button click with logging
     * @param {Event} event - Click event
     */
    const handleClick = (event) => {
      try {
        if (disabled || loading) {
          logger.debug('Button click prevented - disabled or loading');
          event.preventDefault();
          return;
        }
        
        if (onClick && typeof onClick === 'function') {
          logger.debug('Button clicked', { variant, size });
          onClick(event);
        }
      } catch (error) {
        logger.error('Error in button click handler', error);
      }
    };
    
    return (
      <button
        ref={ref}
        type={type}
        className={combinedStyles}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-busy={loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {/* Button content */}
        {children || 'Button'}
      </button>
    );
  } catch (error) {
    logger.error('Error rendering Button component', error);
    // Fallback button in case of error
    return (
      <button 
        className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
        onClick={onClick}
        type={type}
        {...props}
      >
        {children || 'Button'}
      </button>
    );
  }
});

// Display name for debugging
Button.displayName = 'Button';

// PropTypes for type checking
Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'ghost', 'danger', 'success']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset'])
};

export default Button;