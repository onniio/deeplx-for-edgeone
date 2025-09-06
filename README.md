# DeepL Translation API for EdgeOne

Deploy DeepL translation service on Tencent EdgeOne.

## 部署到 EdgeOne

### 1. 准备文件

确保你的项目包含以下文件：
- `package.json` - 包含构建脚本
- `build.js` - EdgeOne 构建脚本
- `index.js` - EdgeOne 入口文件
- `.edgeonerc` - EdgeOne 配置文件

### 2. 部署步骤

1. 将代码推送到 GitHub 仓库
2. 在腾讯云 EdgeOne 控制台创建新的 Pages 项目
3. 连接你的 GitHub 仓库
4. 配置构建设置：
   - **构建命令**: `npm run build`
   - **输出目录**: `./`
   - **入口文件**: `index.js`

### 3. 环境变量 (可选)

在 EdgeOne 控制台中设置以下环境变量：
- `NODE_ENV=production`

## 使用方法

部署成功后，你可以通过以下方式使用翻译 API：

### 基本使用

```bash
curl --location 'https://your-domain.edgeone.app/translate' \
--header 'Content-Type: application/json' \
--data '{
    "text": "免费，无限量翻译 API",
    "source_lang": "zh",
    "target_lang": "en"
}'
```

### 支持的参数

- `text`: 要翻译的文本 (必需)
- `source_lang`: 源语言代码 (可选，默认为 "auto")
- `target_lang`: 目标语言代码 (可选，默认为 "en")

### 响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": "Free, unlimited translation API",
  "source_lang": "zh",
  "target_lang": "en",
  "alternatives": ["Free, unlimited translation API"]
}
```

## 本地开发

```bash
# 安装依赖
npm install

# 本地开发 (使用 Cloudflare Workers)
npm run dev

# 构建 EdgeOne 版本
npm run build
```

## 技术说明

- 使用 Hono 框架提供 Web API
- 内联了翻译逻辑以避免 EdgeOne 的模块依赖问题
- 支持 EdgeOne 的 V8 Runtime
- 兼容 Cloudflare Workers 和 EdgeOne 部署

## 故障排除

如果部署失败，检查：
1. `package.json` 中的 `build` 脚本是否存在
2. `index.js` 文件是否正确生成
3. EdgeOne 控制台中的构建日志

## 许可证

MIT License