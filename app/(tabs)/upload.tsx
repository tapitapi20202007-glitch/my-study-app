import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Question } from '../../models/question';
import { insertMultiple } from '../../services/db';
import { analyzeImage } from '../../services/gemini';

interface ExtractedQuestion {
  question_id: string;
  main_question: string;
  sub_question: string;
  answer: string;
  explanation: string;
  checked: boolean;
}

export default function UploadScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [manualMain, setManualMain] = useState('');
  const [manualSub, setManualSub] = useState('');
  const [manualAnswer, setManualAnswer] = useState('');
  const [manualExp, setManualExp] = useState('');

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setQuestions([]);
      setErrorMessage(null);
    }
  }

  async function analyze() {
    if (!imageUri) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      const result = await analyzeImage(base64);
      const extracted = (result.questions as any[]).map((q) => ({
        ...q,
        checked: false,
      }));

      setQuestions(extracted);
    } catch (e: any) {
      setErrorMessage(`抽出に失敗しました: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleCheck(index: number) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, checked: !q.checked } : q))
    );
  }

  async function saveQuestions() {
    const selected = questions.filter((q) => q.checked);

    if (selected.length === 0) {
      Alert.alert('確認', '保存する問題が選択されていません');
      return;
    }

    const now = Date.now();
    const toSave: Question[] = selected.map((q) => ({
      questionId: q.question_id,
      mainQuestion: q.main_question,
      subQuestion: q.sub_question,
      answer: q.answer,
      explanation: q.explanation,
      createdAt: now,
      wrongCount: 1,
    }));

    try {
      insertMultiple(toSave);
      Alert.alert('保存完了', `${toSave.length} 問を保存しました`);
      setQuestions([]);
      setImageUri(null);
    } catch (e: any) {
      Alert.alert('エラー', `保存に失敗しました: ${e.message}`);
    }
  }

  function addManual() {
    if (!manualMain && !manualSub) {
      Alert.alert('エラー', '大問または小問を入力してください');
      return;
    }

    const newQ: ExtractedQuestion = {
      question_id: `手動-${Date.now().toString().slice(-5)}`,
      main_question: manualMain,
      sub_question: manualSub,
      answer: manualAnswer,
      explanation: manualExp,
      checked: true,
    };

    setQuestions((prev) => [...prev, newQ]);
    setManualMain('');
    setManualSub('');
    setManualAnswer('');
    setManualExp('');
    setModalVisible(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ホームに戻るボタン */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
        <Text style={styles.backButtonText}>← ホームに戻る</Text>
      </TouchableOpacity>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>画像が選択されていません</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>ギャラリーから選択</Text>
      </TouchableOpacity>

      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, styles.buttonBlue, isLoading && styles.buttonDisabled]}
        onPress={analyze}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Geminiで分析</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonOutline]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonOutlineText}>手動で問題を追加</Text>
      </TouchableOpacity>

      {questions.length > 0 && (
        <>
          <View style={styles.successBox}>
            <Text style={styles.successText}>{questions.length} 問を抽出しました</Text>
          </View>

          {questions.map((q, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.card, q.checked && styles.cardChecked]}
              onPress={() => toggleCheck(index)}
            >
              <Text style={styles.checkMark}>{q.checked ? '☑' : '☐'}</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>問{q.question_id}</Text>
                <Text style={styles.cardMain}>{q.main_question}</Text>
                <Text style={styles.cardAnswer}>解答: {q.answer}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[styles.button, styles.buttonGreen]} onPress={saveQuestions}>
            <Text style={styles.buttonText}>選択した問題を保存</Text>
          </TouchableOpacity>
        </>
      )}

      {/* 手動入力モーダル */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>手動で問題を追加</Text>
            <TextInput
              style={styles.input}
              placeholder="大問"
              placeholderTextColor="#999"
              value={manualMain}
              onChangeText={setManualMain}
            />
            <TextInput
              style={styles.input}
              placeholder="小問"
              placeholderTextColor="#999"
              value={manualSub}
              onChangeText={setManualSub}
            />
            <TextInput
              style={styles.input}
              placeholder="解答"
              placeholderTextColor="#999"
              value={manualAnswer}
              onChangeText={setManualAnswer}
            />
            <TextInput
              style={styles.input}
              placeholder="解説"
              placeholderTextColor="#999"
              value={manualExp}
              onChangeText={setManualExp}
            />
            <TouchableOpacity style={[styles.button, styles.buttonBlue]} onPress={addManual}>
              <Text style={styles.buttonText}>追加する</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={() => setModalVisible(false)}>
              <Text style={styles.buttonOutlineText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: {
    padding: 16,
    paddingTop: 60,      // 上の余白を追加
    flexGrow: 1,         // コンテンツを下に広げる
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
  },
  image: { width: '100%', height: 300, borderRadius: 8, marginBottom: 16 },
  placeholder: {
    width: '100%', height: 200, borderRadius: 8, borderWidth: 1,
    borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  placeholderText: { color: '#999' },
  button: {
    backgroundColor: '#757575', padding: 14, borderRadius: 10,
    alignItems: 'center', marginBottom: 12,
  },
  buttonBlue: { backgroundColor: '#2196F3' },
  buttonGreen: { backgroundColor: '#4CAF50' },
  buttonDisabled: { opacity: 0.5 },
  buttonOutline: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: '#2196F3',
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  buttonOutlineText: { color: '#2196F3', fontSize: 15, fontWeight: 'bold' },
  errorBox: { backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginBottom: 12 },
  errorText: { color: '#C62828' },
  successBox: { backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, marginBottom: 12 },
  successText: { color: '#2E7D32' },
  card: {
    flexDirection: 'row', padding: 12, borderRadius: 10, borderWidth: 1,
    borderColor: '#ddd', marginBottom: 10, alignItems: 'flex-start',
  },
  cardChecked: { borderColor: '#2196F3', backgroundColor: '#E3F2FD' },
  checkMark: { fontSize: 22, marginRight: 10 },
  cardBody: { flex: 1 },
  cardTitle: { fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  cardMain: { fontSize: 13, color: '#444', marginBottom: 4 },
  cardAnswer: { fontSize: 13, color: '#2E7D32' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', padding: 24,
  },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    padding: 10, marginBottom: 12, fontSize: 14,
    color: '#333',                // 入力文字を黒に
    backgroundColor: '#fff',     // 背景を白に
  },
});