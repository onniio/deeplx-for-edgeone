const fs = require('fs');
const path = require('path');

console.log('🔨 Starting EdgeOne build process...');

// 确保输出目录存在
const publicDir = path.join(__dirname, 'public');
const functionsDir = path.join(__dirname, 'functions');

// 创建目录
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('📁 Created public directory');
}

if (!fs.existsSync(functionsDir)) {
  fs.mkdirSync(functionsDir, { recursive: true });
  console.log('📁 Created functions directory');
}

// EdgeOne Functions 入口文件内容
const functionsContent = `// EdgeOne Functions Entry Point
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 处理 CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // 处理 OPTIONS 请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    // 路由处理
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/translate' }
      });
    }
    
    if (url.pathname === '/translate' && request.method === 'GET') {
      return new Response('Please use POST method :)', {
        headers: { 
          'Content-Type': 'text/plain',
          ...corsHeaders
        }
      });
    }
    
    if (url.pathname === '/translate' && request.method === 'POST') {
      try {
        // 解析请求体
        let params = {};
        try {
          params = await request.json();
        } catch (e) {
          params = {};
        }
        
        // 翻译处理
        const result = await translateQuery(params, {
          proxyEndpoint: "https://ideepl.vercel.app/jsonrpc",
        });
        
        return new Response(JSON.stringify(result), {
          status: result.code || 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      } catch (error) {
        console.error('Translation error:', error);
        return new Response(JSON.stringify({
          code: 500,
          message: 'Server error: ' + error.message,
          data: null
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }
    
    // 404 处理
    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders
    });
  }
};

// 翻译查询函数
async function translateQuery(params, config = {}) {
  if (!params?.text) {
    return {
      code: 400,
      message: 'No Translate Text Found',
      data: null,
    };
  }

  const API_URL = 'https://www2.deepl.com/jsonrpc';
  const REQUEST_ALTERNATIVES = 3;
  
  // 构建请求参数
  function buildRequestParams(sourceLang = 'auto', targetLang = 'en') {
    return {
      jsonrpc: '2.0',
      method: 'LMT_handle_texts',
      id: Math.floor(Math.random() * 100000 + 100000) * 1000,
      params: {
        texts: [{ text: '', requestAlternatives: REQUEST_ALTERNATIVES }],
        timestamp: 0,
        splitting: 'newlines',
        lang: {
          source_lang_user_selected: sourceLang?.toUpperCase(),
          target_lang: targetLang?.toUpperCase(),
        },
      },
    };
  }

  function countLetterI(translateText) {
    return (translateText || '').split('i').length - 1;
  }

  function getTimestamp(letterCount) {
    const timestamp = new Date().getTime();
    return letterCount !== 0
      ? timestamp - (timestamp % (letterCount + 1)) + (letterCount + 1)
      : timestamp;
  }

  function buildRequestBody(data) {
    const requestData = buildRequestParams(data.source_lang, data.target_lang);
    requestData.params.texts = [
      { text: data.text, requestAlternatives: REQUEST_ALTERNATIVES },
    ];
    requestData.params.timestamp = getTimestamp(countLetterI(data.text));

    let requestString = JSON.stringify(requestData);
    if (
      [0, 3].includes((requestData['id'] + 5) % 29) ||
      (requestData['id'] + 3) % 13 === 0
    ) {
      requestString = requestString.replace('"method":"', '"method" : "');
    } else {
      requestString = requestString.replace('"method":"', '"method": "');
    }

    return requestString;
  }

  try {
    const response = await fetch(config?.proxyEndpoint ?? API_URL, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...config?.customHeader,
      },
      method: 'POST',
      body: buildRequestBody(params),
    });

    if (response.ok) {
      const responseData = await response.json();
      const result = responseData.result;
      return {
        code: 200,
        message: 'success',
        data: result?.texts?.[0]?.text || 'Translation failed',
        source_lang: params?.source_lang || 'auto',
        target_lang: params?.target_lang || 'en',
        alternatives: result?.texts?.[0]?.alternatives?.map?.(item => item.text) || [],
      };
    } else {
      console.error('API Response Error:', response.status, response.statusText);
      return {
        code: response.status,
        data: null,
        message:
          response.status === 429
            ? 'Too many requests, please try again later.'
            : \`API Error: \${response.status} \${response.statusText}\`,
      };
    }
  } catch (error) {
    console.error('Fetch Error:', error);
    return {
      code: 500,
      data: null,
      message: 'Network error: ' + error.message,
    };
  }
}`;

