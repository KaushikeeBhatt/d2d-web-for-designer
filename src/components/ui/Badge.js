import React from 'react';
import PropTypes from 'prop-types';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('Badge');

/**
 * Reusable Badge component for labels and status indicators
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Badge content
 * @param {string} props.variant - Badge color variant
 * @param {string} props.size - Badge size
 * @param {boolean} props.rounded - Fully rounded badge
 * @param {boolean} props.removable - Show remove button
 * @param {Function} props.onRemove - Remove handler
 * @param {string} props.className - Additional CSS classes
 */
const Badge = ({
  children,
  variant = 'default',
  size = 'medium',
  rounded = false,
  removable = false,
  onRemove,
  className = '',
  ...props
}) => {
  try {
    // Base badge styles
    const baseStyles = 'inline-flex items-center font-medium transition-all duration-200';
    
    // Variant styles mapping
    const variantStyles = {
      default: 'bg-gray-100 text-gray-800',
      primary: 'bg-primary-100 text-primary-800',
      secondary: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      danger: 'bg-red-100 text-red-800',
      info: 'bg-cyan-100 text-cyan-800',
      dark: 'bg-gray-800 text-white'
    };
    
    // Size styles mapping
    const sizeStyles = {
      small: 'px-2 py-0.5 text-xs',
      medium: 'px-2.5 py-1 text-sm',
      large: 'px-3 py-1.5 text-base'
    };
    
    // Border radius styles
    const radiusStyles = rounded ? 'rounded-full' : 'rounded-md';
    
    // Combine all styles
    const badgeStyles = [
      baseStyles,
      variantStyles[variant] || variantStyles.default,
      sizeStyles[size] || sizeStyles.medium,
      radiusStyles,
      className
    ].filter(Boolean).join(' ');
    
    /**
     * Handle remove button click
     * @param {Event} event - Click event
     */
    const handleRemove = (event) => {
      try {
        event.stopPropagation();
        
        if (onRemove && typeof onRemove === 'function') {
          logger.debug('Badge remove clicked', { content: children });
          onRemove(event);
        }
      } catch (error) {
        logger.error('Error in badge remove handler', error);
      }
    };
    
    // Ensure children is renderable
    if (!children && children !== 0) {
      logger.warn('Badge rendered without content');
      return null;
    }
    
    return (
      <span 
        className={badgeStyles}
        {...props}
      >
        {/* Badge content */}
        <span className="inline-flex items-center">
          {children}
        </span>
        
        {/* Remove button */}
        {removable && (
          <button
            type="button"
            onClick={handleRemove}
            className="ml-1.5 inline-flex items-center justify-center hover:opacity-75 focus:outline-none"
            aria-label="Remove badge"
          >
            <svg
              className={size === 'small' ? 'w-3 h-3' : 'w-4 h-4'}
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </span>
    );
  } catch (error) {
    logger.error('Error rendering Badge component', error);
    // Fallback badge in case of error
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
        {children}
      </span>
    );
  }
};

/**
 * Badge Dot component for status indicators
 * @component
 * @param {Object} props - Component props
 * @param {string} props.status - Status type
 * @param {string} props.size - Dot size
 * @param {boolean} props.pulse - Enable pulse animation
 */
Badge.Dot = ({ status = 'default', size = 'medium', pulse = false, className = '', ...props }) => {
  try {
    // Status color mapping
    const statusColors = {
      default: 'bg-gray-400',
      active: 'bg-green-400',
      inactive: 'bg-gray-400',
      warning: 'bg-yellow-400',
      error: 'bg-red-400',
      success: 'bg-green-400'
    };
    
    // Size mapping
    const sizeClasses = {
      small: 'w-2 h-2',
      medium: 'w-3 h-3',
      large: 'w-4 h-4'
    };
    
    const dotStyles = [
      'inline-block rounded-full',
      statusColors[status] || statusColors.default,
      sizeClasses[size] || sizeClasses.medium,
      pulse && 'animate-pulse',
      className
    ].filter(Boolean).join(' ');
    
    return (
      <span 
        className={dotStyles}
        role="status"
        aria-label={`Status: ${status}`}
        {...props}
      />
    );
  } catch (error) {
    logger.error('Error rendering Badge.Dot', error);
    return <span className="inline-block w-3 h-3 bg-gray-400 rounded-full" />;
  }
};

// PropTypes for main Badge component
Badge.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf([
    'default', 'primary', 'secondary', 'success', 
    'warning', 'danger', 'info', 'dark'
  ]),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  rounded: PropTypes.bool,
  removable: PropTypes.bool,
  onRemove: PropTypes.func,
  className: PropTypes.string
};

// PropTypes for Badge.Dot
Badge.Dot.propTypes = {
  status: PropTypes.oneOf([
    'default', 'active', 'inactive', 
    'warning', 'error', 'success'
  ]),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  pulse: PropTypes.bool,
  className: PropTypes.string
};

// Display names for debugging
Badge.displayName = 'Badge';
Badge.Dot.displayName = 'Badge.Dot';

export default Badge;