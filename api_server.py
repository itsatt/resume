# -*- coding: utf-8 -*-
"""
RAG 系统 API 服务 - 性能优化版
整合 RAG 检索 + LLM API（兼容 OpenAI 格式），为简历网站提供后端服务
支持：DeepSeek / 百炼 / Kimi / OpenAI 等

优化特性:
- ✅ LRU 缓存层 (减少重复查询)
- ✅ 请求限流 (防止滥用)
- ✅ 详细监控指标
- ✅ 异步日志追踪
- ✅ 健康检查增强
"""

import os
import sys
import json
import time
import logging
import hashlib
from pathlib import Path
from typing import List, Optional, Dict, Any
from dataclasses import asdict, dataclass
from contextlib import asynccontextmanager
from collections import OrderedDict
from datetime import datetime
import threading

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 配置日志 - 增强格式
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("RAG-API")

# ============ 配置 ============
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.deepseek.com")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")

# RAG 系统路径
RAG_SYSTEM_PATH = Path(os.getenv("RAG_SYSTEM_PATH", "D:/rag_system"))
sys.path.insert(0, str(RAG_SYSTEM_PATH))

# API 服务配置
API_CONFIG = {
    "enable_rate_limit": True,        # 启用请求限流
    "rate_limit_per_minute": 30,      # 每分钟最大请求数
    "enable_cache": True,             # 启用响应缓存
    "cache_max_size": 500,            # 缓存最大条目
    "cache_ttl_seconds": 3600,        # 缓存过期时间 (1 小时)
    "request_timeout_seconds": 120,   # 请求超时时间
    "enable_detailed_logging": True,  # 启用详细日志
}

# ============ 全局状态 ============
rag_system = None
rag_initialized = False

# ============ 缓存层 ============
@dataclass
class CacheEntry:
    """缓存条目"""
    response: dict
    timestamp: float
    access_count: int = 0


class ResponseCache:
    """LRU 响应缓存（带 TTL）"""

    def __init__(self, max_size: int, ttl_seconds: int):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0

    def _get_key(self, query: str, use_rag: bool) -> str:
        """生成缓存键"""
        return hashlib.md5(f"{query}:{use_rag}".encode()).hexdigest()

    def get(self, query: str, use_rag: bool) -> Optional[dict]:
        """获取缓存"""
        if not API_CONFIG["enable_cache"]:
            return None

        key = self._get_key(query, use_rag)

        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None

            entry = self._cache[key]
            # 检查是否过期
            if time.time() - entry.timestamp > self.ttl_seconds:
                del self._cache[key]
                self._misses += 1
                logger.debug(f"🕐 缓存过期：{query[:30]}...")
                return None

            # 移到末尾（LRU）
            self._cache.move_to_end(key)
            entry.access_count += 1
            self._hits += 1
            logger.debug(f"⚡ 缓存命中：{query[:30]}... (第{entry.access_count}次)")
            return entry.response

    def set(self, query: str, use_rag: bool, response: dict):
        """保存缓存"""
        if not API_CONFIG["enable_cache"]:
            return

        key = self._get_key(query, use_rag)

        with self._lock:
            # 如果缓存满了，删除最旧的
            if len(self._cache) >= self.max_size:
                self._cache.popitem(last=False)

            self._cache[key] = CacheEntry(
                response=response,
                timestamp=time.time()
            )
            logger.debug(f"💾 已缓存：{query[:30]}...")

    def clear(self):
        """清空缓存"""
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0

    @property
    def stats(self) -> dict:
        """获取缓存统计"""
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0
        return {
            "size": len(self._cache),
            "max_size": self.max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": f"{hit_rate:.1f}%"
        }


# 全局缓存实例
response_cache = ResponseCache(
    max_size=API_CONFIG["cache_max_size"],
    ttl_seconds=API_CONFIG["cache_ttl_seconds"]
)


