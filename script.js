// ===== 工具函数 =====
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// ===== 终端打字效果 =====
function initTerminalTyping() {
  const typingEl = $('#skills-typing');
  if (!typingEl) return;
  
  const skills = [
    '{ "RAG": "多路召回 + Rerank + 上下文压缩" }',
    '{ "Agent": "ReAct 循环 + 工具编排 + 失败恢复" }',
    '{ "Embedding": "BGE-M3 + 批处理 + 超时重试" }',
    '{ "LocalLLM": "Qwen-3.8B + LoRA + vLLM" }'
  ];
  
  let skillIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let currentText = '';
  
  function type() {
    const targetText = skills[skillIndex];
    
    if (!isDeleting) {
      currentText = targetText.slice(0, charIndex + 1);
      charIndex++;
      
      if (charIndex === targetText.length) {
        isDeleting = true;
        setTimeout(type, 2000);
        return;
      }
    } else {
      currentText = targetText.slice(0, charIndex - 1);
      charIndex--;
      
      if (charIndex === 0) {
        isDeleting = false;
        skillIndex = (skillIndex + 1) % skills.length;
        setTimeout(type, 500);
        return;
      }
    }
    
    typingEl.textContent = currentText;
    setTimeout(type, isDeleting ? 30 : 50);
  }
  
  type();
}

