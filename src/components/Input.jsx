import React from 'react';

const Input = ({ label, className = '', style, ...props }) => (
  <div className={`form-group ${className}`} style={style}>
    {label && <label className="form-label">{label}</label>}
    <input className="form-input" {...props} />
  </div>
);

export default Input;
