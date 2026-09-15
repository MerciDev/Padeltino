import React, { createContext, useState, useContext } from 'react';
import Button from './Button';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: '', type: 'info', customTitle: null });

  // Modify showAlert to understand 'success' or 'error' as types rather than literal titles
  const showAlert = (message, titleOrType = 'info') => {
    let type = 'info';
    let customTitle = null;

    const lowerTitle = titleOrType.toLowerCase();
    
    if (lowerTitle === 'success' || lowerTitle === 'éxito') {
      type = 'success';
    } else if (lowerTitle === 'error' || lowerTitle === 'fallo') {
      type = 'error';
    } else if (lowerTitle === 'warning' || lowerTitle === 'advertencia') {
      type = 'warning';
    } else {
      type = 'info';
      if (lowerTitle !== 'info' && lowerTitle !== 'aviso') {
        customTitle = titleOrType; // Use the provided string if it's not a standard type
      }
    }

    setAlertConfig({ isOpen: true, message, type, customTitle });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, isOpen: false }));
  };

  const renderIconAndTitle = () => {
    switch (alertConfig.type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={32} color="#10b981" />,
          title: '¡Completado con éxito!',
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.1)'
        };
      case 'error':
        return {
          icon: <XCircle size={32} color="#ef4444" />,
          title: 'Ha ocurrido un error',
          color: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.1)'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={32} color="#f59e0b" />,
          title: 'Advertencia',
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.1)'
        };
      default:
        return {
          icon: <Info size={32} color="var(--clr-primary)" />,
          title: alertConfig.customTitle || 'Aviso',
          color: 'var(--clr-primary)',
          bg: 'var(--clr-bg-alt)'
        };
    }
  };

  const styleConfig = renderIconAndTitle();

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alertConfig.isOpen && (
        <div className="modal-overlay" onClick={closeAlert} style={{ zIndex: 9999 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
            maxWidth: '400px', 
            padding: '32px 24px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: styleConfig.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              {styleConfig.icon}
            </div>
            
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 12px 0', color: 'var(--clr-text)' }}>
              {styleConfig.title}
            </h2>
            
            <p style={{ color: 'var(--clr-text-muted)', fontSize: '1rem', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              {alertConfig.message}
            </p>
            
            <Button onClick={closeAlert} style={{ width: '100%' }}>Entendido</Button>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};
