import { Question } from '@/models/question';
import { deleteMultiple, getReviewQuestions, updateWrongQuestions } from '@/services/db';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function showAlert(title: string, message: string, onOk?: () => void) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
    if (onOk) onOk();
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
}

function groupByMainQuestion(questions: Question[]): Question[][] {
  const groups: { [key: string]: Question[] } = {};
  for (const q of questions) {
    const mainId = q.questionId.split('-')[0];
    if (!groups[mainId]) groups[mainId] = [];
    groups[mainId].push(q);
  }
  return Object.values(groups);
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日にアップロード`;
}

export default function ReviewScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<Question[][]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: boolean | null }>({});
  const [shownAnswers, setShownAnswers] = useState<{ [questionId: string]: boolean }>({});
  const [testComplete, setTestComplete] = useState(false);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const data = getReviewQuestions();
    if (data.length === 0) {
      showAlert('確認', '復習対象の問題がありません', () => router.back());
      return;
    }
    const grouped = groupByMainQuestion(data);
    setGroups(grouped);
    setAllQuestions(data);

    const initialAnswers: { [key: string]: boolean | null } = {};
    const initialShown: { [key: string]: boolean } = {};
    for (const q of data) {
      initialAnswers[q.questionId] = null;
      initialShown[q.questionId] = false;
    }
    setAnswers(initialAnswers);
    setShownAnswers(initialShown);
  }, []);

  function showAnswer(questionId: string) {
    setShownAnswers((prev) => ({ ...prev, [questionId]: true }));
  }

  function answerQuestion(questionId: string, isCorrect: boolean) {
    setAnswers((prev) => ({ ...prev, [questionId]: isCorrect }));
  }

  function isCurrentGroupComplete(): boolean {
    if (groups.length === 0) return false;
    const currentGroup = groups[currentGroupIndex];
    return currentGroup.every((q) => answers[q.questionId] !== null);
  }

  async function completeTest() {
    const correctIds = allQuestions
      .filter((q) => answers[q.questionId] === true)
      .map((q) => q.questionId);

    const wrongIds = allQuestions
      .filter((q) => answers[q.questionId] === false)
      .map((q) => q.questionId);

    try {
      if (correctIds.length > 0) deleteMultiple(correctIds);
      if (wrongIds.length > 0) updateWrongQuestions(wrongIds);
      setTestComplete(true);
    } catch (e: any) {
      showAlert('エラー', e.message);
    }
  }

  if (allQuestions.length === 0) {
    return (
      <View style={styles.center}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  if (testComplete) {
    const correctCount = allQuestions.filter((q) => answers[q.questionId] === true).length;
    const wrongCount = allQuestions.filter((q) => answers[q.questionId] === false).length;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>テスト完了！</Text>

        <View style={styles.resultBox}>
          <Text style={styles.resultText}>正解: {correctCount} / {allQuestions.length}</Text>
          <Text style={[styles.resultText, { color: '#C62828' }]}>
            不正解: {wrongCount}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>解答・解説</Text>

        {allQuestions.map((q, index) => (
          <View
            key={index}
            style={[
              styles.card,
              answers[q.questionId] ? styles.cardCorrect : styles.cardWrong,
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardId}>問{q.questionId}</Text>
              <View style={[
                styles.badge,
                answers[q.questionId] ? styles.badgeCorrect : styles.badgeWrong,
              ]}>
                <Text style={styles.badgeText}>
                  {answers[q.questionId] ? '正解' : '不正解'}
                </Text>
              </View>
            </View>
            <Text style={styles.uploadDate}>{formatDate(q.createdAt)}</Text>
            <Text style={styles.subQuestion}>{q.subQuestion}</Text>
            <Text style={styles.answer}>解答: {q.answer}</Text>
            <Text style={styles.explanation}>解説: {q.explanation}</Text>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.button, styles.buttonBlue]}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.buttonText}>ホームに戻る</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const currentGroup = groups[currentGroupIndex];
  const isLastGroup = currentGroupIndex === groups.length - 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.progress}>
        大問 {currentGroupIndex + 1} / {groups.length}
      </Text>

      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${((currentGroupIndex + 1) / groups.length) * 100}%` },
          ]}
        />
      </View>

      <View style={styles.mainQuestionBox}>
        <Text style={styles.uploadDate}>{formatDate(currentGroup[0].createdAt)}</Text>
        <Text style={styles.mainQuestionText}>{currentGroup[0].mainQuestion}</Text>
      </View>

      {currentGroup.map((q) => (
        <View key={q.questionId} style={styles.subCard}>
          <Text style={styles.cardId}>問{q.questionId}</Text>
          <Text style={styles.subQuestion}>{q.subQuestion}</Text>

          {!shownAnswers[q.questionId] ? (
            <TouchableOpacity
              style={[styles.button, styles.buttonYellow]}
              onPress={() => showAnswer(q.questionId)}
            >
              <Text style={styles.buttonYellowText}>答えを見る</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.answerBox}>
                <Text style={styles.answerText}>解答: {q.answer}</Text>
                <Text style={styles.explanationText}>解説: {q.explanation}</Text>
              </View>

              <View style={styles.row}>
                <TouchableOpacity
                  style={[
                    styles.answerButton,
                    styles.buttonGreen,
                    answers[q.questionId] === true && styles.buttonGreenSelected,
                  ]}
                  onPress={() => answerQuestion(q.questionId, true)}
                >
                  <Text style={styles.buttonText}>正解</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.answerButton,
                    styles.buttonRed,
                    answers[q.questionId] === false && styles.buttonRedSelected,
                  ]}
                  onPress={() => answerQuestion(q.questionId, false)}
                >
                  <Text style={styles.buttonText}>不正解</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      ))}

      {isCurrentGroupComplete() && (
        <TouchableOpacity
          style={[styles.button, styles.buttonBlue]}
          onPress={() => {
            if (isLastGroup) {
              completeTest();
            } else {
              setCurrentGroupIndex((prev) => prev + 1);
            }
          }}
        >
          <Text style={styles.buttonText}>
            {isLastGroup ? 'テスト終了' : '次の大問へ'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  progress: { textAlign: 'center', fontSize: 16, color: '#666', marginBottom: 8 },
  progressBarBg: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 99, marginBottom: 20 },
  progressBarFill: { height: 6, backgroundColor: '#2196F3', borderRadius: 99 },
  mainQuestionBox: { backgroundColor: '#E3F2FD', borderRadius: 10, padding: 16, marginBottom: 16 },
  mainQuestionText: { fontSize: 15, color: '#333', fontWeight: 'bold' },
  uploadDate: { fontSize: 12, color: '#888', marginBottom: 6 },
  subCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardId: { fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  subQuestion: { fontSize: 14, color: '#444', marginBottom: 12 },
  answerBox: { backgroundColor: '#FFF9C4', borderRadius: 8, padding: 12, marginBottom: 12 },
  answerText: { fontSize: 15, fontWeight: 'bold', color: '#C62828', marginBottom: 4 },
  explanationText: { fontSize: 13, color: '#555' },
  answer: { fontSize: 14, color: '#2E7D32', fontWeight: 'bold', marginTop: 8 },
  explanation: { fontSize: 13, color: '#666', marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  answerButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  buttonGreenSelected: { opacity: 0.6, borderWidth: 3, borderColor: '#1B5E20' },
  buttonRedSelected: { opacity: 0.6, borderWidth: 3, borderColor: '#7F0000' },
  button: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8, marginBottom: 4 },
  buttonBlue: { backgroundColor: '#2196F3' },
  buttonGreen: { backgroundColor: '#4CAF50' },
  buttonRed: { backgroundColor: '#F44336' },
  buttonYellow: { backgroundColor: '#FFF9C4', borderWidth: 1, borderColor: '#F9A825' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  buttonYellowText: { color: '#F57F17', fontSize: 15, fontWeight: 'bold' },
  resultBox: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 24 },
  resultText: { fontSize: 20, fontWeight: 'bold', color: '#1565C0', marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 12 },
  cardCorrect: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  cardWrong: { borderColor: '#F44336', backgroundColor: '#FFEBEE' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
  badgeCorrect: { backgroundColor: '#4CAF50' },
  badgeWrong: { backgroundColor: '#F44336' },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});