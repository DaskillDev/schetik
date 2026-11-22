import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { scheduleReminder } from './reminders';

const META_KEY = 'schetik/profiles/v1';
/** The first child keeps the original key, so progress saved before profiles existed is not lost. */
const FIRST_KEY = 'schetik/progress/v1';

export const AVATARS = ['🐻', '🦊', '🐰', '🐼', '🐸', '🦁', '🐯', '🐨', '🦄', '🐶', '🐱', '🐧'];

export type Profile = { id: string; name: string; avatar: string };
export type Reminder = { on: boolean; hour: number };

type Meta = { active: string; list: Profile[]; reminder: Reminder };

const INITIAL: Meta = {
  active: 'p1',
  list: [{ id: 'p1', name: 'Игрок', avatar: '🐻' }],
  reminder: { on: false, hour: 18 },
};

type Ctx = {
  profiles: Profile[];
  active: Profile;
  /** AsyncStorage key holding the active child's progress. */
  storageKey: string;
  reminder: Reminder;
  addProfile: (name: string, avatar: string) => void;
  switchProfile: (id: string) => void;
  updateProfile: (id: string, patch: Partial<Omit<Profile, 'id'>>) => void;
  removeProfile: (id: string) => void;
  setReminder: (r: Reminder) => Promise<boolean>;
};

const ProfilesContext = createContext<Ctx | null>(null);

export const progressKey = (id: string) => (id === 'p1' ? FIRST_KEY : `schetik/progress/${id}`);

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<Meta>(INITIAL);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(META_KEY)
      .then((raw) => {
        if (raw) setMeta({ ...INITIAL, ...(JSON.parse(raw) as Partial<Meta>) });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const save = useCallback((next: Meta) => {
    setMeta(next);
    AsyncStorage.setItem(META_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addProfile = useCallback(
    (name: string, avatar: string) => {
      const id = `p${Date.now().toString(36)}`;
      save({ ...meta, active: id, list: [...meta.list, { id, name: name.trim() || 'Игрок', avatar }] });
    },
    [meta, save],
  );

  const switchProfile = useCallback((id: string) => save({ ...meta, active: id }), [meta, save]);

  const updateProfile = useCallback<Ctx['updateProfile']>(
    (id, patch) => save({ ...meta, list: meta.list.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
    [meta, save],
  );

  const removeProfile = useCallback(
    (id: string) => {
      if (meta.list.length <= 1) return;
      const list = meta.list.filter((p) => p.id !== id);
      AsyncStorage.removeItem(progressKey(id)).catch(() => {});
      save({ ...meta, list, active: meta.active === id ? list[0].id : meta.active });
    },
    [meta, save],
  );

  const setReminder = useCallback(
    async (r: Reminder) => {
      const ok = await scheduleReminder(r);
      save({ ...meta, reminder: ok ? r : { ...r, on: false } });
      return ok;
    },
    [meta, save],
  );

  const value = useMemo<Ctx>(() => {
    const active = meta.list.find((p) => p.id === meta.active) ?? meta.list[0];
    return {
      profiles: meta.list,
      active,
      storageKey: progressKey(active.id),
      reminder: meta.reminder,
      addProfile,
      switchProfile,
      updateProfile,
      removeProfile,
      setReminder,
    };
  }, [meta, addProfile, switchProfile, updateProfile, removeProfile, setReminder]);

  if (!loaded) return null;
  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>;
}

export function useProfiles(): Ctx {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error('useProfiles must be used inside ProfilesProvider');
  return ctx;
}