// ===== Three.js 3D 粒子网络背景 =====
function initThreeJSBackground() {
  const container = $('#canvas-container');
  if (!container) return;
  
  // 场景
  const scene = new THREE.Scene();
  
  // 相机
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 30;
  
  // 渲染器
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true 
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  
  // 粒子
  const particleCount = 200;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];
  
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    
    velocities.push({
      x: (Math.random() - 0.5) * 0.02,
      y: (Math.random() - 0.5) * 0.02,
      z: (Math.random() - 0.5) * 0.02
    });
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  // 粒子材质
  const material = new THREE.PointsMaterial({
    color: 0x00f5d4,
    size: 0.3,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });
  
  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
  
  // 连线材质
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x00bbf9,
    transparent: true,
    opacity: 0.15
  });
  
  // 鼠标交互
  let mouseX = 0;
  let mouseY = 0;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });
  
  // 动画循环
  function animate() {
    requestAnimationFrame(animate);
    
    // 更新粒子位置
    const positions = particles.geometry.attributes.position.array;
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] += velocities[i].x;
      positions[i * 3 + 1] += velocities[i].y;
      positions[i * 3 + 2] += velocities[i].z;
      
      // 边界反弹
      if (Math.abs(positions[i * 3]) > 30) velocities[i].x *= -1;
      if (Math.abs(positions[i * 3 + 1]) > 30) velocities[i].y *= -1;
      if (Math.abs(positions[i * 3 + 2]) > 30) velocities[i].z *= -1;
    }
    
    particles.geometry.attributes.position.needsUpdate = true;
    
    // 鼠标交互 - 缓慢旋转
    particles.rotation.x += (mouseY * 0.001 - particles.rotation.x) * 0.05;
    particles.rotation.y += (mouseX * 0.001 - particles.rotation.y) * 0.05;
    
    // 绘制连线
    const lines = [];
    for (let i = 0; i < particleCount; i++) {
      for (let j = i + 1; j < particleCount; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (dist < 8) {
          lines.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
          );
        }
      }
    }
    
    // 移除旧连线
    const oldLine = scene.getObjectByName('lines');
    if (oldLine) scene.remove(oldLine);
    
    // 创建新连线
    if (lines.length > 0) {
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
      const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
      lineMesh.name = 'lines';
      scene.add(lineMesh);
    }
    
    renderer.render(scene, camera);
  }
  
  animate();
  
  // 窗口大小调整
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ===== Canvas 雷达图 =====
function initRadarChart() {
  const canvas = $('#radar-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  
  // 设置画布尺寸
  const rect = canvas.parentElement.getBoundingClientRect();
  const size = Math.min(rect.width - 80, 400);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);
  
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size / 2) - 40;
  
  // 技能数据
  const skills = [
    { name: 'RAG 系统', engineering: 90, algorithm: 85, architecture: 88 },
    { name: 'Agent', engineering: 82, algorithm: 78, architecture: 80 },
    { name: 'Prompt', engineering: 95, algorithm: 70, architecture: 75 },
    { name: 'Embedding', engineering: 88, algorithm: 82, architecture: 80 },
    { name: '本地部署', engineering: 85, algorithm: 75, architecture: 82 }
  ];
  
  const colors = {
    engineering: '#00f5d4',
    algorithm: '#00bbf9',
    architecture: '#9b5de5'
  };
  
  // 绘制背景网格
  function drawGrid() {
    const levels = 5;
    for (let i = 1; i <= levels; i++) {
      const r = (radius / levels) * i;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(100, 140, 200, 0.15)';
      ctx.lineWidth = 1;
      
      for (let j = 0; j < 5; j++) {
        const angle = (j * 2 * Math.PI / 5) - Math.PI / 2;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  
  // 绘制轴线
  function drawAxes() {
    ctx.strokeStyle = 'rgba(100, 140, 200, 0.3)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
      
      // 标签
      const labelX = centerX + Math.cos(angle) * (radius + 25);
      const labelY = centerY + Math.sin(angle) * (radius + 25);
      ctx.fillStyle = '#a0b4d8';
      ctx.font = '12px "Noto Sans SC"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(skills[i].name, labelX, labelY);
    }
  }
  
  // 绘制技能多边形
  function drawSkillPolygon(data, color, key) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillStyle = color.replace(')', ', 0.2)').replace('rgb', 'rgba');
    
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const value = data[i][key];
      const r = (value / 100) * radius;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  
  // 绘制点
  function drawPoints(data, color, key) {
    ctx.fillStyle = color;
    
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const value = data[i][key];
      const r = (value / 100) * radius;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // 动画绘制
  let progress = 0;
  function animateChart() {
    ctx.clearRect(0, 0, size, size);
    
    drawGrid();
    drawAxes();
    
    if (progress < 1) {
      progress += 0.02;
      
      // 临时缩放数据用于动画
      const animatedSkills = skills.map(s => ({
        ...s,
        engineering: s.engineering * progress,
        algorithm: s.algorithm * progress,
        architecture: s.architecture * progress
      }));
      
      drawSkillPolygon(animatedSkills, colors.architecture, 'architecture');
      drawSkillPolygon(animatedSkills, colors.algorithm, 'algorithm');
      drawSkillPolygon(animatedSkills, colors.engineering, 'engineering');
      
      drawPoints(animatedSkills, colors.architecture, 'architecture');
      drawPoints(animatedSkills, colors.algorithm, 'algorithm');
      drawPoints(animatedSkills, colors.engineering, 'engineering');
      
      requestAnimationFrame(animateChart);
    } else {
      // 最终状态
      drawSkillPolygon(skills, colors.architecture, 'architecture');
      drawSkillPolygon(skills, colors.algorithm, 'algorithm');
      drawSkillPolygon(skills, colors.engineering, 'engineering');
      
      drawPoints(skills, colors.architecture, 'architecture');
      drawPoints(skills, colors.algorithm, 'algorithm');
      drawPoints(skills, colors.engineering, 'engineering');
    }
  }
  
  animateChart();
}

// ===== 滚动揭示动画 =====
function initScrollReveal() {
  const elements = $$('.reveal-on-scroll');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  elements.forEach(el => observer.observe(el));
}

// ===== Demo 交互 =====
const API_BASE_URL = 'http://127.0.0.1:8000';

function initDemo() {
  const submitBtn = $('#submit-demo');
  const queryInput = $('#demo-query');
  const responseEl = $('#demo-response');

  if (!submitBtn || !queryInput || !responseEl) return;

  // 检查 API 状态
  checkApiStatus();

  // 获取当前选择的模式
  function getSelectedMode() {
    const selected = document.querySelector('input[name="demo-mode"]:checked');
    return selected ? selected.value : 'simple';
  }

  // 监听模式切换
  document.querySelectorAll('input[name="demo-mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const mode = getSelectedMode();
      const currentLang = document.documentElement.getAttribute('data-lang') || 'zh';
      const t = translations[currentLang];
      const placeholder = mode === 'rag'
        ? (t['demo-rag-placeholder'] || t['demo-input-placeholder'])
        : (t['demo-simple-placeholder'] || "Enter any question, e.g., 'Hello, introduce yourself'");
      $('#demo-query').placeholder = placeholder;
    });
  });

  // 监听回车键发送
  queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitBtn.click();
    }
  });

  submitBtn.addEventListener('click', async () => {
    const query = queryInput.value.trim();
    if (!query) return;

    const mode = getSelectedMode();
    const useRag = mode === 'rag';

    // 加载状态
    const currentLang = document.documentElement.getAttribute('data-lang') || 'zh';
    const t = translations[currentLang];
    const loadingText = useRag ? (t['demo-searching'] || '检索中...') : (t['demo-thinking'] || '思考中...');
    const loadingHint = useRag ? (t['demo-searching-kb'] || '正在检索知识库...') : (t['demo-generating'] || '正在生成回答...');

    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = loadingText;
    submitBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-dasharray="30" stroke-dashoffset="0">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
        </circle>
      </svg>
      <span>${loadingText}</span>
    `;

    responseEl.innerHTML = `
      <div class="response-loading">
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
        <p>${loadingHint}</p>
      </div>
    `;

    try {
      // 使用流式请求 - 边接收边显示
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          use_rag: useRag,
          stream: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'API 请求失败');
      }

      // 流式读取 SSE 响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = '';
      let meta = null;
      let thinkingContent = '';
      let isInThinkBlock = false;

      responseEl.innerHTML = '<div class="response-content streaming"><div class="reasoning-status" style="display:none;"><span class="reasoning-icon">🤔</span><span class="reasoning-text"></span></div><div class="answer-text"></div></div>';
      const contentEl = responseEl.querySelector('.response-content');
      const answerEl = responseEl.querySelector('.answer-text');
      const reasoningEl = responseEl.querySelector('.reasoning-status');
      const reasoningTextEl = reasoningEl.querySelector('.reasoning-text');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);

            // 跳过 [DONE] 标记
            if (dataStr.trim() === '[DONE]') {
              continue;
            }

            try {
              const data = JSON.parse(dataStr);

              // 调试用：打印收到的数据
              console.log('SSE data:', data);

              if (data.type === 'content') {
                const content = data.content;

                // 思考内容最大显示长度
                const MAX_THINK_LENGTH = 200;

                // 检测思考开始标记 [THINK]
                if (content.includes('[THINK]')) {
                  isInThinkBlock = true;
                  thinkingContent = '';
                  reasoningEl.style.display = 'flex';
                  // 提取 [THINK] 后面的内容
                  const afterThink = content.split('[THINK]')[1] || '';
                  if (afterThink && !afterThink.includes('[/THINK]')) {
                    thinkingContent += afterThink;
                    // 超过长度时显示省略号
                    const displayText = thinkingContent.length > MAX_THINK_LENGTH
                      ? '...' + thinkingContent.slice(-MAX_THINK_LENGTH)
                      : thinkingContent;
                    reasoningTextEl.textContent = '正在思考：' + displayText;
                  }
                }
                // 检测思考结束标记 [/THINK]
                else if (content.includes('[/THINK]')) {
                  isInThinkBlock = false;
                  // 提取 [/THINK] 前面的内容
                  const beforeEnd = content.split('[/THINK]')[0] || '';
                  if (beforeEnd) {
                    thinkingContent += beforeEnd;
                  }
                  // 思考结束，隐藏状态条
                  reasoningEl.style.display = 'none';
                }
                // 思考中的内容，累积显示（带长度限制）
                else if (isInThinkBlock) {
                  thinkingContent += content;
                  const displayText = thinkingContent.length > MAX_THINK_LENGTH
                    ? '...' + thinkingContent.slice(-MAX_THINK_LENGTH)
                    : thinkingContent;
                  reasoningTextEl.textContent = '正在思考：' + displayText;
                }
                // 正常回答内容，累积显示
                else {
                  fullAnswer += content;
                  answerEl.textContent = fullAnswer;
                  contentEl.scrollTop = contentEl.scrollHeight;
                }
              } else if (data.type === 'meta') {
                meta = data;
              }
            } catch (e) {
              console.warn('JSON 解析失败:', dataStr);
            }
          }
        }
      }

      // 渲染完成后的元信息
      if (meta) {
        const metricsHtml = meta.metrics ? `
          <div class="response-metrics">
            <span>⚡ ${Math.round(meta.metrics.latency_ms)}ms</span>
            ${meta.metrics.cached ? '<span>📦 缓存命中</span>' : ''}
          </div>
        ` : '';
        contentEl.innerHTML += metricsHtml;
      }

    } catch (error) {
      console.error('API 调用失败:', error);
      responseEl.innerHTML = `
        <div class="response-error">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>请求失败：${error.message}</p>
          <p class="error-hint">请确保后端服务已启动：python api_server.py</p>
        </div>
      `;
    } finally {
      submitBtn.disabled = false;
      const mode = getSelectedMode();
      const currentLang = document.documentElement.getAttribute('data-lang') || 'zh';
      const t = translations[currentLang];
      const sendText = t['demo-send'] || '发送';
      submitBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
        <span>${sendText}</span>
      `;
    }
  });

  // 渲染响应内容
  function renderResponse(data, el) {
    const confidenceLabels = {
      'high': '✅ 高',
      'medium': '⚡ 中',
      'low': '⚠️ 低',
      'llm_only': '💬 纯 LLM'
    };

    const confidenceColors = {
      'high': '#00f5d4',
      'medium': '#00bbf9',
      'low': '#f59e0b',
      'llm_only': '#9b5de5'
    };

    el.innerHTML = `
      <div class="response-content">
        <div class="response-meta">
          <span class="meta-tag" style="border-color: ${confidenceColors[data.confidence] || '#666'}">
            置信度：${confidenceLabels[data.confidence] || data.confidence}
          </span>
          ${data.retrieval_time_ms > 0 ? `<span class="meta-tag">检索：${data.retrieval_time_ms.toFixed(0)}ms</span>` : ''}
          ${data.generation_time_ms > 0 ? `<span class="meta-tag">生成：${data.generation_time_ms.toFixed(0)}ms</span>` : ''}
        </div>
        <div class="response-text">${formatResponseText(data.answer)}</div>
        ${data.sources && data.sources.length > 0 ? `
          <div class="response-sources">
            <small>📚 来源：${data.sources.join(', ')}</small>
          </div>
        ` : ''}
        ${data.methods_used && data.methods_used.length > 0 ? `
          <div class="response-methods">
            <small>🔧 方法：${data.methods_used.join(', ')}</small>
          </div>
        ` : ''}
      </div>
    `;
  }

  // 格式化响应文本（支持简单的 markdown）
  function formatResponseText(text) {
    // 加粗
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // 斜体
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // 换行
    text = text.replace(/\n/g, '<br/>');
    return text;
  }

  // 检查 API 状态
  async function checkApiStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const status = await response.json();
        console.log('RAG API 状态:', status);

        if (!status.rag_initialized) {
          console.warn('⚠️ RAG 系统未初始化，将使用纯 API 模式');
        }
        if (!status.deepseek_configured) {
          console.warn('⚠️ DeepSeek API Key 未配置');
        }
      }
    } catch (error) {
      console.warn('无法连接到 RAG API，请确保后端服务已启动');
    }
  }
}

