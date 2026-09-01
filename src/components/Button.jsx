import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  full = false,
  className = '',
  ...props
}) => {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant] || 'btn-primary';

  const sizeClass = { sm: 'btn-sm', md: '', lg: 'btn-lg' }[size] || '';
  const fullClass = full ? 'btn-full' : '';

  return (
    <button className={`btn ${variantClass} ${sizeClass} ${fullClass} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
