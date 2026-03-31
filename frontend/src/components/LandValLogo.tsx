import React from 'react';

const LandValLogo: React.FC<{ size?: number }>= ({ size = 36 }) => (
  <div style={{ width: size, height: size, background: '#176a4a', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px #0002' }}>
    <i className="fas fa-map-marked-alt" style={{ color: 'white', fontSize: size * 0.65 }}></i>
  </div>
);

export default LandValLogo;