// ===== 双语翻译数据 =====
const translations = {
  zh: {
    // 导航
    'nav-home': '首页',
    'nav-projects': '项目',
    'nav-curriculum': '课程',
    'nav-knowledge': '图谱',

    // 英雄区域
    'hero-badge': '开放求职 · AI 应用/系统工程师',
    'hero-title-line1': '李涛',
    'hero-title-line2': '把 AI 能力',
    'hero-title-line3': '工程化交付',
    'hero-university': '太原科技大学 · 光电信息科学与工程（2022 届）',
    'hero-focus': '专注 RAG 系统优化 / Agent 工作流 / 本地模型部署',
    'tag-experience': '🎯 3 年 AI 工程经验',
    'tag-location': '📍 重庆',
    'tag-type': '💼 全职',
    'btn-projects': '查看项目',
    'btn-demo': '交互 Demo',

    // 技能时间线
    'timeline-title': '成长时间线',
    'timeline-desc': '3 年 AI 工程化能力提升路径',
    'timeline-1-title': '毕业入行 · 嵌入式与小程序开发',
    'timeline-1-desc': '太原科技大学光电信息科学与工程专业毕业，进入软件行业。负责嵌入式系统开发与微信小程序项目，打下扎实的编程基础。',
    'timeline-1-detail-1': '使用 C/C++ 进行 STM32 单片机开发，实现 BLE 蓝牙通信与传感器数据采集',
    'timeline-1-detail-2': '开发微信小程序项目，负责页面布局、业务逻辑实现与 API 接口对接',
    'timeline-1-detail-3': '掌握嵌入式系统调试、硬件通信协议（I2C/SPI/UART）与低功耗优化',
    'tag1-1': 'C/C++',
    'tag1-2': '嵌入式系统',
    'tag1-3': '微信小程序',
    'timeline-2-title': '转岗全栈 · OpenHarmony 应用开发',
    'timeline-2-desc': '加入某通讯公司，使用 ArkTS 开发 OpenHarmony 应用，负责 RTK 定位系统与丝杆检测系统的端到端开发。',
    'timeline-2-detail-1': '开发 RTK 定位系统，实现芯片定位数据的二维可视化展示与轨迹追踪',
    'timeline-2-detail-2': '负责丝杆检测系统开发，通过硬件控制探头往返运动并采集数据',
    'timeline-2-detail-3': '编写 CMake 脚本实现 C++ 底层算法与 ArkTS 的无缝集成',
    'timeline-2-detail-4': '通过 XTS 测试和 MDTP 应用测试，完成 MineHarmony 认证',
    'tag2-1': 'ArkTS',
    'tag2-2': 'OpenHarmony',
    'tag2-3': 'CMake',
    'timeline-3-title': 'AI 转型 · RAG 系统与智能安防',
    'timeline-3-desc': '主导智能安防 Agent 系统开发，实现从传统软件开发向 AI 工程化的转型，掌握 RAG 检索增强与 Agent 工作流技术。',
    'timeline-3-detail-1': '设计 RAG 架构，使用 FAISS/Chroma 实现双路召回，准确率提升 47%',
    'timeline-3-detail-2': '集成 Qwen-38B 大模型，通过 Prompt Engineering 实现告警日志智能分析',
    'timeline-3-detail-3': '开发 Vue3+Three.js 可视化界面，支持 6 大功能模块联动展示',
    'timeline-3-detail-4': '实现 WebSocket 实时通讯，支持告警动态推送与 AI 实时反馈',
    'tag3-1': 'RAG',
    'tag3-2': 'FAISS/Chroma',
    'tag3-3': 'Qwen-38B',
    'timeline-4-title': 'AI 深化 · Agent 工作流与巡检平台',
    'timeline-4-desc': '构建智能巡检平台，集成 3D 可视化、视频流处理、实时通讯与 AI 图像识别，形成完整 AI 工程化能力。',
    'timeline-4-detail-1': '搭建智能巡检平台，实现多传感器数据采集、设备管理与远程控制',
    'timeline-4-detail-2': '集成 H.265 视频流（WebRTC/RTSP），延迟<500ms，支持云端转发',
    'timeline-4-detail-3': '使用 Three.js 实现 3D 可视化，支持设备状态实时渲染与巡检路径规划',
    'timeline-4-detail-4': '接入 AI 图像识别服务，实现仪表读数识别与异常检测功能',
    'tag4-1': 'Agent',
    'tag4-2': 'Three.js',
    'tag4-3': '视频流',

    // 项目
    'projects-title': '代表项目',
    'projects-view-all': '查看全部',
    'project-featured-tag': '旗舰项目',
    'project-1-title': '智能安防 Agent 系统',
    'project-1-desc': 'RAG 架构 + Qwen-38B 集成，实现告警日志智能分析与异常检测',
    'metric-accuracy': '准确率提升',
    'metric-modules': '功能模块',
    'metric-realtime': 'WebSocket',
    'view-details': '查看详情',
    'view-details-arrow': '查看详情 →',
    'project-2-title': '鸿蒙应用开发',
    'project-2-desc': 'RTK 定位系统 + 丝杆检测，ArkTS 开发 + CMake 集成',
    'project-3-tag': '巡检平台',
    'project-3-title': '智能巡检平台',
    'project-3-desc': '3D 可视化 + H.265 视频流 + AI 图像识别 + 多端协同',

    // Demo
    'demo-title': '现场体验',
    'demo-desc': '试试我的 RAG 系统（Demo 版本）',
    'demo-simple': '简单问答',
    'demo-simple-desc': '快速响应，适合日常对话',
    'demo-rag': 'RAG 检索',
    'demo-rag-desc': '基于知识库，适合专业问题',
    'demo-send': '发送',
    'demo-placeholder': '选择模式后，点击上方发送按钮体验',
    'demo-input-placeholder': "输入任何问题，例如：'你好，介绍一下自己'",
    'demo-simple-placeholder': "输入任何问题，例如：'你好，介绍一下自己'",
    'demo-rag-placeholder': "输入你的问题，例如：'RAG 系统中如何提升检索准确率？'",
    'demo-searching': '检索中...',
    'demo-thinking': '思考中...',
    'demo-searching-kb': '正在检索知识库...',
    'demo-generating': '正在生成回答...',

    // 页脚
    'footer-brand': 'LT',
    'footer-desc': '交互式 AI 简历',
    'footer-download': '下载 PDF',
    'footer-name': '李涛',
    'footer-projects': '项目详情',
    'footer-curriculum': '学习课程',
    'footer-knowledge': '知识图谱',

    // 课程页面
    'curriculum-title': 'AI 工程学习课程',
    'curriculum-subtitle': '体系化学习路径 · 方法论 + 实战成果 + 下一步计划',
    'progress-overall': '整体进度',
    'progress-desc': '已完成 <strong>4/5</strong> 个阶段',
    'status-completed': '✓ 已完成',
    'status-progress': '⏳ 进行中',
    'status-pending': '⏸️ 计划中',
    'stage-output': '阶段产出',
    'stage-1-title': 'Prompt Engineering 与规则基础',
    'stage-1-desc': '让模型输出稳定可控，减少幻觉与无关回答',
    'topic-1-1': 'Prompt 结构化',
    'topic-1-1-desc': 'Role / Context / Task / Output Format 四要素设计',
    'topic-1-2': '模板管理',
    'topic-1-2-desc': 'Few-shot、Chain-of-thought 指引、约束词设计',
    'topic-1-3': '正则匹配与规则分析',
    'topic-1-3-desc': '输入清洗、敏感词策略、异常问句分类',
    'output-1-1': '📄 Prompt 模板库（20+ 模板）',
    'output-1-2': '🛡️ 输入过滤规则集',
    'output-1-3': '📊 输出质量评估表',
    'stage-2-title': 'LangChain + 向量数据库',
    'stage-2-desc': '把文档问答做成可检索、可追溯、可评估的 RAG 系统',
    'topic-2-1': '文档切分策略',
    'topic-2-1-desc': 'chunk_size、overlap、语义边界判断',
    'topic-2-2': 'Embedding 模型选型',
    'topic-2-2-desc': 'BGE-M3 vs text2vec，向量维度一致性校验',
    'topic-2-3': 'Chroma / FAISS 对比',
    'topic-2-3-desc': '速度、部署难度、维护成本评估',
    'topic-2-4': '多路召回',
    'topic-2-4-desc': 'BM25 + Dense Retrieval 融合策略',
    'output-2-1': '📚 ChromaDB 完整教程',
    'output-2-2': '🔧 RAG 优化框架文档',
    'output-2-3': '💻 可运行 Demo',
    'stage-3-title': 'Agent（ReAct / 工作流）',
    'stage-3-desc': '从"问答机器人"升级到"任务执行系统"',
    'topic-3-1': 'ReAct 循环',
    'topic-3-1-desc': 'Reason-Act 闭环，工具调用策略与执行日志',
    'topic-3-2': '工作流编排',
    'topic-3-2-desc': '节点化编排、可视化流程、状态回溯',
    'topic-3-3': '工具调用安全',
    'topic-3-3-desc': '参数白名单、调用次数限制、越权阻断',
    'output-3-1': '🤖 ReAct Agent Demo',
    'output-3-2': '📋 任务状态机设计文档',
    'stage-4-title': '本地模型与轻量微调',
    'stage-4-desc': '提升模型可控性，形成本地化可交付方案',
    'topic-4-1': 'Qwen-3.8B 本地部署',
    'topic-4-1-desc': '推理参数优化、上下文窗口配置',
    'topic-4-2': 'LoRA / PEFT 学习',
    'topic-4-2-desc': '参数高效微调、样本构建、对比评估',
    'topic-4-3': 'RAG + 本地模型',
    'topic-4-3-desc': '用检索弥补模型知识盲区',
    'output-4-1': '📝 本地部署方案文档',
    'output-4-2': '📊 性能对比报告',
    'stage-5-title': '生产化与监控',
    'stage-5-desc': '从 Demo 到生产系统的最后一公里',
    'topic-5-1': '性能评估',
    'topic-5-1-desc': '延迟、准确率、召回率、稳定性监控',
    'topic-5-2': '告警与日志',
    'topic-5-2-desc': '异常检测、错误追踪、性能告警',
    'topic-5-3': '持续优化',
    'topic-5-3-desc': 'A/B 测试、用户反馈闭环、模型迭代',

    // 项目页面
    'projects-page-title': '项目实战与工程化能力',
    'projects-page-subtitle': '每个项目都突出：<strong>问题定义 → 技术方案 → 关键优化 → 可量化结果</strong>',
    'tag-production': '生产级',
    'tag-embedded': '嵌入式',
    'tag-workflow': '工作流',
    'diagram-system-arch': '系统架构',
    'diagram-input': '输入',
    'diagram-input-docs': '告警日志/传感器数据',
    'diagram-parse': '数据解析',
    'diagram-parse-desc': '结构化处理',
    'diagram-retrieve': 'RAG 检索',
    'diagram-retrieve-desc': 'FAISS + Chroma 双路',
    'diagram-rerank-desc': '相似度匹配 + 去重',
    'diagram-agent': 'Agent 分析',
    'diagram-agent-desc': 'Qwen-38B 调用',
    'diagram-generate': '输出',
    'diagram-generate-desc': '告警分类/报告生成',
    'section-tech-solution': '技术方案',
    'tech-parse-layer': 'RAG 架构设计',
    'tech-parse-layer-desc': '告警日志结构化处理，Chunking 分块策略，支持 FAISS/Chroma 双向量库',
    'tech-retrieve-layer': '多路召回融合',
    'tech-retrieve-layer-desc': '相似度匹配 + 关键词匹配 + Rerank 重排序，准确率提升 47%',
    'tech-sort-layer': 'Qwen-38B 集成',
    'tech-sort-layer-desc': 'Prompt Engineering 设计告警分析模板，实现原因归纳与报告自动生成',
    'tech-safety-layer': 'Vue3 可视化',
    'tech-safety-layer-desc': 'Three.js 3D 展示 + WebSocket 实时更新，支持 6 大功能模块联动',
    'card-performance': '性能指标',
    'card-tech-stack': '技术栈',
    'metric-recall': '召回路径',
    'metric-modules': '功能模块',
    'metric-realtime': 'WebSocket',
    'optimization-title': '关键优化点',
    'optimization-desc': '解决实际工程问题的具体方案',
    'opt-1-title': 'RAG 双路召回融合',
    'opt-1-desc': 'FAISS + Chroma 双向量库策略',
    'opt-1-result': '准确率提升 47%',
    'opt-2-title': 'C++ 与 ArkTS 集成',
    'opt-2-desc': '底层算法无缝调用',
    'opt-2-result': '性能提升 3 倍',
    'opt-3-title': 'H.265 视频流优化',
    'opt-3-desc': '多协议适配降低延迟',
    'opt-3-result': '延迟 < 500ms',
    'opt-4-title': 'WebSocket 实时通讯',
    'opt-4-desc': '双向数据同步',
    'opt-4-result': '实时同步 < 100ms',
    'result-label': '结果：',
    'project-2-core-design': '核心设计',
    'agent-reason-act': 'RTK 定位系统',
    'agent-reason-act-desc': '二维展示 RTK 芯片从定位点到固定点的过程，实现数据可视化',
    'agent-roles': '丝杆检测系统',
    'agent-roles-desc': '通过硬件控制探头往返运动，在 UIS7875/RK3588 平台实现数据展示',
    'agent-tools': 'CMake 集成',
    'agent-tools-desc': '编写 CMake 脚本实现 C++ 与 ArkTS 无缝集成，支持底层算法调用',
    'agent-recovery': 'XTS/MDTP 认证',
    'agent-recovery-desc': '通过 XTS 测试和 MDTP 应用测试，完成 MineHarmony 认证',
    'project-2-results': '执行效果',
    'agent-systems': '系统开发',
    'agent-cert': '认证通过',
    'agent-completion-rate': '任务完成率',
    'agent-iterations': '平均迭代次数',
    'project-3-implementation': '实施路径',
    'llm-inference': '3D 可视化平台',
    'llm-inference-desc': '使用 Three.js 实现 3D 建模，搭建巡检设备管理界面与巡检点配置',
    'llm-params': 'WebSocket 通讯',
    'llm-params-desc': '双向实时通讯，接收传感器数据并控制设备，支持多端协同',
    'llm-lora': 'H.265 视频流',
    'llm-lora-desc': '集成 EasyWasmPlayer/WebRTC/RTSP，实现高清视频流畅播放与转发',
    'llm-comparison': 'AI 图像识别',
    'llm-comparison-desc': '接入 AI 图像识别服务，实现仪表读数识别与异常检测功能',
    'project-3-metrics': '功能特性',
    'llm-viz': '可视化',
    'llm-stream': '视频流',
    'llm-cost': '成本降低',
    'llm-latency': '延迟降低',
    'project-2-core-design': '核心设计',
    'agent-reason-act': 'Reason-Act 循环',
    'agent-reason-act-desc': '先推理再调用工具，避免盲目生成。每次迭代记录思考轨迹。',
    'agent-roles': '角色分工',
    'agent-roles-desc': 'Planner（任务拆解）→ Retriever（检索）→ ToolRunner（执行）→ Reporter（整合）',
    'agent-tools': '工具接入',
    'agent-tools-desc': '检索工具、计算工具、规则引擎、知识库查询，支持动态注册',
    'agent-recovery': '失败恢复',
    'agent-recovery-desc': '步骤回退、自动重试、降级回答策略，保证系统鲁棒性',
    'project-2-results': '执行效果',
    'agent-completion-rate': '任务完成率',
    'agent-iterations': '平均迭代次数',
    'project-3-title': 'Qwen-3.8B 本地部署与微调',
    'project-3-implementation': '实施路径',
    'llm-inference': '本地推理配置',
    'llm-inference-desc': 'vLLM 推理引擎，4-bit 量化，上下文窗口 8K，单卡 24GB 显存可运行',
    'llm-params': '推理参数优化',
    'llm-params-desc': 'temperature=0.7, top_p=0.9, repetition_penalty=1.1，平衡创造性与稳定性',
    'llm-lora': 'LoRA / PEFT 微调',
    'llm-lora-desc': '参数高效微调，仅训练 0.1% 参数，注入领域知识，成本降低 90%',
    'llm-comparison': '性能对比',
    'llm-comparison-desc': '对比云端 API：成本 -83%，延迟 -40%，可控性 +100%',
    'project-3-metrics': '性能对比',
    'llm-cost': '成本降低',
    'llm-latency': '延迟降低',

    // 知识图谱页面
    'knowledge-title': 'LLM 工程知识图谱',
    'knowledge-subtitle': '拖拽节点探索知识关联 · 点击查看详情',
    'btn-reset-view': '重置视图',
    'btn-toggle-labels': '显示标签',
    'legend-core': '核心能力',
    'legend-retrieval': '检索技术',
    'legend-agent': 'Agent',
    'legend-deployment': '模型部署',
    'knowledge-timeline-title': '知识关联主线',
    'knowledge-timeline-desc': '技术演进的逻辑链条',
    'timeline-step-1-title': 'Prompt → 检索',
    'timeline-step-1-desc': '高质量 Prompt 决定检索目标和上下文组装质量。结构化输出让后续处理更可靠。',
    'timeline-step-2-title': '检索 → Agent',
    'timeline-step-2-desc': 'Agent 通过 ReAct 调度检索和工具执行，完成复杂任务。检索是 Agent 的"眼睛"。',
    'timeline-step-3-title': 'Agent → 本地模型',
    'timeline-step-3-desc': '把任务链迁移到本地 Qwen，兼顾隐私与可控性。减少云端依赖，降低成本。',
    'timeline-step-4-title': '本地模型 → 微调',
    'timeline-step-4-desc': '用 LoRA / PEFT 增强领域表达，再配合 RAG 保持知识新鲜。微调 + 检索双轮驱动。',
    'knowledge-skills-title': '技能掌握度详情',
    'knowledge-skills-desc': '点击节点查看详细信息',
    'level-high': '高',
    'level-medium-high': '中高',
    'level-medium': '中',
    'skill-prompt': 'Prompt Engineering',
    'skill-prompt-desc': '模板设计、约束输出、思维链引导、错误案例迭代',
    'skill-react': 'ReAct Agent',
    'skill-react-desc': 'Reason-Act 循环，工具调用策略与执行日志分析',
    'skill-langchain': 'LangChain',
    'skill-langchain-desc': '文档加载、切分、检索链与任务链集成',
    'skill-chroma': 'Chroma / FAISS',
    'skill-chroma-desc': '向量库选型、索引管理、召回效率与精度平衡',
    'skill-embedding': 'Embedding',
    'skill-embedding-desc': '模型适配、批处理、超时重试与异常恢复',
    'skill-rerank': 'Rerank 与评估',
    'skill-rerank-desc': '相关性评分、上下文压缩与答案置信度分级',
    'skill-lora': 'LoRA / PEFT',
    'skill-lora-desc': '参数高效微调方法、样本构建与对比评估',
    'skill-qwen': 'Qwen-3.8B 本地运行',
    'skill-qwen-desc': '本地推理配置、性能权衡、与 RAG 结合部署',
    'skill-multi': '多路召回',
    'skill-multi-desc': 'BM25 + Dense + Rule-based 融合召回与重排序',
    'skill-safety': '安全护栏',
    'skill-safety-desc': '输入输出安全策略、越权限制、低置信度降级',
    'tag-prompt-eng': 'Prompt Engineering',
    'tag-structured-output': '结构化输出',
    'tag-react': 'ReAct',
    'tag-tool-calling': '工具调用',
    'tag-qwen': 'Qwen-3.8B',
    'tag-local-deploy': '本地部署',
    'tag-lora': 'LoRA',
    'tag-peft': 'PEFT',
    'tag-rag': 'RAG',
    'tag-role-context': 'Role/Context/Task',
    'tag-few-shot': 'Few-shot',
    'tag-cot': 'CoT',
    'tag-output-validation': '输出校验',
    'tag-planner': 'Planner',
    'tag-tool-runner': 'ToolRunner',
    'tag-failure-recovery': '失败恢复',
    'tag-doc-loader': 'Document Loader',
    'tag-retrieval-chain': 'Retrieval Chain',
    'tag-agent-executor': 'Agent Executor',
    'tag-persistence': '持久化',
    'tag-metadata-filter': '元数据过滤',
    'tag-batch-insert': '批量插入',
    'tag-bge-m3': 'BGE-M3',
    'tag-batch-processing': 'Batch Processing',
    'tag-retry-logic': 'Retry Logic',
    'tag-bge-reranker': 'BGE-Reranker',
    'tag-rrf-fusion': 'RRF 融合',
    'tag-confidence': '置信度',
    'tag-qlora': 'QLoRA',
    'tag-sample-build': '样本构建',
    'tag-vllm': 'vLLM',
    'tag-gguf': 'GGUF',
    'tag-4bit-quant': '4-bit 量化',
    'tag-bm25': 'BM25',
    'tag-vector-search': '向量检索',
    'tag-rrf': 'RRF',
    'tag-injection-detect': '注入检测',
    'tag-sensitive-words': '敏感词',
    'tag-degrade-strategy': '降级策略'
  },
  en: {
    // 导航
    'nav-home': 'Home',
    'nav-projects': 'Projects',
    'nav-curriculum': 'Courses',
    'nav-knowledge': 'Knowledge',

    // 英雄区域
    'hero-badge': 'Open to Work · AI Application/System Engineer',
    'hero-title-line1': 'Leo',
    'hero-title-line2': 'Engineering',
    'hero-title-line3': 'AI Capabilities',
    'hero-university': 'Taiyuan University of Science & Technology · Optoelectronic Information Science (2022)',
    'hero-focus': 'Focus on RAG System / Agent Workflow / Local LLM Deployment',
    'tag-experience': '🎯 3 Years AI Engineering',
    'tag-location': '📍 Chongqing',
    'tag-type': '💼 Full-time',
    'btn-projects': 'View Projects',
    'btn-demo': 'Interactive Demo',

    // 技能时间线
    'timeline-title': 'Growth Timeline',
    'timeline-desc': '3 Years of AI Engineering Journey',
    'timeline-1-title': 'Graduation · Embedded & Mini-Program Development',
    'timeline-1-desc': 'Graduated from Taiyuan University of Science & Technology with a major in Optoelectronic Information Science. Started software industry with embedded system development and WeChat mini-programs, building solid programming foundation.',
    'timeline-1-detail-1': 'Developed STM32 microcontroller projects using C/C++, implemented BLE communication and sensor data acquisition',
    'timeline-1-detail-2': 'Built WeChat mini-programs, responsible for page layout, business logic implementation and API integration',
    'timeline-1-detail-3': 'Mastered embedded system debugging, hardware communication protocols (I2C/SPI/UART) and low-power optimization',
    'tag1-1': 'C/C++',
    'tag1-2': 'Embedded Systems',
    'tag1-3': 'WeChat Mini-Program',
    'timeline-2-title': 'Full-Stack Transition · OpenHarmony App Development',
    'timeline-2-desc': 'Joined a communications company, developed OpenHarmony applications using ArkTS, responsible for end-to-end development of RTK positioning system and screw rod detection system.',
    'timeline-2-detail-1': 'Developed RTK positioning system with 2D visualization for chip positioning data and trajectory tracking',
    'timeline-2-detail-2': 'Built screw rod detection system, controlled probe movement through hardware and collected data',
    'timeline-2-detail-3': 'Wrote CMake scripts for seamless C++ and ArkTS integration, supporting底层 algorithm calls',
    'timeline-2-detail-4': 'Passed XTS and MDTP tests, completed MineHarmony certification',
    'tag2-1': 'ArkTS',
    'tag2-2': 'OpenHarmony',
    'tag2-3': 'CMake',
    'timeline-3-title': 'AI Transition · RAG System & Intelligent Security',
    'timeline-3-desc': 'Led intelligent security Agent system development, transitioning from traditional software development to AI engineering, mastered RAG retrieval and Agent workflow technologies.',
    'timeline-3-detail-1': 'Designed RAG architecture using FAISS/Chroma for dual-path recall, 47% accuracy improvement',
    'timeline-3-detail-2': 'Integrated Qwen-38B LLM, achieved intelligent alarm log analysis through Prompt Engineering',
    'timeline-3-detail-3': 'Developed Vue3+Three.js visualization interface, supporting 6+ functional modules联动 display',
    'timeline-3-detail-4': 'Implemented WebSocket real-time communication for alarm push notifications and AI real-time feedback',
    'tag3-1': 'RAG',
    'tag3-2': 'FAISS/Chroma',
    'tag3-3': 'Qwen-38B',
    'timeline-4-title': 'AI Deepening · Agent Workflow & Inspection Platform',
    'timeline-4-desc': 'Built intelligent inspection platform, integrated 3D visualization, video streaming, real-time communication and AI image recognition, forming complete AI engineering capabilities.',
    'timeline-4-detail-1': 'Built intelligent inspection platform with multi-sensor data acquisition, device management and remote control',
    'timeline-4-detail-2': 'Integrated H.265 video streaming (WebRTC/RTSP), latency <500ms, supports cloud forwarding',
    'timeline-4-detail-3': 'Used Three.js for 3D visualization, supporting real-time device status rendering and inspection path planning',
    'timeline-4-detail-4': 'Integrated AI image recognition service for meter reading recognition and anomaly detection',
    'tag4-1': 'Agent',
    'tag4-2': 'Three.js',
    'tag4-3': 'Video Streaming',

    // 项目
    'projects-title': 'Featured Projects',
    'projects-view-all': 'View All',
    'project-featured-tag': 'Flagship Project',
    'project-1-title': 'Intelligent Security Agent System',
    'project-1-desc': 'RAG architecture + Qwen-38B integration for alarm log analysis and anomaly detection',
    'metric-accuracy': 'Accuracy Boost',
    'metric-modules': 'Modules',
    'metric-realtime': 'WebSocket',
    'view-details': 'View Details',
    'view-details-arrow': 'View Details →',
    'project-2-title': 'OpenHarmony App Development',
    'project-2-desc': 'RTK positioning + screw rod detection with ArkTS and CMake integration',
    'project-3-tag': 'Inspection Platform',
    'project-3-title': 'Intelligent Inspection Platform',
    'project-3-desc': '3D visualization + H.265 video streaming + AI image recognition + multi-device collaboration',

    // Demo
    'demo-title': 'Live Demo',
    'demo-desc': 'Try My RAG System (Demo Version)',
    'demo-simple': 'Simple Chat',
    'demo-simple-desc': 'Fast response for daily conversation',
    'demo-rag': 'RAG Search',
    'demo-rag-desc': 'Knowledge-based for professional questions',
    'demo-send': 'Send',
    'demo-placeholder': 'Select a mode and click send to try',
    'demo-input-placeholder': "Enter your question, e.g., 'How to improve retrieval accuracy in RAG systems?'",
    'demo-simple-placeholder': "Enter any question, e.g., 'Hello, introduce yourself'",
    'demo-rag-placeholder': "Enter your question, e.g., 'How to improve retrieval accuracy in RAG systems?'",
    'demo-searching': 'Searching...',
    'demo-thinking': 'Thinking...',
    'demo-searching-kb': 'Searching knowledge base...',
    'demo-generating': 'Generating response...',

    // 页脚
    'footer-brand': 'LT',
    'footer-desc': 'Interactive AI Resume',
    'footer-download': 'Download PDF',
    'footer-name': 'Li Tao',
    'footer-projects': 'Project Details',
    'footer-curriculum': 'Learning Courses',
    'footer-knowledge': 'Knowledge Map',

    // 课程页面
    'curriculum-title': 'AI Engineering Learning Courses',
    'curriculum-subtitle': 'Systematic Learning Path · Methodology + Hands-on Results + Next Steps',
    'progress-overall': 'Overall Progress',
    'progress-desc': 'Completed <strong>4/5</strong> stages',
    'status-completed': '✓ Completed',
    'status-progress': '⏳ In Progress',
    'status-pending': '⏸️ Pending',
    'stage-output': 'Stage Outputs',
    'stage-1-title': 'Prompt Engineering & Rule Basics',
    'stage-1-desc': 'Make model outputs stable and controllable, reduce hallucinations and irrelevant responses',
    'topic-1-1': 'Prompt Structuring',
    'topic-1-1-desc': 'Role / Context / Task / Output Format four-element design',
    'topic-1-2': 'Template Management',
    'topic-1-2-desc': 'Few-shot, Chain-of-thought guidance, constraint word design',
    'topic-1-3': 'Regex Matching & Rule Analysis',
    'topic-1-3-desc': 'Input cleaning, sensitive word policies, abnormal question classification',
    'output-1-1': '📄 Prompt Template Library (20+ templates)',
    'output-1-2': '🛡️ Input Filtering Rule Set',
    'output-1-3': '📊 Output Quality Assessment Table',
    'stage-2-title': 'LangChain + Vector Database',
    'stage-2-desc': 'Build a searchable, traceable, evaluable RAG system for document Q&A',
    'topic-2-1': 'Document Chunking Strategy',
    'topic-2-1-desc': 'chunk_size, overlap, semantic boundary judgment',
    'topic-2-2': 'Embedding Model Selection',
    'topic-2-2-desc': 'BGE-M3 vs text2vec, vector dimension consistency check',
    'topic-2-3': 'Chroma / FAISS Comparison',
    'topic-2-3-desc': 'Speed, deployment difficulty, maintenance cost evaluation',
    'topic-2-4': 'Multi-path Retrieval',
    'topic-2-4-desc': 'BM25 + Dense Retrieval fusion strategy',
    'output-2-1': '📚 Complete ChromaDB Tutorial',
    'output-2-2': '🔧 RAG Optimization Framework Document',
    'output-2-3': '💻 Runnable Demo',
    'stage-3-title': 'Agent (ReAct / Workflow)',
    'stage-3-desc': 'Upgrade from "Q&A Bot" to "Task Execution System"',
    'topic-3-1': 'ReAct Loop',
    'topic-3-1-desc': 'Reason-Act closed loop, tool call strategy and execution logs',
    'topic-3-2': 'Workflow Orchestration',
    'topic-3-2-desc': 'Node-based orchestration, visual flows, state backtracking',
    'topic-3-3': 'Tool Call Security',
    'topic-3-3-desc': 'Parameter whitelist, call rate limits, privilege escalation blocking',
    'output-3-1': '🤖 ReAct Agent Demo',
    'output-3-2': '📋 Task State Machine Design Document',
    'stage-4-title': 'Local LLM & Lightweight Fine-tuning',
    'stage-4-desc': 'Improve model controllability, form localized deliverable solutions',
    'topic-4-1': 'Qwen-3.8B Local Deployment',
    'topic-4-1-desc': 'Inference parameter optimization, context window configuration',
    'topic-4-2': 'LoRA / PEFT Learning',
    'topic-4-2-desc': 'Parameter-efficient fine-tuning, sample construction, comparative evaluation',
    'topic-4-3': 'RAG + Local LLM',
    'topic-4-3-desc': 'Use retrieval to compensate for model knowledge gaps',
    'output-4-1': '📝 Local Deployment Solution Document',
    'output-4-2': '📊 Performance Comparison Report',
    'stage-5-title': 'Productionization & Monitoring',
    'stage-5-desc': 'The last mile from Demo to production system',
    'topic-5-1': 'Performance Evaluation',
    'topic-5-1-desc': 'Latency, accuracy, recall, stability monitoring',
    'topic-5-2': 'Alerting & Logging',
    'topic-5-2-desc': 'Anomaly detection, error tracking, performance alerting',
    'topic-5-3': 'Continuous Optimization',
    'topic-5-3-desc': 'A/B testing, user feedback loop, model iteration',

    // 项目页面
    'projects-page-title': 'Project Practice & Engineering Capabilities',
    'projects-page-subtitle': 'Each project highlights: <strong>Problem Definition → Technical Solution → Key Optimizations → Quantifiable Results</strong>',
    'tag-production': 'Production-Ready',
    'tag-embedded': 'Embedded',
    'tag-workflow': 'Workflow',
    'diagram-system-arch': 'System Architecture',
    'diagram-input': 'Input',
    'diagram-input-docs': 'Alarm Logs/Sensor Data',
    'diagram-parse': 'Data Parsing',
    'diagram-parse-desc': 'Structured Processing',
    'diagram-retrieve': 'RAG Retrieval',
    'diagram-retrieve-desc': 'FAISS + Chroma Dual-Path',
    'diagram-rerank-desc': 'Similarity Matching + Deduplication',
    'diagram-agent': 'Agent Analysis',
    'diagram-agent-desc': 'Qwen-38B Integration',
    'diagram-generate': 'Output',
    'diagram-generate-desc': 'Alarm Classification/Report Generation',
    'section-tech-solution': 'Technical Solution',
    'tech-parse-layer': 'RAG Architecture Design',
    'tech-parse-layer-desc': 'Alarm log structured processing, Chunking strategy, supports FAISS/Chroma dual-vector store',
    'tech-retrieve-layer': 'Multi-path Recall Fusion',
    'tech-retrieve-layer-desc': 'Similarity matching + keyword matching + Rerank reordering, 47% accuracy improvement',
    'tech-sort-layer': 'Qwen-38B Integration',
    'tech-sort-layer-desc': 'Prompt Engineering for alarm analysis templates, automatic cause summarization and report generation',
    'tech-safety-layer': 'Vue3 Visualization',
    'tech-safety-layer-desc': 'Three.js 3D display + WebSocket real-time updates, supports 6+ functional modules',
    'card-performance': 'Performance Metrics',
    'card-tech-stack': 'Tech Stack',
    'metric-recall': 'Recall Paths',
    'metric-modules': 'Modules',
    'metric-realtime': 'WebSocket',
    'optimization-title': 'Key Optimizations',
    'optimization-desc': 'Specific solutions for real engineering problems',
    'opt-1-title': 'RAG Dual-Path Recall Fusion',
    'opt-1-desc': 'FAISS + Chroma dual-vector store strategy',
    'opt-1-result': '47% accuracy improvement',
    'opt-2-title': 'C++ and ArkTS Integration',
    'opt-2-desc': 'Seamless底层 algorithm calls',
    'opt-2-result': '3x performance improvement',
    'opt-3-title': 'H.265 Video Stream Optimization',
    'opt-3-desc': 'Multi-protocol adaptation for lower latency',
    'opt-3-result': 'Latency < 500ms',
    'opt-4-title': 'WebSocket Real-time Communication',
    'opt-4-desc': 'Bidirectional data synchronization',
    'opt-4-result': 'Real-time sync < 100ms',
    'result-label': 'Result:',
    'project-2-core-design': 'Core Design',
    'agent-reason-act': 'RTK Positioning System',
    'agent-reason-act-desc': '2D visualization of RTK chip movement from positioning point to fixed point',
    'agent-roles': 'Screw Rod Detection System',
    'agent-roles-desc': 'Hardware-controlled probe movement on UIS7875/RK3588 platforms with data visualization',
    'agent-tools': 'CMake Integration',
    'agent-tools-desc': 'CMake scripts for seamless C++ and ArkTS integration, supporting底层 algorithm calls',
    'agent-recovery': 'XTS/MDTP Certification',
    'agent-recovery-desc': 'Passed XTS and MDTP tests, completed MineHarmony certification',
    'project-2-results': 'Execution Results',
    'agent-systems': 'Systems Developed',
    'agent-cert': 'Certification Passed',
    'agent-completion-rate': 'Task Completion Rate',
    'agent-iterations': 'Avg Iterations',
    'project-3-implementation': 'Implementation Path',
    'llm-inference': '3D Visualization Platform',
    'llm-inference-desc': 'Three.js-based 3D modeling for inspection device management and checkpoint configuration',
    'llm-params': 'WebSocket Communication',
    'llm-params-desc': 'Bidirectional real-time communication for sensor data and device control, multi-device collaboration',
    'llm-lora': 'H.265 Video Streaming',
    'llm-lora-desc': 'Integrated EasyWasmPlayer/WebRTC/RTSP for HD video playback and forwarding',
    'llm-comparison': 'AI Image Recognition',
    'llm-comparison-desc': 'AI image recognition service integration for meter reading and anomaly detection',
    'project-3-metrics': 'Features',
    'llm-viz': 'Visualization',
    'llm-stream': 'Video Streaming',
    'llm-cost': 'Cost Reduction',
    'llm-latency': 'Latency Reduction',
    'agent-reason-act': 'Reason-Act Loop',
    'agent-reason-act-desc': 'Reason first then call tools, avoiding blind generation. Records thinking trajectory each iteration.',
    'agent-roles': 'Role Division',
    'agent-roles-desc': 'Planner → Retriever → ToolRunner → Reporter',
    'agent-tools': 'Tool Integration',
    'agent-tools-desc': 'Search tools, calculation tools, rule engines, knowledge base queries, supports dynamic registration',
    'agent-recovery': 'Failure Recovery',
    'agent-recovery-desc': 'Step rollback, automatic retry, degradation strategies to ensure system robustness',
    'project-2-results': 'Execution Results',
    'agent-completion-rate': 'Task Completion Rate',
    'agent-iterations': 'Avg Iterations',
    'project-3-title': 'Qwen-3.8B Local Deployment & Fine-tuning',
    'project-3-implementation': 'Implementation Path',
    'llm-inference': 'Local Inference Configuration',
    'llm-inference-desc': 'vLLM inference engine, 4-bit quantization, 8K context window, runs on single 24GB GPU',
    'llm-params': 'Inference Parameter Optimization',
    'llm-params-desc': 'temperature=0.7, top_p=0.9, repetition_penalty=1.1, balancing creativity and stability',
    'llm-lora': 'LoRA / PEFT Fine-tuning',
    'llm-lora-desc': 'Parameter-efficient fine-tuning, only training 0.1% parameters, injecting domain knowledge, 90% cost reduction',
    'llm-comparison': 'Performance Comparison',
    'llm-comparison-desc': 'Vs Cloud API: Cost -83%, Latency -40%, Controllability +100%',
    'project-3-metrics': 'Performance Comparison',
    'llm-cost': 'Cost Reduction',
    'llm-latency': 'Latency Reduction',

    // 知识图谱页面
    'knowledge-title': 'LLM Engineering Knowledge Graph',
    'knowledge-subtitle': 'Drag nodes to explore connections · Click for details',
    'btn-reset-view': 'Reset View',
    'btn-toggle-labels': 'Toggle Labels',
    'legend-core': 'Core Capabilities',
    'legend-retrieval': 'Retrieval Technology',
    'legend-agent': 'Agent',
    'legend-deployment': 'Model Deployment',
    'knowledge-timeline-title': 'Knowledge Timeline',
    'knowledge-timeline-desc': 'Logical chain of technical evolution',
    'timeline-step-1-title': 'Prompt → Retrieval',
    'timeline-step-1-desc': 'High-quality prompts determine retrieval goals and context assembly. Structured output makes subsequent processing more reliable.',
    'timeline-step-2-title': 'Retrieval → Agent',
    'timeline-step-2-desc': 'Agent schedules retrieval and tool execution via ReAct to complete complex tasks. Retrieval is the "eyes" of the Agent.',
    'timeline-step-3-title': 'Agent → Local LLM',
    'timeline-step-3-desc': 'Migrate task chains to local Qwen, balancing privacy and controllability. Reduce cloud dependency and costs.',
    'timeline-step-4-title': 'Local LLM → Fine-tuning',
    'timeline-step-4-desc': 'Use LoRA/PEFT to enhance domain expression, combined with RAG to keep knowledge fresh. Dual drive of fine-tuning and retrieval.',
    'knowledge-skills-title': 'Skill Proficiency Details',
    'knowledge-skills-desc': 'Click nodes to view detailed information',
    'level-high': 'High',
    'level-medium-high': 'Medium-High',
    'level-medium': 'Medium',
    'skill-prompt': 'Prompt Engineering',
    'skill-prompt-desc': 'Template design, constrained output, chain-of-thought guidance, error case iteration',
    'skill-react': 'ReAct Agent',
    'skill-react-desc': 'Reason-Act loop, tool call strategy and execution log analysis',
    'skill-langchain': 'LangChain',
    'skill-langchain-desc': 'Document loading, chunking, retrieval chains and task chain integration',
    'skill-chroma': 'Chroma / FAISS',
    'skill-chroma-desc': 'Vector database selection, index management, recall efficiency and precision balance',
    'skill-embedding': 'Embedding',
    'skill-embedding-desc': 'Model adaptation, batch processing, timeout retry and exception recovery',
    'skill-rerank': 'Rerank & Evaluation',
    'skill-rerank-desc': 'Relevance scoring, context compression and answer confidence grading',
    'skill-lora': 'LoRA / PEFT',
    'skill-lora-desc': 'Parameter-efficient fine-tuning methods, sample construction and comparative evaluation',
    'skill-qwen': 'Qwen-3.8B Local Deployment',
    'skill-qwen-desc': 'Local inference configuration, performance trade-offs, integration with RAG',
    'skill-multi': 'Multi-path Retrieval',
    'skill-multi-desc': 'BM25 + Dense + Rule-based fusion retrieval and reranking',
    'skill-safety': 'Safety Guards',
    'skill-safety-desc': 'Input/output security policies, privilege restrictions, low-confidence degradation',
    'tag-prompt-eng': 'Prompt Engineering',
    'tag-structured-output': 'Structured Output',
    'tag-react': 'ReAct',
    'tag-tool-calling': 'Tool Calling',
    'tag-qwen': 'Qwen-3.8B',
    'tag-local-deploy': 'Local Deployment',
    'tag-lora': 'LoRA',
    'tag-peft': 'PEFT',
    'tag-rag': 'RAG',
    'tag-role-context': 'Role/Context/Task',
    'tag-few-shot': 'Few-shot',
    'tag-cot': 'CoT',
    'tag-output-validation': 'Output Validation',
    'tag-planner': 'Planner',
    'tag-tool-runner': 'ToolRunner',
    'tag-failure-recovery': 'Failure Recovery',
    'tag-doc-loader': 'Document Loader',
    'tag-retrieval-chain': 'Retrieval Chain',
    'tag-agent-executor': 'Agent Executor',
    'tag-persistence': 'Persistence',
    'tag-metadata-filter': 'Metadata Filtering',
    'tag-batch-insert': 'Batch Insert',
    'tag-bge-m3': 'BGE-M3',
    'tag-batch-processing': 'Batch Processing',
    'tag-retry-logic': 'Retry Logic',
    'tag-bge-reranker': 'BGE-Reranker',
    'tag-rrf-fusion': 'RRF Fusion',
    'tag-confidence': 'Confidence',
    'tag-qlora': 'QLoRA',
    'tag-sample-build': 'Sample Construction',
    'tag-vllm': 'vLLM',
    'tag-gguf': 'GGUF',
    'tag-4bit-quant': '4-bit Quantization',
    'tag-bm25': 'BM25',
    'tag-vector-search': 'Vector Search',
    'tag-rrf': 'RRF',
    'tag-injection-detect': 'Injection Detection',
    'tag-sensitive-words': 'Sensitive Words',
    'tag-degrade-strategy': 'Degradation Strategy'
  }
};

