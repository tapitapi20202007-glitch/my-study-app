import { Question } from '@/models/question';
import { deleteQuestion, getAllQuestions } from '@/services/db';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日にアップロード`;
}

export default function ProblemsScreen() {
  const [questions, setQuestions] = useState<Question[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadQuestions();
    }, [])
  );

  function loadQuestions() {
    const data = getAllQuestions();
    setQuestions(data);
  }

  function handleDelete(id: string) {
    Alert.alert(
      '削除確認',
      'この問題を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            deleteQuestion(id);
            setQuestions((prev) =>
              prev.filter((q) => q.questionId !== id)
            );
          },
        },
      ]
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>登録済みの問題がありません</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={questions}
      keyExtractor={(item) => item.questionId}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardId}>問{item.questionId}</Text>
            <View style={styles.headerRight}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.wrongCount}回目</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.questionId)}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteText}>削除</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.uploadDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.mainQuestion}>{item.mainQuestion}</Text>
          <Text style={styles.subQuestion}>{item.subQuestion}</Text>
          <Text style={styles.answer}>解答: {item.answer}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#999' },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0',
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardId: { fontSize: 16, fontWeight: 'bold' },
  badge: {
    backgroundColor: '#FFE0B2', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 99,
  },
  badgeText: { color: '#E65100', fontSize: 12, fontWeight: 'bold' },
  deleteButton: {
    backgroundColor: '#FFEBEE', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 99,
  },
  deleteText: { color: '#C62828', fontSize: 12, fontWeight: 'bold' },
  uploadDate: { fontSize: 12, color: '#888', marginBottom: 6 },
  mainQuestion: { fontSize: 14, color: '#333', marginBottom: 6 },
  subQuestion: { fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 6 },
  answer: { fontSize: 13, color: '#2E7D32', fontWeight: 'bold' },
});