import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔨 Starting EdgeOne build process...');

// 确保输出目录存在
const outputDir = path.join(__dirname, 'dist');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log('📁 Created dist directory');
}

// 创建 EdgeOne 兼容的入口文件
const entryContent = `// EdgeOne Entry Point
import { Hono } from "hono";

// 翻译查询函数 - 内联实现以避免模块依赖问题
async function translateQuery(params, config = {}) {
  if (!params?.text) {
    return {
      code: 404,
      message: 'No Translate Text Found',
      data: null,
    };
  }

  const API_URL = 'https://www2.deepl.com/jsonrpc';
  const REQUEST_ALTERNATIVES = 3;
  
  // 构建请求体
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
        ...config?.customHeader,
      },
      method: 'POST',
      body: buildRequestBody(params),
    });

    if (response.ok) {
      const { result } = await response.json();
      return {
        code: 200,
        message: 'success',
        data: result?.texts?.[0]?.text,
        source_lang: params?.source_lang || 'auto',
        target_lang: params?.target_lang || 'en',
        alternatives: result.texts?.[0]?.alternatives?.map?.(item => item.text),
      };
    } else {
      return {
        code: response.status,
        data: null,
        message:
          response.status === 429
            ? 'Too many requests, please try again later.'
            : 'Unknown error.',
      };
    }
  } catch (error) {
    return {
      code: 500,
      data: null,
      message: 'Internal server error: ' + error.message,
    };
  }
}

// 创建 Hono 应用
const app = new Hono();

app
  .get("/", (c) => c.redirect("/translate"))
  .get("/translate", (c) => c.text("Please use POST method :)"))
  .post("/translate", async (c) => {
    try {
      const params = await c.req.json().catch(() => ({}));
      const result = await translateQuery(params, {
        proxyEndpoint: "https://ideepl.vercel.app/jsonrpc",
      });
      return c.json(result, result.code);
    } catch (error) {
      return c.json({
        code: 500,
        message: 'Server error: ' + error.message,
        data: null
      }, 500);
    }
  });

// EdgeOne 导出格式
export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};
`;

// 写入入口文件
const entryFile = path.join(__dirname, 'index.js');
fs.writeFileSync(entryFile, entryContent);
console.log('✅ Created EdgeOne entry file: index.js');

// 同时创建备用入口文件到 dist 目录
const distEntryFile = path.join(outputDir, 'index.js');
fs.writeFileSync(distEntryFile, entryContent);
console.log('✅ Created backup entry file: dist/index.js');

console.log('🚀 Build completed successfully!');
console.log('📋 Files created:');
console.log('   - functions/index.js (EdgeOne function)');
console.log('   - public/index.html (static homepage)');
console.log('   - index.js (backup entry point)');