// ===== 语言切换 =====
function initLangToggle() {
  const toggle = $('#lang-toggle');
  if (!toggle) return;

  // 从 localStorage 读取语言
  const savedLang = localStorage.getItem('lang') || 'zh';
  document.documentElement.setAttribute('data-lang', savedLang);
  updateLangButton(savedLang);
  updateTranslations(savedLang);

  toggle.addEventListener('click', () => {
    const currentLang = document.documentElement.getAttribute('data-lang');
    const newLang = currentLang === 'zh' ? 'en' : 'zh';

    document.documentElement.setAttribute('data-lang', newLang);
    localStorage.setItem('lang', newLang);

    updateLangButton(newLang);
    updateTranslations(newLang);
  });
}

function updateLangButton(lang) {
  const label = $('.lang-label');
  if (label) {
    label.textContent = lang === 'zh' ? 'EN' : '中文';
  }
}

// 基于 data-i18n 属性更新翻译
function updateTranslations(lang) {
  const t = translations[lang];

  // 更新所有带 data-i18n 属性的元素
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.textContent = t[key];
    }
  });

  // 更新 title 属性
  document.querySelectorAll('[data-i18n][title]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.setAttribute('title', t[key]);
    }
  });

  // 更新 placeholder 属性（data-i18n-placeholder）
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key]) {
      el.setAttribute('placeholder', t[key]);
    }
  });

  // 特殊处理英雄区域 badge（包含 pulse-dot）
  const heroBadge = $('.hero-badge');
  if (heroBadge && t['hero-badge']) {
    const pulseDot = heroBadge.querySelector('.pulse-dot');
    if (pulseDot) {
      heroBadge.innerHTML = '<span class="pulse-dot"></span>' + t['hero-badge'];
    }
  }
}

