import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getReviewQuestions } from './db';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDaily() {
  if (Platform.OS === 'web') return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const questions = getReviewQuestions();
  if (questions.length === 0) {
    console.log('復習対象なし：通知スキップ');
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '復習テストの時間です！',
      body: '1週間前の間違えた問題を解きましょう',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 7,
      minute: 0,
    },
  });

  console.log('通知スケジュール完了: 毎日7:00');
}