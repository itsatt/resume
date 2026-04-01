# RAG Demo 集成说明

将 D 盘 `rag_system` 项目的 RAG 检索功能集成到简历网站中。

## 快速启动

### 1. 配置 API Key

编辑 `.env` 文件，选择你的 LLM 平台并填入 API Key：

```env
# 阿里云百炼 (Qwen)
LLM_API_KEY=sk-your-alibaba-cloud-api-key
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-plus

# Moonshot (Kimi)
LLM_API_KEY=sk-your-moonshot-api-key
LLM_BASE_URL=https://api.moonshot.cn/v1
LLM_MODEL=moonshot-v1-8k

# DeepSeek
LLM_API_KEY=sk-your-deepseek-api-key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat

# OpenAI
LLM_API_KEY=sk-your-openai-api-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 启动 API 服务

双击运行 `start-api.bat` 或执行：

```bash
python api_server.py
```

服务将启动在 `http://127.0.0.1:8000`

### 4. 打开简历网站

直接在浏览器打开 `index.html`，滚动到"现场体验"区域，即可使用 RAG Demo。

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 健康检查 |
| `/health` | GET | 健康状态 |
| `/api/chat` | POST | 聊天接口（非流式） |
| `/api/chat/stream` | POST | 聊天接口（流式） |
| `/api/status` | GET | RAG 系统状态 |

### 请求示例

```bash
curl -X POST http://127.0.0.1:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "什么是 RAG？", "use_rag": true}'
```

### 响应示例

```json
{
  "answer": "RAG（检索增强生成）是一种...",
  "confidence": "high",
  "retrieval_time_ms": 234,
  "generation_time_ms": 1250,
  "sources": ["政府工作报告 (2).pdf"],
  "methods_used": ["hybrid_search", "rerank"]
}
```

## 工作模式

系统支持两种模式：

1. **RAG 模式**：当 `use_rag=true` 且 RAG 系统初始化成功时，使用本地向量库检索 + LLM API 生成
2. **纯 LLM 模式**：当 RAG 系统不可用时，自动降级为纯 LLM API

## 支持的 LLM 平台

| 平台 | 配置示例 |
|------|----------|
| 阿里云百炼 | `LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Moonshot (Kimi) | `LLM_BASE_URL=https://api.moonshot.cn/v1` |
| DeepSeek | `LLM_BASE_URL=https://api.deepseek.com` |
| OpenAI | `LLM_BASE_URL=https://api.openai.com/v1` |

## 故障排除

### 问题：无法连接到 API

确保 `api_server.py` 正在运行：
```bash
python api_server.py
```

### 问题：RAG 系统未初始化

检查：
1. Ollama 服务是否运行 (`http://localhost:11434`)
2. 向量库文件是否存在 (`D:/rag_system/vector_store/faiss.index`)
3. 依赖是否安装完整

### 问题：API Key 无效

检查 `.env` 文件中的 `LLM_API_KEY` 和 `LLM_BASE_URL` 是否正确配置

## 项目结构

```
D:\简历网站\
├── index.html          # 首页（含 Demo 区域）
├── script.js           # 前端交互逻辑
├── styles.css          # 样式
├── api_server.py       # FastAPI 后端服务
├── .env                # 环境变量配置
├── requirements.txt    # Python 依赖
├── start-api.bat       # 启动脚本
└── RAG_DEMO_README.md  # 说明文档
```

## 安全说明

- `.env` 文件包含敏感信息，已添加到 `.gitignore`
- 生产环境部署时，请勿将 API Key 提交到版本控制