// ===== 主题切换 =====
function initThemeToggle() {
  const toggle = $('#theme-toggle');
  if (!toggle) return;

  // 从 localStorage 读取主题
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  toggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // 添加切换动画
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
  });
}

// ===== 滚动进度条 =====
function initScrollProgress() {
  const progressBar = $('#scroll-progress');
  if (!progressBar) return;

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    progressBar.style.width = scrollPercent + '%';
  });
}

// ===== 导航激活状态 =====
function initNavActive() {
  const currentPage = document.body.dataset.page;
  const navDots = $$('.nav-dot');

  navDots.forEach(dot => {
    const href = dot.getAttribute('href');
    if (href === `./${currentPage}.html` || (currentPage === 'home' && href === './index.html')) {
      dot.classList.add('active');
    }
  });
}

// ===== 3D 技能球 =====
function initSkillOrb() {
  const canvas = $('#skill-orb-canvas');
  const tooltip = $('#orb-tooltip');
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.z = 2.5;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true
  });
  const size = 300;
  renderer.setSize(size, size);
  renderer.setPixelRatio(1);

  // 创建核心球体 - 减少面数提升性能
  const geometry = new THREE.IcosahedronGeometry(0.8, 1);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00f5d4,
    wireframe: true,
    transparent: true,
    opacity: 0.6
  });
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  // 内部发光球体
  const innerGeo = new THREE.IcosahedronGeometry(0.5, 1);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x00bbf9,
    transparent: true,
    opacity: 0.4
  });
  const innerSphere = new THREE.Mesh(innerGeo, innerMat);
  scene.add(innerSphere);

  // 粒子环 - 减少粒子数
  const ringParticles = 50;
  const ringGeo = new THREE.BufferGeometry();
  const ringPos = new Float32Array(ringParticles * 3);
  for (let i = 0; i < ringParticles; i++) {
    const angle = (i / ringParticles) * Math.PI * 2;
    const radius = 1.2 + Math.random() * 0.2;
    ringPos[i * 3] = Math.cos(angle) * radius;
    ringPos[i * 3 + 1] = Math.sin(angle) * radius;
    ringPos[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
  }
  ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
  const ringMat = new THREE.PointsMaterial({
    color: 0x9b5de5,
    size: 0.04,
    transparent: true,
    opacity: 0.6
  });
  const ring = new THREE.Points(ringGeo, ringMat);
  scene.add(ring);

  // 鼠标交互
  let isDragging = false;
  let previousMouseX = 0;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMouseX = e.clientX;
  });
  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const delta = e.clientX - previousMouseX;
      sphere.rotation.y += delta * 0.01;
      innerSphere.rotation.y += delta * 0.01;
      ring.rotation.y += delta * 0.01;
      previousMouseX = e.clientX;
    }
  });
  canvas.addEventListener('mouseup', () => { isDragging = false; });
  canvas.addEventListener('mouseleave', () => { isDragging = false; });

  // 动画
  function animate() {
    requestAnimationFrame(animate);

    sphere.rotation.y += 0.002;
    innerSphere.rotation.y += 0.0015;
    ring.rotation.y += 0.0025;

    renderer.render(scene, camera);
  }
  animate();
}

