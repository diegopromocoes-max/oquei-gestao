import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { 
  MapPin, Truck, Clock, CheckCircle, 
  Info, Plus, X, Layout, Globe, Navigation, Calendar
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';
import { Card, Btn, Modal, Input, Select, InfoBox } from '../components/ui';

// Coordenadas de segurança (Fallback) caso a cidade ainda não tenha Lat/Lon cadastrada na Estrutura
const FALLBACK_COORDS = {
  'São José do Rio Preto': { lat: -20.8113, lon: -49.3758 },
  'Bady Bassitt': { lat: -20.9175, lon: -49.3786 },
  'Novo Horizonte': { lat: -21.4688, lon: -49.2197 },
  'Novo Horizonte / Cedral': { lat: -21.4688, lon: -49.2197 },
  'Cedral': { lat: -20.9022, lon: -49.2683 },
  'Borborema': { lat: -21.6192, lon: -49.0736 },
  'Sales': { lat: -21.3403, lon: -49.4852 },
  'Nova Granada': { lat: -20.5333, lon: -49.3142 },
  'Urupês': { lat: -21.2014, lon: -49.2908 },
  'Potirendaba': { lat: -21.0416, lon: -49.3756 },
  'Neves Paulista': { lat: -20.8466, lon: -49.4827 },
};

export default function JapaSupervisor({ userData }) {
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);
  const [citiesData, setCitiesData] = useState([]);
  
  // Modais
  const [showModal, setShowModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false); // Modal para atualizar cronograma
  
  const [viewMode, setViewMode] = useState('map'); // 'roadmap' | 'map'
  const [vanPosition, setVanPosition] = useState(0);
  const [selectedAction, setSelectedAction] = useState(null); // Para o mapa
  
  // Form para Solicitação Avulsa
  const [form, setForm] = useState({
    title: '', date: '', time: '09:00', city: userData?.cityId || '',
    location: '', description: '', type: 'Panfletagem'
  });

  // Form para Atualização do Cronograma (Marketing)
  const [updateForm, setUpdateForm] = useState({
    date: '', city: '', activity: 'Ação Comercial', 
    useCustomCoords: false, customLat: '', customLon: ''
  });

  const MOCK_SCHEDULE = [
    { id: 1, date: '2026-02-02', city: 'Novo Horizonte', location: 'Centro', activity: 'Ação Comercial', time: 'Integral' },
    { id: 2, date: '2026-02-06', city: 'Borborema', location: 'Porta da Loja', activity: 'Ação Porta de Loja', time: 'Comercial' },
    { id: 3, date: '2026-02-07', city: 'Bady Bassitt', location: 'Praça Matriz', activity: 'Inauguração', time: '19:00' },
    { id: 4, date: '2026-02-15', city: 'Nova Granada', location: 'Centro', activity: 'Panfletagem', time: 'Integral' },
    { id: 5, date: '2026-02-20', city: 'São José do Rio Preto', location: 'Avenida', activity: 'Carro de Som', time: 'Integral' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Busca Cidades para ter a Lat/Lon e Endereço
      const snapCities = await getDocs(collection(db, "cities"));
      const cData = snapCities.docs.map(d => ({ id: d.id, ...d.data() }));
      setCitiesData(cData);

      // Busca Ações do Japa
      const q = query(collection(db, "marketing_actions")); 
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      let finalData = list.length === 0 ? MOCK_SCHEDULE : list.sort((a, b) => new Date(a.date) - new Date(b.date));
      setActions(finalData);
      
      // Controla posição da Van na Lista Vertical
      const today = new Date().toISOString().split('T')[0];
      const todayIndex = finalData.findIndex(a => a.date >= today);
      const targetIndex = todayIndex !== -1 ? todayIndex : finalData.length - 1;
      setTimeout(() => setVanPosition(targetIndex * 120), 500);

    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const getStatus = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    if (dateStr < today) return 'past';
    if (dateStr === today) return 'today';
    return 'future';
  };

  // Quando a cidade muda no formulário, tenta auto-preencher o endereço da loja
  const handleCityChange = (e) => {
    const selectedCityName = e.target.value;
    const cityDbInfo = citiesData.find(c => c.name === selectedCityName);
    
    setForm(prev => ({
      ...prev, 
      city: selectedCityName,
      location: cityDbInfo?.address ? `Loja Oquei: ${cityDbInfo.address}` : prev.location
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "marketing_actions"), {
        ...form,
        requesterId: auth.currentUser.uid,
        requesterName: userData.name,
        clusterId: userData.clusterId,
        status: 'Pendente',
        createdAt: serverTimestamp()
      });
      alert("Solicitação enviada para o Japa!");
      setShowModal(false);
      setForm({ ...form, title: '', location: '', description: '' });
      fetchData();
    } catch (err) { alert("Erro: " + err.message); }
    setLoading(false);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: updateForm.activity,
        activity: updateForm.activity,
        date: updateForm.date,
        time: '09:00', // Padrão
        city: updateForm.city,
        location: updateForm.useCustomCoords ? 'Local Externo Específico' : 'Loja Oficial',
        requesterId: auth.currentUser.uid,
        requesterName: userData.name,
        clusterId: userData?.clusterId || 'Geral',
        status: 'Agendado', // Entra como confirmada (inserida pelo marketing)
        type: 'Cronograma Oficial',
        createdAt: serverTimestamp()
      };

      if (updateForm.useCustomCoords) {
        payload.lat = updateForm.customLat;
        payload.lon = updateForm.customLon;
      }

      await addDoc(collection(db, "marketing_actions"), payload);
      alert("Ação adicionada com sucesso ao Cronograma!");
      setShowUpdateModal(false);
      setUpdateForm({ date: '', city: '', activity: 'Ação Comercial', useCustomCoords: false, customLat: '', customLon: '' });
      fetchData();
    } catch (err) { alert("Erro ao atualizar: " + err.message); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Cancelar esta solicitação?")) {
      await deleteDoc(doc(db, "marketing_actions", id));
      fetchData();
    }
  };

  // --- COMPONENTE MAPA GEOGRÁFICO (SATÉLITE REAL) ---
  const GeographicMap = () => {
    // 1. Preparar os pontos com coordenadas reais
    const mapPoints = actions.map(act => {
      const cityDb = citiesData.find(c => c.name.toLowerCase() === act.city.toLowerCase());
      
      // Prioridade: Coordenadas customizadas da ação > Coordenadas da Loja no BD > Fallback
      let lat = act.lat ? parseFloat(act.lat) : (cityDb?.lat ? parseFloat(cityDb.lat) : null);
      let lon = act.lon ? parseFloat(act.lon) : (cityDb?.lon ? parseFloat(cityDb.lon) : null);

      if (!lat || !lon) {
        const fallback = FALLBACK_COORDS[act.city];
        if (fallback) {
          lat = fallback.lat;
          lon = fallback.lon;
        } else {
          lat = -20.8113; lon = -49.3758; // Rio Preto
        }
      }
      return { ...act, lat, lon, status: getStatus(act.date) };
    });

    if (mapPoints.length === 0) return <div style={global.emptyState}>Nenhuma rota definida para o mapa.</div>;

    // 2. Construir o documento HTML com a biblioteca Leaflet injetada
    // Usamos imagens de Satélite de Alta Resolução da Esri com Nomes das Cidades (CartoDB)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          body, html { margin: 0; padding: 0; height: 100%; font-family: 'Inter', sans-serif; background: #0f172a; }
          #map { height: 100vh; width: 100vw; background: #0f172a; }
          
          /* Estilos dos Pinos */
          .pin-past { background: #94a3b8; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.5); }
          .pin-future { background: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.5); }
          .pin-van { background: #ea580c; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 18px; position: relative; }
          
          /* Animação de pulso para a Van */
          .pin-van::before { content: ''; position: absolute; top: -6px; left: -6px; right: -6px; bottom: -6px; border-radius: 50%; border: 3px solid #ea580c; animation: pulse 1.5s infinite; }
          @keyframes pulse { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
          
          /* Estilos dos Popups (Modo Escuro) */
          .leaflet-popup-content-wrapper { background: rgba(15, 23, 42, 0.95); color: white; border-radius: 12px; border: 1px solid #334155; backdrop-filter: blur(5px); padding: 5px; }
          .leaflet-popup-tip { background: rgba(15, 23, 42, 0.95); }
          .leaflet-popup-content { margin: 10px 15px; }
          .popup-title { font-size: 16px; font-weight: 900; margin: 0 0 5px 0; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.05em; }
          .popup-desc { font-size: 13px; margin: 0 0 8px 0; color: #f8fafc; font-weight: bold; }
          .popup-date { font-size: 11px; color: #94a3b8; display: block; border-top: 1px solid #334155; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Inicializa o mapa
          const map = L.map('map', { zoomControl: false }).setView([-20.8113, -49.3758], 10);
          L.control.zoom({ position: 'bottomleft' }).addTo(map);
          
          // 1. Camada de Satélite de Alta Resolução (Esri)
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
              maxZoom: 18,
              attribution: 'Satélite &copy; Esri'
          }).addTo(map);

          // 2. Camada de Texto (Nomes de Cidades e Ruas por cima do satélite)
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
              maxZoom: 18,
              opacity: 0.9
          }).addTo(map);

          // Importa os dados injetados pelo React
          const points = ${JSON.stringify(mapPoints)};
          const pastPoints = [];
          const futurePoints = [];
          
          // Descobre onde separar o passado do futuro
          let splitIndex = points.findIndex(p => p.status === 'today' || p.status === 'future');
          if (splitIndex === -1) splitIndex = points.length;

          // Adiciona os marcadores
          points.forEach((p, idx) => {
            if (idx <= splitIndex) pastPoints.push([p.lat, p.lon]);
            if (idx >= splitIndex) futurePoints.push([p.lat, p.lon]);
            
            let iconClass = 'pin-future';
            let htmlContent = '';
            
            if (p.status === 'past') iconClass = 'pin-past';
            if (p.status === 'today') { 
              iconClass = 'pin-van'; 
              htmlContent = '🚐'; 
            }

            const icon = L.divIcon({
              className: 'custom-div-icon',
              html: '<div class="' + iconClass + '">' + htmlContent + '</div>',
              iconSize: p.status === 'today' ? [36, 36] : [20, 20],
              iconAnchor: p.status === 'today' ? [18, 18] : [10, 10],
              popupAnchor: [0, -10]
            });

            const marker = L.marker([p.lat, p.lon], { icon }).addTo(map);
            
            // Formatar Data
            const parts = p.date.split('-');
            const dateFmt = parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : p.date;
            
            // Criar Popup
            const popupHtml = '<h4 class="popup-title">' + p.city + '</h4>' +
                              '<p class="popup-desc">' + (p.activity || p.title) + '</p>' +
                              '<span class="popup-date">📅 Agendado para: ' + dateFmt + '</span>';
            
            marker.bindPopup(popupHtml);
            
            // Abre o popup automaticamente se for hoje
            if (p.status === 'today') {
              setTimeout(() => marker.openPopup(), 500);
            }
          });

          // Desenha a linha de trajeto (Cinza pontilhada para o passado, Azul sólida para o futuro)
          if (pastPoints.length > 1) {
            L.polyline(pastPoints, { color: '#94a3b8', weight: 4, dashArray: '8, 8', opacity: 0.8 }).addTo(map);
          }
          if (futurePoints.length > 1) {
            L.polyline(futurePoints, { color: '#3b82f6', weight: 5, opacity: 0.9 }).addTo(map);
          }

          // Ajusta o zoom automaticamente para mostrar todos os pontos
          if (points.length > 0) {
            const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        </script>
      </body>
      </html>
    `;

    return (
      <div style={{position: 'relative', width: '100%', height: '600px', background: 'var(--bg-app)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)'}}>
        
        {/* Iframe que roda o mapa de satélite independentemente do React */}
        <iframe 
          title="Mapa de Satélite"
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />

        {/* Legenda Flutuante (Overlay) */}
        <div style={{position: 'absolute', bottom: '20px', right: '20px', background: 'var(--bg-card)', padding: '15px 20px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 10}}>
          <h4 style={{margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-main)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Legenda do Trajeto</h4>
          <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px'}}>
             <div style={{width:'12px', height:'12px', borderRadius:'50%', background:'#94a3b8', border:'2px solid white'}}></div>
             <span style={{fontSize:'13px', color:'var(--text-muted)', fontWeight: 'bold'}}>Rota Concluída</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px'}}>
             <div style={{width:'14px', height:'14px', borderRadius:'50%', background:'#ea580c', border:'2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px'}}>🚐</div>
             <span style={{fontSize:'13px', color:'var(--text-main)', fontWeight:'900'}}>Japa Está Aqui</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
             <div style={{width:'12px', height:'12px', borderRadius:'50%', background:'#3b82f6', border:'2px solid white'}}></div>
             <span style={{fontSize:'13px', color:'var(--text-main)', fontWeight: 'bold'}}>Próximas Paradas</span>
          </div>
        </div>

      </div>
    );
  };

  const RoadmapView = () => (
    <div style={{ position: 'relative', marginTop: '20px' }}>
      <div style={{ position: 'absolute', left: '70px', top: '20px', bottom: '20px', width: '4px', background: 'var(--border)', borderRadius: '2px', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', left: '52px', top: 0, zIndex: 10, transition: 'transform 1s cubic-bezier(0.25, 1, 0.5, 1)', display:'flex', alignItems:'center', transform: `translateY(${vanPosition}px)` }}>
        <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: `2px solid ${colors.primary}`, animation: 'ping 1.5s infinite', zIndex:1 }}></div>
        <div style={{ width: '40px', height: '40px', background: colors.primary, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${colors.primary}44`, position:'relative', zIndex:2 }}><Truck size={20} color="white" /></div>
        <div style={{ position: 'absolute', left: '50px', background: colors.primary, color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', whiteSpace:'nowrap' }}>Japa Aqui</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {actions.map((item) => {
          const status = getStatus(item.date);
          const dateObj = new Date(item.date + 'T12:00:00');

          return (
            <div key={item.id} style={{ display: 'flex', alignItems: 'stretch', minHeight: '120px' }}>
              <div style={{ width: '50px', textAlign: 'right', paddingTop: '20px', paddingRight: '20px' }}>
                <span style={{ display: 'block', fontSize: '20px', fontWeight: '900', lineHeight: 1, color: status === 'past' ? 'var(--text-muted)' : 'var(--text-brand)' }}>
                  {dateObj.getDate()}
                </span>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>
                  {dateObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}
                </span>
              </div>

              <div style={{ width: '40px', display: 'flex', justifyContent: 'center', paddingTop: '24px', position: 'relative' }}>
                 <div style={{ width: '16px', height: '16px', borderRadius: '50%', zIndex: 1, display:'flex', alignItems:'center', justifyContent:'center', background: status === 'past' ? 'var(--border)' : status === 'today' ? 'var(--text-brand)' : 'var(--bg-card)', border: status === 'future' ? '4px solid var(--text-brand)' : 'none' }}>
                   {status === 'past' && <CheckCircle size={12} color="white"/>}
                 </div>
              </div>

              <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '20px', marginLeft: '20px', position: 'relative', border: '1px solid var(--border)', opacity: status === 'past' ? 0.6 : 1, borderColor: status === 'today' ? 'var(--text-brand)' : 'var(--border)', boxShadow: status === 'today' ? 'var(--shadow-sm)' : 'none' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 5px 0', display:'flex', alignItems:'center' }}>
                  <MapPin size={16} style={{marginRight:'5px', color:'#ef4444'}}/>
                  {item.city}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500', margin: 0 }}>{item.activity || item.title}</p>
                <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', alignItems: 'center' }}>
                  <span><Clock size={12}/> {item.time}</span>
                  <span>•</span>
                  <span>{item.location}</span>
                </div>
                
                {item.requesterId === auth.currentUser?.uid && (
                  <button onClick={() => handleDelete(item.id)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', color: colors.danger, fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}>Cancelar</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{...global.container, maxWidth: '1000px'}}>
      
      <style>
        {`
          @keyframes dash { to { stroke-dashoffset: -100; } }
          @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        `}
      </style>


      {/* ── Cabeçalho padrão Oquei Gestão ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
        border: '1px solid var(--border)', borderRadius: '20px',
        padding: '24px 32px', marginBottom: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px', boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            background: 'linear-gradient(135deg, #EA580C, #DC2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(234,88,12,0.35)',
          }}>
            <Truck size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Rota do Japa
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: '500' }}>
              Acompanhe a van e solicite ações · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        
      </div>

      <div style={{ background: colors.primaryLight, border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '50%' }}><Info size={24} color="var(--text-brand)"/></div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: colors.primary, marginBottom: '5px', marginTop: 0 }}>Gestão de Rota</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-main)', margin: 0 }}>
            O mapa abaixo mostra o trajeto programado. Para adicionar sua loja, crie uma solicitação!
          </p>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', flexWrap: 'wrap', gap: '15px'}}>
           <div style={{ background: 'var(--bg-panel)', padding: '6px', borderRadius: '14px', display: 'flex', gap: '4px', border: '1px solid var(--border)' }}>
             <button onClick={() => setViewMode('map')} style={viewMode === 'map' ? { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-brand)', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)' } : { background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Globe size={16}/> Mapa Satélite
             </button>
             <button onClick={() => setViewMode('roadmap')} style={viewMode === 'roadmap' ? { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-brand)', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)' } : { background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Layout size={16}/> Lista Vertical
             </button>
           </div>
           <div style={{display: 'flex', gap: '10px'}}>
             <button onClick={() => setShowUpdateModal(true)} style={{...global.btnSecondary}}>
               <Calendar size={18} /> Atualizar Ações do Mês
             </button>
             <button onClick={() => setShowModal(true)} style={{...global.btnPrimary, background: 'var(--text-brand)'}}>
               <Plus size={18} /> Solicitar Ação
             </button>
           </div>
        </div>

        {viewMode === 'roadmap' ? <RoadmapView /> : <GeographicMap />}

      </div>

      {/* MODAL DE ATUALIZAÇÃO DO CRONOGRAMA OFICIAL */}
      {showUpdateModal && (
        <div style={global.modalOverlay}>
          <div style={global.modalBox}>
            <div style={global.modalHeader}>
              <h3 style={global.modalTitle}>Atualizar Cronograma</h3>
              <button onClick={() => setShowUpdateModal(false)} style={global.closeBtn}><X size={24}/></button>
            </div>
            <form onSubmit={handleUpdateSubmit} style={global.form}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                 <div style={global.field}>
                    <label style={global.label}>Data</label>
                    <input type="date" style={global.input} value={updateForm.date} onChange={e => setUpdateForm({...updateForm, date: e.target.value})} required />
                 </div>
                 <div style={global.field}>
                    <label style={global.label}>Cidade</label>
                    <select style={global.select} value={updateForm.city} onChange={e => setUpdateForm({...updateForm, city: e.target.value})} required>
                       <option value="">Selecione...</option>
                       {citiesData.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                 </div>
              </div>
              <div style={global.field}>
                 <label style={global.label}>Ação / Atividade</label>
                 <input style={global.input} placeholder="Ex: Ação Comercial na Praça" value={updateForm.activity} onChange={e => setUpdateForm({...updateForm, activity: e.target.value})} required />
              </div>

              <div style={{marginTop:'10px', padding:'15px', background:'var(--bg-panel)', borderRadius:'12px', border: '1px solid var(--border)'}}>
                 <label style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', fontWeight:'bold', color:'var(--text-main)', fontSize:'14px'}}>
                   <input type="checkbox" checked={updateForm.useCustomCoords} onChange={e => setUpdateForm({...updateForm, useCustomCoords: e.target.checked})} style={{width:'18px', height:'18px', accentColor: 'var(--text-brand)'}} />
                   Ação fora da loja? (Novas coordenadas)
                 </label>
                 {updateForm.useCustomCoords && (
                   <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginTop:'15px'}}>
                     <div style={global.field}>
                       <label style={global.label}>Latitude</label>
                       <input style={global.input} placeholder="-20.8123" value={updateForm.customLat} onChange={e => setUpdateForm({...updateForm, customLat: e.target.value})} required />
                     </div>
                     <div style={global.field}>
                       <label style={global.label}>Longitude</label>
                       <input style={global.input} placeholder="-49.3211" value={updateForm.customLon} onChange={e => setUpdateForm({...updateForm, customLon: e.target.value})} required />
                     </div>
                   </div>
                 )}
              </div>

              <button type="submit" style={{ marginTop: '10px' }} disabled={loading}>
                {loading ? 'A Guardar...' : 'Adicionar ao Cronograma'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE SOLICITAÇÃO AVULSA */}
      {showModal && (
        <div style={global.modalOverlay}>
          <div style={global.modalBox}>
            <div style={global.modalHeader}>
              <h3 style={global.modalTitle}>Chamar o Japa</h3>
              <button onClick={() => setShowModal(false)} style={global.closeBtn}><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} style={global.form}>
              <div style={global.field}><label style={global.label}>O que vamos fazer?</label><input style={global.input} placeholder="Ex: Panfletagem na Praça" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}><div style={global.field}><label style={global.label}>Tipo de Ação</label><select style={global.select} value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option>Panfletagem</option><option>Carro de Som</option><option>Porta de Loja</option><option>Evento</option><option>Inauguração</option></select></div><div style={global.field}><label style={global.label}>Data Sugerida</label><input type="date" style={global.input} value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div></div>
              
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                <div style={global.field}>
                  <label style={global.label}>Cidade</label>
                  <select style={global.select} value={form.city} onChange={handleCityChange} required>
                    <option value="">Selecione...</option>
                    {citiesData.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div style={global.field}>
                  <label style={global.label}>Horário Início</label>
                  <input type="time" style={global.input} value={form.time} onChange={e => setForm({...form, time: e.target.value})} required />
                </div>
              </div>
              
              <div style={global.field}>
                <label style={global.label}>Local Específico</label>
                <div style={{fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px'}}>
                  Preenchemos automaticamente com o endereço da loja. Pode alterar se a ação for noutro local (ex: Praça Matriz).
                </div>
                <input style={global.input} placeholder="Ex: Em frente à Matriz" value={form.location} onChange={e => setForm({...form, location: e.target.value})} required />
              </div>
              
              <div style={global.field}><label style={global.label}>Detalhes (Opcional)</label><textarea style={{...global.textarea, minHeight:'80px'}} placeholder="Descreva a estratégia..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <button type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Enviar Pedido'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
;