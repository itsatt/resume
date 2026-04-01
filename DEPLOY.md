# GitHub Pages 部署指南

## 快速部署步骤

### 方法 1：使用 GitHub Desktop（推荐新手）

1. **安装 GitHub Desktop**
   - 下载地址：https://desktop.github.com/

2. **创建新仓库**
   - 打开 GitHub Desktop
   - 选择 `File > Add Local Repository`
   - 选择 `D:\简历网站` 目录
   - 点击 "Create a new repository"
   - 命名为 `resume` 或 `your-username.github.io`
   - 点击 "Create repository"

3. **推送到 GitHub**
   - 点击右上角 "Publish repository"
   - 仓库名输入 `your-username.github.io`（将 your-username 替换为你的 GitHub 用户名）
   - 点击 "Publish"

4. **启用 GitHub Pages**
   - 在 GitHub 上打开你的仓库
   - 进入 `Settings > Pages`
   - Source 选择 `Deploy from a branch`
   - Branch 选择 `main`，文件夹选择 `/(root)`
   - 点击 "Save"

5. **访问你的网站**
   - 等待 2-5 分钟构建完成
   - 访问 `https://your-username.github.io/resume/`

---

### 方法 2：使用 Git 命令行

```bash
# 1. 初始化 Git 仓库
cd D:\简历网站
git init

# 2. 添加所有文件
git add .

# 3. 创建第一次提交
git commit -m "Initial commit: resume website"

# 4. 关联 GitHub 远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/your-username/resume.git

# 5. 推送到 GitHub
git branch -M main
git push -u origin main
```

然后在 GitHub 上启用 Pages（同上步骤 4）。

---

## 注意事项

### 1. 仓库命名
- `your-username.github.io` - 用户/组织站点，URL 为 `https://your-username.github.io/`
- 其他名称 - 项目站点，URL 为 `https://your-username.github.io/repo-name/`

### 2. 自定义域名（可选）
在网站根目录添加 `static/CNAME` 文件，内容为你的域名：
```
yourdomain.com
```

### 3. 关于后端 API
GitHub Pages 只能托管静态文件，以下功能将**不可用**：
- Python 后端 API (`api_server.py`)
- RAG 检索功能
- Ollama 本地模型

**解决方案**：
- 在前端代码中禁用 API 相关功能
- 或使用 Mock 数据
- 或将后端部署到其他平台（如 Railway/Render）

### 4. 更新网站
```bash
# 修改文件后执行
git add .
git commit -m "Update content"
git push
```

等待 1-2 分钟，GitHub 会自动重新部署。

---

## 故障排除

### 页面显示 404
- 等待 5-10 分钟，GitHub 需要时间构建
- 检查 Settings > Pages 是否已正确配置

### 样式/脚本加载失败
- 检查 HTML 中的路径是否正确
- 如果使用项目站点，路径可能需要添加 `/repo-name/` 前缀

### 缓存问题
- 强制刷新浏览器（Ctrl+F5）
- 或在 URL 后添加版本号 `?v=2`