// ===== 页面加载完成 =====
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initLangToggle();
  initScrollProgress();
  initTerminalTyping();
  initThreeJSBackground();
  initScrollReveal();
  initDemo();
  initNavActive();
  initSkillOrb();

  // 雷达图延迟初始化（确保容器已渲染）
  setTimeout(initRadarChart, 100);
});

// ===== 下载简历 =====
$('#download-resume')?.addEventListener('click', (e) => {
  e.preventDefault();

  // 创建临时容器用于生成 PDF
  const element = document.createElement('div');
  element.style.padding = '40px';
  element.style.background = '#fff';
  element.style.color = '#1a1a2e';
  element.style.fontFamily = 'Arial, sans-serif';
  element.style.lineHeight = '1.6';

  // 获取简历核心内容
  const name = document.querySelector('.hero-title .name-line')?.textContent || '李涛';
  const title = 'AI 应用/系统工程师';
  const contact = document.querySelector('.hero-subtitle')?.textContent || '';
  const skills = document.querySelector('#skills-typing')?.textContent || '';

  element.innerHTML = `
    <h1 style="font-size: 32px; margin-bottom: 8px; color: #008c7a;">${name}</h1>
    <h2 style="font-size: 18px; margin-bottom: 16px; color: #666;">${title}</h2>
    <p style="font-size: 14px; margin-bottom: 24px; color: #888;">${contact.replace(/\n/g, ' | ')}</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <h3 style="font-size: 18px; margin-bottom: 12px; color: #008c7a;">核心技能</h3>
    <p style="font-size: 14px; margin-bottom: 24px;">${skills || 'RAG / Agent / Embedding / LocalLLM'}</p>
    <p style="font-size: 14px; color: #888;">完整简历请访问：https://github.com/your-repo/resume</p>
  `;

  document.body.appendChild(element);

  const opt = {
    margin: 0.5,
    filename: '李涛 -AI 工程师简历.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  // 生成 PDF
  html2pdf()
    .set(opt)
    .from(element)
    .save()
    .then(() => {
      document.body.removeChild(element);
    })
    .catch(err => {
      console.error('PDF 生成失败:', err);
      alert('PDF 生成失败，请重试');
      document.body.removeChild(element);
    });
});

// ===== 播放 Demo =====
$('#play-demo')?.addEventListener('click', () => {
  $('#demo-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
