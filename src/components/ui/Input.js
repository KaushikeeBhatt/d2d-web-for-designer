import React, { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('Input');

/**
 * Reusable Input component with validation and error handling
 * @component
 * @param {Object} props - Component props
 * @param {string} props.type - Input type
 * @param {string} props.label - Input label
 * @param {string} props.placeholder - Input placeholder
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.error - Error message
 * @param {boolean} props.required - Required field
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.size - Input size variant
 * @param {React.ReactNode} props.leftIcon - Icon on the left
 * @param {React.ReactNode} props.rightIcon - Icon on the right
 * @param {string} props.className - Additional CSS classes
 */
const Input = forwardRef(({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  size = 'medium',
  leftIcon,
  rightIcon,
  className = '',
  id,
  name,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  
  try {
    // Generate unique ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    // Base input styles
    const baseStyles = 'block w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2';
    
    // Size variants
    const sizeStyles = {
      small: 'px-3 py-1.5 text-sm',
      medium: 'px-4 py-2 text-base',
      large: 'px-5 py-3 text-lg'
    };
    
    // State-based styles
    const stateStyles = error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200';
    
    // Icon padding adjustments
    const iconPadding = [
      leftIcon && 'pl-10',
      rightIcon && 'pr-10'
    ].filter(Boolean).join(' ');
    
    // Combine all input styles
    const inputStyles = [
      baseStyles,
      sizeStyles[size] || sizeStyles.medium,
      stateStyles,
      iconPadding,
      disabled && 'bg-gray-50 cursor-not-allowed opacity-60',
      className
    ].filter(Boolean).join(' ');
    
    /**
     * Handle input change with validation
     * @param {Event} event - Change event
     */
    const handleChange = (event) => {
      try {
        const newValue = event.target.value;
        
        // Basic validation logging
        if (required && !newValue) {
          logger.debug('Required field is empty', { name: name || inputId });
        }
        
        if (onChange && typeof onChange === 'function') {
          onChange(event);
        }
      } catch (error) {
        logger.error('Error in input change handler', error);
      }
    };
    
    /**
     * Handle focus events
     * @param {boolean} focused - Focus state
     */
    const handleFocus = (focused) => {
      try {
        setIsFocused(focused);
        logger.debug(`Input ${focused ? 'focused' : 'blurred'}`, { 
          name: name || inputId 
        });
      } catch (error) {
        logger.error('Error handling focus', error);
      }
    };
    
    return (
      <div className="relative">
        {/* Label */}
        {label && (
          <label 
            htmlFor={inputId}
            className={`block mb-1 text-sm font-medium ${
              error ? 'text-red-700' : 'text-gray-700'
            }`}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">
                {leftIcon}
              </span>
            </div>
          )}
          
          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            value={value}
            onChange={handleChange}
            onFocus={() => handleFocus(true)}
            onBlur={() => handleFocus(false)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={inputStyles}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
          
          {/* Right icon */}
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <span className="text-gray-500">
                {rightIcon}
              </span>
            </div>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <p 
            id={`${inputId}-error`}
            className="mt-1 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  } catch (error) {
    logger.error('Error rendering Input component', error);
    // Fallback input in case of error
    return (
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="px-4 py-2 border border-gray-300 rounded-lg w-full"
        {...props}
      />
    );
  }
});

// Display name for debugging
Input.displayName = 'Input';

// PropTypes for type checking
Input.propTypes = {
  type: PropTypes.oneOf([
    'text', 'email', 'password', 'number', 'tel', 
    'url', 'search', 'date', 'time', 'datetime-local'
  ]),
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  error: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  leftIcon: PropTypes.node,
  rightIcon: PropTypes.node,
  className: PropTypes.string,
  id: PropTypes.string,
  name: PropTypes.string
};

export default Input;