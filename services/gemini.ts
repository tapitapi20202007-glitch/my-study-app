const API_KEY = 'AIzaSyBSQA4Y8sL3mrFOLmqng7Zqp2PP7qxrxuo';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`;

const prompt = `
テスト画像から問題を抽出し、必ず以下の形式ONLYでJSONを返してください。

【指示】
1. 画像から問題文をすべて抽出する
2. 大問・小問構造を維持する（複数の小問がある場合は分割）
3. 各小問ごとに以下の情報を生成：
   - question_id: "大問番号-小問番号" 形式（例："1-1", "2-3"）
   - main_question: 大問の問題文全体
   - sub_question: 小問の問題文（問題番号含む）
   - answer: 想定される解答
   - explanation: 解答の解説

【出力形式（必ず厳守）】
{
  "questions": [
    {
      "question_id": "string",
      "main_question": "string",
      "sub_question": "string",
      "answer": "string",
      "explanation": "string"
    }
  ]
}
`;

async function analyzeImage(base64Image: string): Promise<any> {
  const response = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini APIエラー: ${response.status}\n${error}`);
  }

  const decoded = await response.json();
  const text = decoded.candidates?.[0]?.content?.parts
    ?.map((p: any) => p.text)
    .join('')
    .trim();

  if (!text) throw new Error('Geminiの応答が空です');

  const cleaned = text.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

export { analyzeImage };

