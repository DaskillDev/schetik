import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const REMINDERS_SUPPORTED = Platform.OS !== 'web';

const MESSAGES = [
  'Счётик соскучился! Решим пару примеров? 🧡',
  'Пора позаниматься — задания дня ждут! 🎯',
  'Не прерывай серию — заходи посчитать! 🔥',
];

/** Schedules (or cancels) one daily local reminder. Returns false if it couldn't be set up. */
export async function scheduleReminder({ on, hour }: { on: boolean; hour: number }): Promise<boolean> {
  if (!REMINDERS_SUPPORTED) return !on;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!on) return true;
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return false;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Напоминания',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Счётик', body: MESSAGES[Math.floor(Math.random() * MESSAGES.length)] },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0, channelId: 'reminders' },
    });
    return true;
  } catch {
    return false;
  }
}
