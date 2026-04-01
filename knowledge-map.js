// ===== D3 力导向知识图谱 =====
(function() {
  const container = document.getElementById('force-graph');
  if (!container) return;
  
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  // 知识节点数据
  const nodes = [
    // 核心能力（青色）
    { id: 'prompt', label: 'Prompt Engineering', group: 'core', level: 95 },
    { id: 'embedding', label: 'Embedding', group: 'core', level: 90 },
    
    // 检索技术（蓝色）
    { id: 'chroma', label: 'Chroma/FAISS', group: 'retrieval', level: 88 },
    { id: 'rerank', label: 'Rerank', group: 'retrieval', level: 85 },
    { id: 'multi', label: '多路召回', group: 'retrieval', level: 92 },
    { id: 'langchain', label: 'LangChain', group: 'retrieval', level: 90 },
    
    // Agent（紫色）
    { id: 'react', label: 'ReAct', group: 'agent', level: 82 },
    { id: 'workflow', label: '工作流编排', group: 'agent', level: 75 },
    { id: 'safety', label: '安全护栏', group: 'agent', level: 85 },
    
    // 模型部署（粉色）
    { id: 'qwen', label: 'Qwen-3.8B', group: 'model', level: 80 },
    { id: 'lora', label: 'LoRA/PEFT', group: 'model', level: 65 }
  ];
  
  // 节点关联
  const links = [
    { source: 'prompt', target: 'langchain' },
    { source: 'prompt', target: 'react' },
    { source: 'embedding', target: 'chroma' },
    { source: 'embedding', target: 'multi' },
    { source: 'chroma', target: 'rerank' },
    { source: 'chroma', target: 'multi' },
    { source: 'rerank', target: 'multi' },
    { source: 'langchain', target: 'react' },
    { source: 'langchain', target: 'workflow' },
    { source: 'react', target: 'workflow' },
    { source: 'react', target: 'safety' },
    { source: 'workflow', target: 'safety' },
    { source: 'qwen', target: 'lora' },
    { source: 'qwen', target: 'react' },
    { source: 'lora', target: 'embedding' },
    { source: 'multi', target: 'rerank' },
    { source: 'safety', target: 'prompt' }
  ];
  
  // 颜色映射
  const colorScale = {
    core: '#00f5d4',
    retrieval: '#00bbf9',
    agent: '#9b5de5',
    model: '#f15bb5'
  };
  
  // 创建 SVG
  const svg = d3.select('#force-graph')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height]);
  
  // 创建箭头标记
  svg.append('defs').selectAll('marker')
    .data(['link'])
    .join('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 28)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('fill', 'rgba(100, 140, 200, 0.4)')
    .attr('d', 'M0,-5L10,0L0,5');
  
  // 力导向模拟
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(120))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide().radius(50));
  
  // 绘制连线
  const link = svg.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', 'link')
    .attr('stroke', 'rgba(100, 140, 200, 0.3)')
    .attr('stroke-width', 2)
    .attr('marker-end', 'url(#arrow)');
  
  // 绘制节点组
  const node = svg.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'node')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));
  
  // 节点圆圈
  node.append('circle')
    .attr('r', d => 15 + (d.level / 100) * 15)
    .attr('fill', d => colorScale[d.group])
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .append('title')
    .text(d => `${d.label}\n掌握度：${d.level}%`);
  
  // 节点标签
  node.append('text')
    .attr('dy', d => 25 + (d.level / 100) * 10)
    .attr('text-anchor', 'middle')
    .text(d => d.label)
    .clone(true)
    .lower()
    .attr('stroke', '#000')
    .attr('stroke-width', 3)
    .attr('stroke-linejoin', 'round');
  
  // 更新位置
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    
    node
      .attr('transform', d => `translate(${d.x},${d.y})`);
  });
  
  // 拖拽函数
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  
  // 重置视图按钮
  document.getElementById('reset-view')?.addEventListener('click', () => {
    simulation.alpha(0.5).restart();
    nodes.forEach(d => {
      d.fx = null;
      d.fy = null;
    });
  });
  
  // 显示/隐藏标签
  let labelsVisible = true;
  document.getElementById('toggle-labels')?.addEventListener('click', () => {
    labelsVisible = !labelsVisible;
    svg.selectAll('text').style('display', labelsVisible ? 'block' : 'none');
  });
  
  // 窗口大小调整
  window.addEventListener('resize', () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    svg.attr('width', newWidth).attr('height', newHeight);
    simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
    simulation.alpha(0.3).restart();
  });
})();
