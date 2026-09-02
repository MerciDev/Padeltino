import React, { createContext, useState, useContext } from 'react';
import Button from './Button';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: '', title: '' });

  const showAlert = (message, title = 'Aviso') => {
    setAlertConfig({ isOpen: true, message, title });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alertConfig.isOpen && (
        <div className="modal-overlay" onClick={closeAlert} style={{ zIndex: 9999 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: 'var(--clr-text)' }}>
              {alertConfig.title}
            </h2>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: '1rem', marginBottom: '24px', lineHeight: 1.5 }}>
              {alertConfig.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={closeAlert}>Entendido</Button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};
