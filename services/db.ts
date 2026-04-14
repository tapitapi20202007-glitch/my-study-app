import * as SQLite from 'expo-sqlite';
import { Question } from '../models/question';

const db = SQLite.openDatabaseSync('study_app.db');

// テーブル作成（アプリ起動時に呼ぶ）
export function initDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS questions (
      question_id TEXT PRIMARY KEY,
      main_question TEXT,
      sub_question TEXT,
      answer TEXT,
      explanation TEXT,
      created_at INTEGER,
      wrong_count INTEGER
    );
  `);
}

// 全問題を取得
export function getAllQuestions(): Question[] {
  return db.getAllSync<any>(
    'SELECT * FROM questions ORDER BY created_at DESC'
  ).map(toQuestion);
}

// 復習対象（7日前の問題）を取得
export function getReviewQuestions(): Question[] {
  const now = new Date();
  const target = new Date(now);
  target.setDate(target.getDate() - 7);

  const start = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();
  const end = start + 86399999;

  return db.getAllSync<any>(
    'SELECT * FROM questions WHERE created_at >= ? AND created_at <= ? ORDER BY question_id ASC',
    [start, end]
  ).map(toQuestion);
}

// 複数問題を一括保存
export function insertMultiple(questions: Question[]) {
  const stmt = db.prepareSync(
    `INSERT OR REPLACE INTO questions
     (question_id, main_question, sub_question, answer, explanation, created_at, wrong_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  try {
    db.execSync('BEGIN TRANSACTION');
    for (const q of questions) {
      stmt.executeSync([
        q.questionId,
        q.mainQuestion,
        q.subQuestion,
        q.answer,
        q.explanation,
        q.createdAt,
        q.wrongCount,
      ]);
    }
    db.execSync('COMMIT');
  } catch (e) {
    db.execSync('ROLLBACK');
    throw e;
  } finally {
    stmt.finalizeSync();
  }
}

// 1件削除
export function deleteQuestion(id: string) {
  db.runSync('DELETE FROM questions WHERE question_id = ?', [id]);
}

// 複数削除（正解時）
export function deleteMultiple(ids: string[]) {
  const placeholders = ids.map(() => '?').join(', ');
  db.runSync(`DELETE FROM questions WHERE question_id IN (${placeholders})`, ids);
}

// 不正解時の更新
export function updateWrongQuestions(ids: string[]) {
  const now = Date.now();
  const placeholders = ids.map(() => '?').join(', ');
  const rows = db.getAllSync<any>(
    `SELECT * FROM questions WHERE question_id IN (${placeholders})`,
    ids
  );

  const stmt = db.prepareSync(
    'UPDATE questions SET wrong_count = ?, created_at = ? WHERE question_id = ?'
  );
  try {
    db.execSync('BEGIN TRANSACTION');
    for (const row of rows) {
      stmt.executeSync([row.wrong_count + 1, now, row.question_id]);
    }
    db.execSync('COMMIT');
  } catch (e) {
    db.execSync('ROLLBACK');
    throw e;
  } finally {
    stmt.finalizeSync();
  }
}

// 未実施処理（アプリ起動時に呼ぶ）
export function processUnreviewed() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const threshold = today.getTime() - 7 * 24 * 60 * 60 * 1000;

  const rows = db.getAllSync<any>(
    'SELECT * FROM questions WHERE created_at < ?',
    [threshold]
  );

  if (rows.length === 0) return;

  const stmt = db.prepareSync(
    'UPDATE questions SET wrong_count = ?, created_at = ? WHERE question_id = ?'
  );
  try {
    db.execSync('BEGIN TRANSACTION');
    for (const row of rows) {
      // 元の復習予定日（created_at + 7日）を新しいcreated_atにする
      const dueDate = new Date(row.created_at + 7 * 24 * 60 * 60 * 1000);
      const newCreatedAt = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate()
      ).getTime();

      stmt.executeSync([row.wrong_count + 1, newCreatedAt, row.question_id]);
    }
    db.execSync('COMMIT');
  } catch (e) {
    db.execSync('ROLLBACK');
    throw e;
  } finally {
    stmt.finalizeSync();
  }
}

// DBの行をQuestionに変換
function toQuestion(row: any): Question {
  return {
    questionId: row.question_id,
    mainQuestion: row.main_question,
    subQuestion: row.sub_question,
    answer: row.answer,
    explanation: row.explanation,
    createdAt: row.created_at,
    wrongCount: row.wrong_count,
  };
}