// 静态首页内容
const indexHtmlContent = \`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DeepL Translation API</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 800px;
            width: 100%;
        }
        h1 { 
            color: #333; 
            margin-bottom: 20px; 
            text-align: center;
            font-size: 2.5em;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 1.1em;
        }
        .endpoint { 
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            padding: 20px; 
            border-radius: 10px; 
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
        }
        .test-section {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .code { 
            background: #2d3748; 
            color: #e2e8f0;
            padding: 20px; 
            border-radius: 10px; 
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            margin: 15px 0;
            font-size: 14px;
        }
        .btn {
            background: linear-gradient(45deg, #007cba, #005a87);
            color: white;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 8px;
            display: inline-block;
            margin: 10px 5px;
            transition: transform 0.2s;
            font-weight: bold;
        }
        .btn:hover { 
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,124,186,0.3);
        }
        .api-tester {
            margin-top: 30px;
            padding: 25px;
            background: #f0f8ff;
            border-radius: 10px;
            border-left: 5px solid #007cba;
        }
        .input-group {
            margin: 15px 0;
        }
        .input-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }
        .input-group input, .input-group textarea, .input-group select {
            width: 100%;
            padding: 10px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }
        .input-group textarea {
            height: 80px;
            resize: vertical;
        }
        .test-btn {
            background: #28a745;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            margin-top: 10px;
        }
        .test-btn:hover {
            background: #218838;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 5px;
            white-space: pre-wrap;
            font-family: monospace;
        }
        .result.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .result.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        h2 { 
            color: #333; 
            margin: 25px 0 15px 0; 
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }
        ul li {
            margin: 8px 0;
            line-height: 1.6;
        }
        .feature {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin: 15px 0;
            border-left: 4px solid #667eea;
        }
        footer { 
            margin-top: 40px; 
            text-align: center; 
            color: #666; 
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌐 DeepL Translation API</h1>
        <p class="subtitle">Free translation service powered by EdgeOne</p>
        
        <div class="endpoint">
            ✨ API Endpoint: <code>POST /translate</code>
        </div>

        <div class="api-tester">
            <h2>🔧 API Tester</h2>
            <form id="translateForm">
                <div class="input-group">
                    <label for="text">Text to translate:</label>
                    <textarea id="text" placeholder="Enter text to translate..." required>Hello, world!</textarea>
                </div>
                <div style="display: flex; gap: 15px;">
                    <div class="input-group" style="flex: 1;">
                        <label for="source_lang">Source Language:</label>
                        <select id="source_lang">
                            <option value="auto">Auto Detect</option>
                            <option value="en">English</option>
                            <option value="zh">Chinese</option>
                            <option value="ja">Japanese</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                        </select>
                    </div>
                    <div class="input-group" style="flex: 1;">
                        <label for="target_lang">Target Language:</label>
                        <select id="target_lang">
                            <option value="en">English</option>
                            <option value="zh">Chinese</option>
                            <option value="ja">Japanese</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                        </select>
                    </div>
                </div>
                <button type="submit" class="test-btn">🚀 Translate</button>
            </form>
            <div id="result"></div>
        </div>
        
        <h2>📝 Usage Example</h2>
        <div class="code">curl --location '\${window.location.origin}/translate' \\
--header 'Content-Type: application/json' \\
--data '{
    "text": "Hello, world!",
    "source_lang": "en",
    "target_lang": "zh"
}'</div>
        
        <div class="feature">
            <h2>📋 Parameters</h2>
            <ul>
                <li><strong>text</strong> (required): Text to translate</li>
                <li><strong>source_lang</strong> (optional): Source language code (default: "auto")</li>
                <li><strong>target_lang</strong> (optional): Target language code (default: "en")</li>
            </ul>
        </div>
        
        <div class="feature">
            <h2>📄 Response Format</h2>
            <div class="code">{
  "code": 200,
  "message": "success",
  "data": "你好，世界！",
  "source_lang": "en",
  "target_lang": "zh",
  "alternatives": ["你好，世界！"]
}</div>
        </div>
        
        <footer>
            <p>🚀 Powered by EdgeOne & Hono</p>
        </footer>
    </div>

    <script>
        document.getElementById('translateForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const resultDiv = document.getElementById('result');
            const text = document.getElementById('text').value;
            const source_lang = document.getElementById('source_lang').value;
            const target_lang = document.getElementById('target_lang').value;
            
            if (!text.trim()) {
                resultDiv.innerHTML = '<div class="result error">Please enter text to translate</div>';
                return;
            }
            
            resultDiv.innerHTML = '<div class="result">Translating...</div>';
            
            try {
                const response = await fetch('/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text,
                        source_lang: source_lang === 'auto' ? undefined : source_lang,
                        target_lang: target_lang
                    })
                });
                
                const result = await response.json();
                
                if (result.code === 200) {
                    resultDiv.innerHTML = \`<div class="result success">✅ Translation: \${result.data}

📝 Details:
- Source: \${result.source_lang}
- Target: \${result.target_lang}
- Alternatives: \${result.alternatives?.join(', ') || 'None'}</div>\`;
                } else {
                    resultDiv.innerHTML = \`<div class="result error">❌ Error (\${result.code}): \${result.message}</div>\`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`<div class="result error">❌ Network Error: \${error.message}</div>\`;
            }
        });
    </script>
</body>
</html>\`;

// 写入文件
try {
  // 写入 functions 目录
  const functionsIndexPath = path.join(functionsDir, 'index.js');
  fs.writeFileSync(functionsIndexPath, functionsContent, 'utf8');
  console.log('✅ Created EdgeOne function: functions/index.js');

  // 写入 public 目录
  const publicIndexPath = path.join(publicDir, 'index.html');
  fs.writeFileSync(publicIndexPath, indexHtmlContent, 'utf8');
  console.log('✅ Created static homepage: public/index.html');

  // 创建根目录备份
  const rootIndexPath = path.join(__dirname, 'index.js');
  fs.writeFileSync(rootIndexPath, functionsContent, 'utf8');
  console.log('✅ Created backup entry: index.js');

  console.log('🚀 Build completed successfully!');
  console.log('📁 Directory structure:');
  console.log('   ├── functions/index.js (EdgeOne Function)');
  console.log('   ├── public/index.html (Static Site)');
  console.log('   └── index.js (Backup Entry)');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}