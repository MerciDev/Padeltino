import React from 'react';

const Input = ({ label, className = '', ...props }) => (
  <div className={`form-group ${className}`}>
    {label && <label className="form-label">{label}</label>}
    <input className="form-input" {...props} />
  </div>
);

export default Input;