# ============ 请求限流器 ============
class RateLimiter:
    """滑动窗口限流器"""

    def __init__(self, max_requests: int, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = {}
        self._lock = threading.Lock()

    def is_allowed(self, client_ip: str) -> tuple[bool, str]:
        """检查请求是否允许"""
        if not API_CONFIG["enable_rate_limit"]:
            return True, ""

        now = time.time()
        window_start = now - self.window_seconds

        with self._lock:
            if client_ip not in self._requests:
                self._requests[client_ip] = []

            # 清理过期请求
            self._requests[client_ip] = [
                t for t in self._requests[client_ip] if t > window_start
            ]

            # 检查是否超限
            if len(self._requests[client_ip]) >= self.max_requests:
                return False, "请求过于频繁，请稍后再试"

            # 记录请求
            self._requests[client_ip].append(now)
            return True, ""


# 全局限流器实例
rate_limiter = RateLimiter(
    max_requests=API_CONFIG["rate_limit_per_minute"],
    window_seconds=60
)


# ============ 监控指标 ============
class Metrics:
    """API 监控指标"""

    def __init__(self):
        self._lock = threading.Lock()
        self._total_requests = 0
        self._rag_requests = 0
        self._llm_requests = 0
        self._errors = 0
        self._total_latency_ms = 0
        self._start_time = time.time()

    def record_request(self, used_rag: bool, latency_ms: float, is_error: bool = False):
        """记录请求指标"""
        with self._lock:
            self._total_requests += 1
            if used_rag:
                self._rag_requests += 1
            else:
                self._llm_requests += 1

            self._total_latency_ms += latency_ms

            if is_error:
                self._errors += 1

    @property
    def stats(self) -> dict:
        """获取指标统计"""
        with self._lock:
            uptime = time.time() - self._start_time
            avg_latency = (
                self._total_latency_ms / self._total_requests
                if self._total_requests > 0 else 0
            )
            return {
                "uptime_seconds": f"{uptime:.0f}",
                "total_requests": self._total_requests,
                "rag_requests": self._rag_requests,
                "llm_requests": self._llm_requests,
                "errors": self._errors,
                "avg_latency_ms": f"{avg_latency:.0f}",
                "qps": f"{self._total_requests / uptime:.2f}" if uptime > 0 else "0"
            }


# 全局指标实例
metrics = Metrics()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global rag_system, rag_initialized

    # 启动时初始化 RAG 系统
    logger.info("🚀 正在初始化 RAG 系统...")
    logger.info(f"📂 RAG 系统路径：{RAG_SYSTEM_PATH}")
    try:
        from rag_system import init_rag
        rag_system = init_rag()
        rag_initialized = True
        logger.info("✅ RAG 系统初始化成功")
    except Exception as e:
        logger.warning(f"⚠️ RAG 系统初始化失败：{e}，将使用纯 API 模式")
        rag_initialized = False

    # 启动后日志
    logger.info("=" * 60)
    logger.info("📊 API 服务配置:")
    logger.info(f"   - 限流：{'✅ 开启' if API_CONFIG['enable_rate_limit'] else '❌ 关闭'} ({API_CONFIG['rate_limit_per_minute']} 请求/分钟)")
    logger.info(f"   - 缓存：{'✅ 开启' if API_CONFIG['enable_cache'] else '❌ 关闭'} (最大{API_CONFIG['cache_max_size']}条，TTL={API_CONFIG['cache_ttl_seconds']}s)")
    logger.info(f"   - LLM API: {'✅ 已配置' if LLM_API_KEY else '❌ 未配置'}")
    logger.info(f"   - RAG 系统：{'✅ 已加载' if rag_initialized else '❌ 未加载'}")
    logger.info("=" * 60)

    yield

    # 关闭时清理
    logger.info("👋 服务关闭中...")
    logger.info(f"📊 最终统计 - 总请求：{metrics.stats['total_requests']}, 错误：{metrics.stats['errors']}")
    logger.info(f"💾 缓存统计 - 大小：{response_cache.stats['size']}, 命中率：{response_cache.stats['hit_rate']}")


app = FastAPI(
    title="RAG API - 李涛的简历网站后端",
    description="整合 RAG 检索 + LLM API，支持 DeepSeek / 百炼 / Kimi / OpenAI 等",
    version="2.0.0 (性能优化版)",
    lifespan=lifespan
)

# CORS 配置（允许前端访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ 中间件 ============
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """请求日志中间件"""
    start_time = time.time()
    client_ip = request.client.host if request.client else "unknown"

    # 执行请求
    try:
        response = await call_next(request)
    except Exception as e:
        latency_ms = (time.time() - start_time) * 1000
        logger.error(f"❌ {request.method} {request.url.path} | {client_ip} | {latency_ms:.0f}ms | 错误：{e}")
        raise

    # 记录日志
    latency_ms = (time.time() - start_time) * 1000
    log_level = logging.WARNING if response.status_code >= 400 else logging.DEBUG

    # 跳过静态文件和健康检查的详细日志
    if not request.url.path.startswith("/health"):
        logger.log(log_level, f"{'📊' if response.status_code < 400 else '❌'} {request.method} {request.url.path} | {client_ip} | {response.status_code} | {latency_ms:.0f}ms")

    return response


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """限流中间件"""
    client_ip = request.client.host if request.client else "unknown"

    # 健康检查不限流
    if request.url.path.startswith("/health"):
        return await call_next(request)

    allowed, message = rate_limiter.is_allowed(client_ip)
    if not allowed:
        logger.warning(f"🚫 限流拦截：{client_ip}")
        raise HTTPException(status_code=429, detail=message)

    return await call_next(request)


# ============ 数据模型 ============
class ChatRequest(BaseModel):
    """聊天请求"""
    query: str = Field(..., description="用户问题", min_length=1, max_length=5000)
    use_rag: bool = Field(True, description="是否使用 RAG 检索")
    stream: bool = Field(False, description="是否流式输出")


class ChatResponse(BaseModel):
    """聊天响应"""
    answer: str
    confidence: str = "unknown"
    retrieval_time_ms: float = 0
    generation_time_ms: float = 0
    sources: List[str] = []
    methods_used: List[str] = []
    cached: bool = False  # 是否来自缓存


class MetricsResponse(BaseModel):
    """监控指标响应"""
    api_metrics: dict
    cache_stats: dict
    rag_status: dict


# ============ LLM API 客户端 ============
async def call_llm_api(
    messages: List[Dict[str, str]],
    stream: bool = False
) -> Any:
    """调用 LLM API（兼容 OpenAI 格式）- 非流式"""

    if not LLM_API_KEY:
        raise HTTPException(status_code=500, detail="LLM API Key 未配置")

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "stream": False,
        "temperature": 0.7,
        "max_tokens": 2000
    }

    url = f"{LLM_BASE_URL}/chat/completions"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        result = response.json()
        return result["choices"][0]["message"]["content"]


