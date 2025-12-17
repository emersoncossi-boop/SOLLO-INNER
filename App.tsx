import React, { useState } from 'react';
import Layout from './components/Layout';
import Home from './components/Home';
import InnerMuse from './components/InnerMuse';
import Soundtrack from './components/Soundtrack';
import SocraticMirrors from './components/SocraticMirrors';
import Rituals from './components/Rituals';
import { AppView } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);

  const renderView = () => {
    switch (currentView) {
      case AppView.HOME:
        return <Home onChangeView={setCurrentView} />;
      case AppView.MUSE:
        return <InnerMuse />;
      case AppView.SOUNDTRACK:
        return <Soundtrack />;
      case AppView.MIRROR:
        return <SocraticMirrors />;
      case AppView.RITUALS:
        return <Rituals />;
      default:
        return <Home onChangeView={setCurrentView} />;
    }
  };

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView}>
      {renderView()}
    </Layout>
  );
};

export default App;