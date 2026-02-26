import React from 'react';
import PainelVendas from './PainelVendas';

export default function DashboardAtendente({ userData }) {
  // Removemos o LayoutGlobal daqui para não duplicar a barra lateral.
  // Agora este componente apenas injeta o conteúdo dos gráficos.
  return <PainelVendas userData={userData} />;
}