async def call_llm_api_stream(
    messages: List[Dict[str, str]]
) -> Any:
    """调用 LLM API（兼容 OpenAI 格式）- 流式，支持 Qwen 思考过程"""

    if not LLM_API_KEY:
        raise HTTPException(status_code=500, detail="LLM API Key 未配置")

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "stream": True,
        "temperature": 0.7,
        "max_tokens": 2000
    }

    url = f"{LLM_BASE_URL}/chat/completions"

    # 使用更低的超时和关闭压缩，加快首字速度
    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=5.0)) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                raise HTTPException(status_code=response.status_code, detail=error_text.decode())

            # 使用 aiter_bytes 而不是 aiter_lines，减少缓冲延迟
            buffer = b""
            in_reasoning = False  # 是否正在返回 reasoning_content

            async for chunk in response.aiter_bytes(chunk_size=16):
                buffer += chunk
                # 按行处理，遇到完整的数据包就立即 yield
                while b"\n" in buffer:
                    line, buffer = buffer.split(b"\n", 1)
                    line = line.decode("utf-8").strip()
                    if line.startswith("data: "):
                        data = line[6:]
                        if data.strip() == "[DONE]":
                            return
                        try:
                            chunk_data = json.loads(data)
                            if chunk_data.get("choices") and chunk_data["choices"][0].get("delta"):
                                delta = chunk_data["choices"][0]["delta"]
                                # 处理 reasoning_content（思考过程）
                                if delta.get("reasoning_content"):
                                    if not in_reasoning:
                                        yield "[THINK]"  # 思考开始标记
                                        in_reasoning = True
                                    yield delta["reasoning_content"]
                                # 处理 content（正式回答）
                                if delta.get("content"):
                                    if in_reasoning:
                                        yield "[/THINK]"  # 思考结束标记
                                        in_reasoning = False
                                    yield delta["content"]
                        except json.JSONDecodeError:
                            continue

            # 如果结束时还在 reasoning 状态，补上结束标记
            if in_reasoning:
                yield "[/THINK]"


