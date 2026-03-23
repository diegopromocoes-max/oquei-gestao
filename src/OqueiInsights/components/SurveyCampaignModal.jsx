import React from 'react';
import { Save } from 'lucide-react';
import { Btn, Modal, colors } from '../../components/ui';

const inputStyle = {
  padding: '10px 12px',
  borderRadius: '9px',
  border: '1px solid var(--border)',
  outline: 'none',
  fontSize: '13px',
  color: 'var(--text-main)',
  background: 'var(--bg-app)',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle = {
  fontSize: '11px',
  fontWeight: '900',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '6px',
  display: 'block',
};

export default function SurveyCampaignModal({
  open,
  editId,
  form,
  saving,
  savingTrigger,
  activeThemes,
  cities,
  triggerOptions,
  onClose,
  onSave,
  onChangeForm,
  onToggleTheme,
  onToggleCity,
  onTriggerChange,
  getCityLabel,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editId ? 'Editar campanha' : 'Nova campanha de pesquisa'}
      size="lg"
      footer={(
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
          {!editId && <div style={{ flex: 1, fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>A campanha nasce como rascunho e ganha versao a cada ajuste de questionario.</div>}
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn loading={saving} onClick={onSave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={14} />
            {editId ? 'Salvar' : 'Criar rascunho'}
          </Btn>
        </div>
      )}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Titulo da pesquisa *</label>
            <input
              style={inputStyle}
              value={form.title}
              onChange={(event) => onChangeForm('title', event.target.value)}
              placeholder="Ex: Pesquisa de oportunidade comercial - Bady Bassitt"
              autoFocus
            />
          </div>

          <div>
            <label style={labelStyle}>Descricao</label>
            <textarea
              style={{ ...inputStyle, minHeight: '74px', resize: 'vertical' }}
              value={form.description}
              onChange={(event) => onChangeForm('description', event.target.value)}
              placeholder="Contexto operacional da campanha"
            />
          </div>

          <div>
            <label style={labelStyle}>Objetivo estrategico *</label>
            <textarea
              style={{ ...inputStyle, minHeight: '108px', resize: 'vertical' }}
              value={form.objective}
              onChange={(event) => onChangeForm('objective', event.target.value)}
              placeholder="Qual decisao a diretoria ou a area comercial pretende apoiar com esta pesquisa?"
            />
          </div>

          <div>
            <label style={labelStyle}>Gatilho da pesquisa *</label>
            <select style={inputStyle} value={form.trigger} onChange={(event) => onTriggerChange(event.target.value)} disabled={savingTrigger}>
              <option value="">Selecione o gatilho</option>
              {triggerOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {savingTrigger && <div style={{ fontSize: '11px', color: colors.primary, marginTop: '6px', fontWeight: '700' }}>Salvando novo gatilho...</div>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Temas relacionados</label>
            {activeThemes.length === 0 ? (
              <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-panel)', color: 'var(--text-muted)', fontSize: '12px' }}>
                Cadastre primeiro ao menos um tema estrategico.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {activeThemes.map((theme) => {
                  const selected = form.themeIds.includes(theme.id);
                  return (
                    <button
                      key={theme.id}
                      onClick={() => onToggleTheme(theme.id)}
                      style={{ padding: '6px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '11px', background: selected ? `${colors.purple}18` : 'var(--bg-app)', color: selected ? colors.purple : 'var(--text-muted)', outline: `1px solid ${selected ? colors.purple : 'var(--border)'}` }}
                    >
                      {selected ? '✓ ' : ''}
                      {theme.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Cidades-alvo</label>
            {cities.length === 0 ? (
              <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-panel)', color: 'var(--text-muted)', fontSize: '12px' }}>
                Nenhuma cidade disponivel.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                {cities.map((city) => {
                  const selected = form.targetCities.includes(city.id);
                  return (
                    <button
                      key={city.id}
                      onClick={() => onToggleCity(city.id)}
                      style={{ padding: '6px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '11px', background: selected ? `${colors.primary}18` : 'var(--bg-app)', color: selected ? colors.primary : 'var(--text-muted)', outline: `1px solid ${selected ? colors.primary : 'var(--border)'}` }}
                    >
                      {selected ? '✓ ' : ''}
                      {getCityLabel(city)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
