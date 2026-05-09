import React from 'react';
import TutorialsTab from '../components/TutorialsTab';
import '../css/TutorialsPage.css';

const TutorialsPage: React.FC = () => {
  return (
    <div className="tutorials-page">
      <div className="tutorials-page-container">
        <TutorialsTab />
      </div>
    </div>
  );
};

export default TutorialsPage;