# ============ API 路由 ============
@app.get("/")
async def root():
    """健康检查"""
    return {
        "status": "ok",
        "rag_initialized": rag_initialized,
        "message": "李涛的 RAG API 服务运行中 (v2.0)",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/health")
async def health_check():
    """健康检查端点（详细版）"""
    return {
        "status": "healthy",
        "rag_status": "ready" if rag_initialized else "fallback_only",
        "llm_configured": bool(LLM_API_KEY),
        "cache_enabled": API_CONFIG["enable_cache"],
        "rate_limit_enabled": API_CONFIG["enable_rate_limit"],
        "timestamp": time.time()
    }


@app.get("/metrics")
async def get_metrics() -> MetricsResponse:
    """获取监控指标"""
    return MetricsResponse(
        api_metrics=metrics.stats,
        cache_stats=response_cache.stats,
        rag_status={
            "initialized": rag_initialized,
            "system_ready": rag_system is not None,
            "vector_store": os.getenv("VECTOR_STORE_TYPE", "unknown")
        }
    )


@app.post("/api/cache/clear")
async def clear_cache():
    """清空缓存"""
    response_cache.clear()
    logger.info("🗑️ 缓存被手动清空")
    return {"status": "ok", "message": "缓存已清空"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    聊天接口 - 支持 RAG 检索 + LLM API

    优化特性:
    - ✅ 缓存层：避免重复查询
    - ✅ 限流保护：防止滥用
    - ✅ 详细日志：追踪每次请求
    - ✅ 监控指标：记录性能数据
    """
    start_time = time.time()
    client_ip = f"{request.query[:30]}..." if API_CONFIG["enable_detailed_logging"] else "masked"
    used_rag = False
    is_cached = False

    # 1. 检查缓存
    cached_response = response_cache.get(request.query, request.use_rag)
    if cached_response:
        latency_ms = (time.time() - start_time) * 1000
        metrics.record_request(used_rag=False, latency_ms=latency_ms)
        cached_response["cached"] = True
        return ChatResponse(**cached_response)

    # 2. 验证请求
    query = request.query.strip()
    if not query:
        metrics.record_request(used_rag=False, latency_ms=0, is_error=True)
        raise HTTPException(status_code=400, detail="问题不能为空")

    # 3. 尝试使用 RAG 系统
    if request.use_rag and rag_initialized and rag_system:
        try:
            logger.info(f"🔍 [RAG] 检索：{client_ip}")
            used_rag = True

            result = rag_system.query(query)
            retrieval_time = (time.time() - start_time) * 1000

            # 提取来源
            sources = []
            for i, chunk in enumerate(result.source_chunks[:3], 1):
                source = f"文档{i}"
                if hasattr(chunk, 'metadata') and chunk.metadata.get('source'):
                    source = chunk.metadata['source']
                sources.append(source)

            response = ChatResponse(
                answer=result.answer,
                confidence=result.confidence,
                retrieval_time_ms=retrieval_time,
                generation_time_ms=result.generation_time_ms,
                sources=sources,
                methods_used=result.methods_used,
                cached=False
            )

            # 保存到缓存
            response_cache.set(request.query, request.use_rag, response.dict())

            latency_ms = (time.time() - start_time) * 1000
            metrics.record_request(used_rag=True, latency_ms=latency_ms)

            logger.info(f"✅ [RAG] 完成 | {latency_ms:.0f}ms | 置信度：{result.confidence}")
            return response

        except Exception as e:
            logger.warning(f"⚠️ RAG 查询失败：{e}，降级到纯 API 模式")

    # 4. 降级到纯 LLM API
    logger.info(f"💬 [LLM] API 调用：{client_ip}")

    messages = [
        {"role": "system", "content": "你是一个有帮助的 AI 助手。请用简洁、专业的语言回答，并使用与用户提问相同的语言（中文或英文）。"},
        {"role": "user", "content": query}
    ]

    try:
        gen_start = time.time()
        answer = await call_llm_api(messages, stream=False)
        gen_time = (time.time() - gen_start) * 1000

        response = ChatResponse(
            answer=answer,
            confidence="llm_only",
            retrieval_time_ms=0,
            generation_time_ms=gen_time,
            sources=[],
            methods_used=["llm_api"],
            cached=False
        )

        # 保存到缓存
        response_cache.set(request.query, request.use_rag, response.dict())

        latency_ms = (time.time() - start_time) * 1000
        metrics.record_request(used_rag=False, latency_ms=latency_ms)

        logger.info(f"✅ [LLM] 完成 | {latency_ms:.0f}ms")
        return response

    except HTTPException:
        metrics.record_request(used_rag=False, latency_ms=0, is_error=True)
        raise
    except Exception as e:
        logger.error(f"❌ LLM API 调用失败：{e}")
        metrics.record_request(used_rag=False, latency_ms=0, is_error=True)
        raise HTTPException(status_code=500, detail=f"API 调用失败：{str(e)}")


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    流式聊天接口 - 支持 RAG 检索 + LLM API

    优化特性:
    - ✅ 实时状态推送（检索中/生成中）
    - ✅ 详细错误处理
    - ✅ 性能指标记录
    """
    start_time = time.time()
    query = request.query.strip()

    if not query:
        raise HTTPException(status_code=400, detail="问题不能为空")

    # 检查缓存 - 对于流式请求，直接返回缓存结果的单条消息
    cached_response = response_cache.get(request.query, request.use_rag)
    if cached_response:
        logger.info(f"⚡ [Stream] 缓存命中：{query[:30]}...")

        async def generate_cached():
            yield f"data: {json.dumps({'type': 'meta', 'status': 'cached'})}\n"
            yield f"data: {json.dumps({'type': 'content', 'content': cached_response['answer']})}\n"
            yield f"data: {json.dumps({'type': 'meta', 'metrics': {'cached': True, 'confidence': cached_response['confidence']}})}\n"
            yield "data: [DONE]\n"

        return StreamingResponse(
            generate_cached(),
            media_type="text/event-stream"
        )

    async def generate_stream():
        nonlocal start_time

        # 尝试使用 RAG 系统
        if request.use_rag and rag_initialized and rag_system:
            try:
                logger.info(f"🔍 [Stream-RAG] 检索：{query[:30]}...")

                # 发送检索状态
                yield f"data: {json.dumps({'type': 'meta', 'status': 'searching', 'message': '正在检索知识库...'})}\n"

                # 流式 RAG 响应
                full_answer = ""
                for chunk in rag_system.query_stream(query):
                    full_answer += chunk
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n"

                # 发送完成状态和指标
                latency_ms = (time.time() - start_time) * 1000
                metrics.record_request(used_rag=True, latency_ms=latency_ms)

                yield f"data: {json.dumps({'type': 'meta', 'status': 'complete', 'metrics': {'latency_ms': latency_ms, 'cached': False}})}\n"
                yield "data: [DONE]\n"

                # 缓存结果
                response_cache.set(request.query, request.use_rag, {
                    "answer": full_answer,
                    "confidence": "rag",
                    "retrieval_time_ms": 0,
                    "generation_time_ms": latency_ms,
                    "sources": [],
                    "methods_used": ["rag_stream"]
                })

                logger.info(f"✅ [Stream-RAG] 完成 | {latency_ms:.0f}ms")
                return

            except Exception as e:
                logger.warning(f"⚠️ RAG 流式查询失败：{e}，降级到纯 API 模式")

        # 降级到 LLM API 流式
        logger.info(f"💬 [Stream-LLM] API 调用：{query[:30]}...")

        messages = [
            {"role": "system", "content": "你是一个有帮助的 AI 助手。请用简洁、专业的语言回答，并使用与用户提问相同的语言（中文或英文）。"},
            {"role": "user", "content": query}
        ]

        try:
            yield f"data: {json.dumps({'type': 'meta', 'status': 'generating', 'message': '正在生成回答...'})}\n"

            full_answer = ""
            async for content in call_llm_api_stream(messages):
                full_answer += content
                yield f"data: {json.dumps({'type': 'content', 'content': content})}\n"

            latency_ms = (time.time() - start_time) * 1000
            metrics.record_request(used_rag=False, latency_ms=latency_ms)

            yield f"data: {json.dumps({'type': 'meta', 'status': 'complete', 'metrics': {'latency_ms': latency_ms, 'cached': False}})}\n"
            yield "data: [DONE]\n"

            # 缓存结果
            response_cache.set(request.query, request.use_rag, {
                "answer": full_answer,
                "confidence": "llm_only",
                "retrieval_time_ms": 0,
                "generation_time_ms": latency_ms,
                "sources": [],
                "methods_used": ["llm_api_stream"]
            })

            logger.info(f"✅ [Stream-LLM] 完成 | {latency_ms:.0f}ms")

        except Exception as e:
            logger.error(f"❌ 流式生成失败：{e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n"
            yield "data: [DONE]\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 Nginx 缓冲
        }
    )


@app.get("/api/status")
async def rag_status():
    """获取 RAG 系统状态（增强版）"""
    return {
        "rag_initialized": rag_initialized,
        "rag_system_ready": rag_system is not None,
        "llm_configured": bool(LLM_API_KEY),
        "vector_store_type": os.getenv("VECTOR_STORE_TYPE", "unknown"),
        "features": {
            "cache_enabled": API_CONFIG["enable_cache"],
            "rate_limit_enabled": API_CONFIG["enable_rate_limit"],
            "streaming_enabled": True
        },
        "metrics_summary": metrics.stats
    }


# ============ 启动命令 ============
if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))

    logger.info(f"🚀 启动服务：http://{host}:{port}")
    logger.info(f"📊 LLM API: {'已配置' if LLM_API_KEY else '未配置'}")
    logger.info(f"📚 RAG 系统：{'已加载' if rag_initialized else '未加载'}")

    uvicorn.run(app, host=host, port=port)
