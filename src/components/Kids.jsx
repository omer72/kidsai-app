import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '../theme';
import { Icon } from './Icons';
import { Avatar, Card, PrimaryButton } from './primitives';
import { kidAgeYears } from '../storage';

const COLORS = ['#2E5BFF', '#7C5BE8', '#4AAE8C', '#E5A64B', '#D94A5C', '#5B48D4'];

const EMPTY_FORM = { name: '', birthdate: '', gender: '', newSibling: false, notes: '' };

function formFromKid(k) {
  return {
    name: k.name,
    birthdate: k.birthdate || '',
    gender: k.gender || '',
    newSibling: !!k.newSibling,
    notes: k.notes || '',
  };
}

function KidFields({ form, setForm, autoFocus }) {
  const { t } = useTranslation();
  const set = (patch) => setForm({ ...form, ...patch });
  const inputStyle = {
    padding: 12, borderRadius: 10, border: `1px solid ${tokens.line}`,
    fontFamily: tokens.sans, fontSize: 15, outline: 'none',
    background: tokens.surface, color: tokens.ink, width: '100%', boxSizing: 'border-box',
  };
  const labelStyle = {
    fontFamily: tokens.sans, fontSize: 12, fontWeight: 600, color: tokens.ink3,
    marginBottom: 4,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        autoFocus={autoFocus} value={form.name} onChange={(e) => set({ name: e.target.value })}
        placeholder={t('kids.namePlaceholder')}
        style={inputStyle}
      />
      <div>
        <div style={labelStyle}>{t('kids.birthdateLabel')}</div>
        <input
          type="date" value={form.birthdate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => set({ birthdate: e.target.value })}
          style={{
            ...inputStyle,
            // iOS date inputs keep an intrinsic width and overflow the card
            // unless the native appearance is stripped and height pinned
            WebkitAppearance: 'none', appearance: 'none',
            display: 'block', minWidth: 0, maxWidth: '100%',
            height: 45, textAlign: 'start',
          }}
        />
      </div>
      <div>
        <div style={labelStyle}>{t('kids.genderLabel')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['boy', 'girl'].map((g) => {
            const on = form.gender === g;
            return (
              <button key={g} onClick={() => set({ gender: on ? '' : g })} style={{
                flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                background: on ? tokens.primarySoft : 'transparent',
                border: `1px solid ${on ? tokens.primary : tokens.line}`,
                fontFamily: tokens.sans, fontSize: 14, fontWeight: on ? 600 : 500,
                color: on ? tokens.primary : tokens.ink2,
              }}>
                {t(`kids.gender_${g}`)}
              </button>
            );
          })}
        </div>
      </div>
      <button onClick={() => set({ newSibling: !form.newSibling })} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        borderRadius: 10, cursor: 'pointer', textAlign: 'start',
        background: 'transparent', border: `1px solid ${tokens.line}`,
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          background: form.newSibling ? tokens.primary : 'transparent',
          border: `1.5px solid ${form.newSibling ? tokens.primary : tokens.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {form.newSibling && <Icon.Check s={12} c="#fff"/>}
        </div>
        <span style={{ fontFamily: tokens.sans, fontSize: 13, color: tokens.ink2, lineHeight: 1.4 }}>
          {t('kids.newSiblingLabel')}
        </span>
      </button>
      <div>
        <div style={labelStyle}>{t('kids.notesLabel')}</div>
        <textarea
          rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })}
          placeholder={t('kids.notesPlaceholder')}
          style={{ ...inputStyle, resize: 'none', lineHeight: 1.45 }}
        />
      </div>
    </div>
  );
}

export function KidsScreen({ kids, setKids, activeKid, setActiveKid, history, entitled = true, lockedKidCount = 0, onRequestUpgrade }) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const canAddFree = entitled || kids.length === 0;

  const startAdd = () => {
    if (!canAddFree) {
      onRequestUpgrade?.();
      return;
    }
    setAdding(true);
  };

  const profileFields = (f) => ({
    birthdate: f.birthdate || '',
    gender: f.gender || '',
    newSibling: !!f.newSibling,
    notes: f.notes.trim(),
  });

  const addKid = () => {
    const trimmed = form.name.trim();
    if (!trimmed) return;
    const id = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Date.now().toString(36);
    const color = COLORS[kids.length % COLORS.length];
    const kid = {
      id, name: trimmed, color, initials: trimmed[0].toUpperCase(),
      age: kidAgeYears({ birthdate: form.birthdate }),
      ...profileFields(form),
    };
    setKids([...kids, kid]);
    setForm(EMPTY_FORM); setAdding(false);
  };

  const startEdit = (k) => {
    setAdding(false);
    setEditingId(k.id);
    setEditForm(formFromKid(k));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  };

  const saveEdit = () => {
    const trimmed = editForm.name.trim();
    if (!trimmed) return;
    setKids(kids.map((k) => k.id === editingId
      ? {
          ...k, name: trimmed, initials: trimmed[0].toUpperCase(),
          // keep a legacy stored age when no birthdate was ever set
          age: editForm.birthdate ? kidAgeYears({ birthdate: editForm.birthdate }) : k.age,
          ...profileFields(editForm),
        }
      : k));
    cancelEdit();
  };

  const deleteKid = () => {
    if (!confirm(t('kids.deleteConfirm'))) return;
    const remaining = kids.filter((k) => k.id !== editingId);
    setKids(remaining);
    if (activeKid === editingId) setActiveKid(remaining[0]?.id || null);
    cancelEdit();
  };

  return (
    <div style={{ padding: '14px 20px 140px' }}>
      <div style={{
        fontFamily: tokens.serif, fontSize: 28, color: tokens.ink,
        letterSpacing: -0.3, fontWeight: 500, marginBottom: 14,
      }}>{t('kids.title')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(entitled ? kids : kids.slice(0, 1)).map((k) => {
          const momentsCount = history.filter((h) => h.kidId === k.id).length;
          const active = k.id === activeKid;

          if (editingId === k.id) {
            return (
              <Card key={k.id} pad={16} style={{ borderColor: k.color, borderWidth: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <Avatar kid={k} size={52}/>
                  <div style={{ flex: 1, fontFamily: tokens.sans, fontSize: 12, fontWeight: 700,
                    color: tokens.ink3, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    {t('kids.editKid')}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <KidFields form={editForm} setForm={setEditForm} autoFocus/>
                  {!active && (
                    <button onClick={() => setActiveKid(k.id)} style={{
                      padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                      background: 'transparent', border: `1px solid ${tokens.line}`,
                      fontFamily: tokens.sans, fontSize: 13, fontWeight: 500, color: tokens.ink,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      <Icon.Check s={13} c={tokens.ink2}/> {t('kids.setAsActive')}
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <PrimaryButton onClick={saveEdit} disabled={!editForm.name.trim()} style={{ flex: 1 }}>{t('common.save')}</PrimaryButton>
                    <button onClick={cancelEdit} style={{
                      padding: '14px 16px', borderRadius: 14, background: 'transparent',
                      border: `1px solid ${tokens.line}`, cursor: 'pointer',
                      fontFamily: tokens.sans, fontSize: 14, fontWeight: 500, color: tokens.ink2,
                    }}>{t('common.cancel')}</button>
                  </div>
                  <button onClick={deleteKid} style={{
                    padding: '10px 12px', borderRadius: 12, background: 'transparent',
                    border: 'none', cursor: 'pointer',
                    fontFamily: tokens.sans, fontSize: 13, fontWeight: 500, color: '#D94A5C',
                    alignSelf: 'center',
                  }}>{t('kids.deleteKid')}</button>
                </div>
              </Card>
            );
          }

          const ageYears = kidAgeYears(k);
          return (
            <button key={k.id} onClick={() => startEdit(k)} style={{
              padding: 18, borderRadius: 20, textAlign: 'start', cursor: 'pointer',
              background: tokens.surface,
              border: `1.5px solid ${active ? k.color : tokens.line}`,
              display: 'flex', alignItems: 'center', gap: 14,
              transition: 'all .15s',
            }}>
              <Avatar kid={k} size={52}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: tokens.serif, fontSize: 20, fontWeight: 500, color: tokens.ink, letterSpacing: -0.2 }}>
                  {k.name}
                </div>
                <div style={{ fontFamily: tokens.sans, fontSize: 13, color: tokens.ink3, marginTop: 2 }}>
                  {ageYears ? t('kids.yearsAndMoments', { age: ageYears, count: momentsCount }) : t('kids.momentsOnly', { count: momentsCount })}
                </div>
              </div>
              {active && (
                <div style={{
                  width: 24, height: 24, borderRadius: 24, background: k.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon.Check s={14} c="#fff"/>
                </div>
              )}
            </button>
          );
        })}

        {adding ? (
          <Card pad={16} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <KidFields form={form} setForm={setForm} autoFocus/>
            <div style={{ display: 'flex', gap: 8 }}>
              <PrimaryButton onClick={addKid} disabled={!form.name.trim()} style={{ flex: 1 }}>{t('common.save')}</PrimaryButton>
              <button onClick={() => { setAdding(false); setForm(EMPTY_FORM); }} style={{
                padding: '14px 16px', borderRadius: 14, background: 'transparent',
                border: `1px solid ${tokens.line}`, cursor: 'pointer',
                fontFamily: tokens.sans, fontSize: 14, fontWeight: 500, color: tokens.ink2,
              }}>{t('common.cancel')}</button>
            </div>
          </Card>
        ) : (
          <button onClick={startAdd} style={{
            padding: 18, borderRadius: 20, cursor: 'pointer',
            background: 'transparent', border: `1.5px dashed ${tokens.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            color: tokens.ink3, fontFamily: tokens.sans, fontSize: 14, fontWeight: 500,
          }}>
            <Icon.Plus s={16}/> {canAddFree ? t('kids.addChild') : t('kids.addAnotherUnlock')}
          </button>
        )}

        {lockedKidCount > 0 && (
          <button onClick={onRequestUpgrade} style={{
            padding: 16, borderRadius: 20, cursor: 'pointer', textAlign: 'start',
            background: tokens.primarySoft, border: `1px solid ${tokens.primary}40`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 36, flexShrink: 0,
              background: tokens.primary, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon.Sparkle s={16} c="#fff"/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: tokens.sans, fontSize: 14, fontWeight: 600, color: tokens.ink, marginBottom: 2 }}>
                {lockedKidCount === 1 ? t('kids.lockedWaiting', { count: 1 }) : t('kids.lockedWaitingPlural', { count: lockedKidCount })}
              </div>
              <div style={{ fontFamily: tokens.sans, fontSize: 12, color: tokens.ink2, lineHeight: 1.4 }}>
                {t('kids.lockedDescription')}
              </div>
            </div>
            <Icon.ArrowRight s={16} c={tokens.primary}/>
          </button>
        )}
      </div>

      <div style={{
        marginTop: 26, fontFamily: tokens.sans, fontSize: 11, fontWeight: 700,
        color: tokens.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
      }}>{t('kids.aboutTitle')}</div>
      <Card pad={16}>
        <div style={{ fontFamily: tokens.sans, fontSize: 13, lineHeight: 1.55, color: tokens.ink2 }}>
          {t('kids.aboutBody')}
        </div>
      </Card>
    </div>
  );
}
