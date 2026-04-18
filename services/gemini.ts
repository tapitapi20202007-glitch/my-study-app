const RENDER_URL = 'https://study-app-backend-2xty.onrender.com/analyze-image/';

async function analyzeImage(base64Image: string): Promise<any> {
  // 1. Base64文字列を「実際のファイルデータ(Blob)」に変換する
  // ※Python側の UploadFile がこれを受け取ります
  const byteCharacters = atob(base64Image);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/jpeg' });

  // 2. データを「ファイル」として梱包する
  const formData = new FormData();
  formData.append('file', blob, 'image.jpg'); // main.pyの (file: UploadFile) と名前を合わせる

  // 3. 送信！
  const response = await fetch(RENDER_URL, {
    method: 'POST',
    // ヘッダーに 'Content-Type': 'application/json' を書いてはいけません（自動で設定されます）
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`サーバーエラー: ${response.status}\n${error}`);
  }

  const data = await response.json();
  
  if (!data || !data.questions) {
    throw new Error('解析結果の形式が正しくありません');
  }

  return data;
}

export { analyzeImage };
