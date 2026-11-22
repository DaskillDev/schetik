import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackBar } from '@/components/BackBar';
import { Btn, C, tap } from '@/components/ui';
import { AVATARS, useProfiles } from '@/lib/profiles';

/** «Кто играет?» — switch between children or add a new one. */
export default function Profiles() {
  const { profiles, active, switchProfile, addProfile } = useProfiles();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[1]);

  return (
    <SafeAreaView style={s.root}>
      <BackBar title="Кто играет?" />
      <ScrollView contentContainerStyle={s.scroll}>
        {profiles.map((p) => {
          const on = p.id === active.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`Играет ${p.name}`}
              accessibilityState={{ selected: on }}
              onPress={() => {
                tap('success', 'coin');
                if (!on) switchProfile(p.id);
                router.back();
              }}
              style={({ pressed }) => [s.row, on && s.rowOn, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <Text style={s.avatar}>{p.avatar}</Text>
              <Text style={s.name}>{p.name}</Text>
              {on && <Text style={s.badge}>Сейчас</Text>}
            </Pressable>
          );
        })}

        {adding ? (
          <View style={s.form}>
            <Text style={s.h3}>Новый игрок</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Имя"
              placeholderTextColor={C.muted}
              maxLength={16}
              style={s.input}
              accessibilityLabel="Имя"
              autoFocus
            />
            <Text style={s.label}>Выбери зверька:</Text>
            <View style={s.avatars}>
              {AVATARS.map((a) => (
                <Pressable
                  key={a}
                  accessibilityRole="button"
                  accessibilityLabel={`Аватар ${a}`}
                  onPress={() => {
                    tap();
                    setAvatar(a);
                  }}
                  style={[s.avatarBtn, avatar === a && s.avatarOn]}
                >
                  <Text style={{ fontSize: 32 }}>{a}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn style={{ flex: 1 }} title="Отмена" color={C.card} textColor={C.ink} onPress={() => setAdding(false)} />
              <Btn
                style={{ flex: 1 }}
                title="Добавить"
                disabled={!name.trim()}
                onPress={() => {
                  addProfile(name, avatar);
                  router.back();
                }}
              />
            </View>
          </View>
        ) : (
          <Btn title="➕ Добавить ребёнка" color={C.card} textColor={C.ink} onPress={() => setAdding(true)} />
        )}
        <Text style={s.note}>У каждого игрока свои уровни, монетки, награды и комната.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, gap: 12, paddingBottom: 40, maxWidth: 560, width: '100%', alignSelf: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 14,
    borderWidth: 3,
    borderColor: C.line,
  },
  rowOn: { borderColor: C.primary, backgroundColor: '#FFF0E2' },
  avatar: { fontSize: 44 },
  name: { flex: 1, fontSize: 24, fontWeight: '900', color: C.ink },
  badge: { fontSize: 14, fontWeight: '900', color: C.primary },
  form: { backgroundColor: C.card, borderRadius: 22, padding: 16, gap: 12, borderWidth: 2, borderColor: C.line },
  h3: { fontSize: 20, fontWeight: '900', color: C.ink },
  input: {
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.line,
    fontSize: 22,
    fontWeight: '800',
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: C.ink,
  },
  label: { fontSize: 16, fontWeight: '800', color: C.muted },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatarBtn: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
  avatarOn: { borderColor: C.primary, backgroundColor: '#FFF0E2' },
  note: { fontSize: 15, fontWeight: '700', color: C.muted, textAlign: 'center' },
});
