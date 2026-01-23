import React from 'react';
import SupportBot from '../components/SupportBot';
import '../css/SupportPage.css';

const SupportPage: React.FC = () => {
  return (
    <div className="support-page">
      <div className="support-page-container">
        <SupportBot />
      </div>
    </div>
  );
};

export default SupportPage;
