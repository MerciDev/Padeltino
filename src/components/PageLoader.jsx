import React from 'react';
import { Loader2 } from 'lucide-react';

const PageLoader = ({ message = 'Cargando...', submessage = 'Por favor, espera un momento' }) => {
  return (
    <div style={{
      width: '100%',
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="page-loader-container">
        <div className="loader-icon-wrapper">
          <div className="loader-icon-pulse"></div>
          <div className="loader-icon-inner">
            <Loader2 size={40} className="spin" />
          </div>
        </div>
        
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', color: 'var(--clr-text)', fontWeight: '600' }}>{message}</h3>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--clr-text-muted)' }}>{submessage}</p>
      </div>
    </div>
  );
};

export default PageLoader;
