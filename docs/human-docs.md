# 项目结构说明（人类阅读版）

## 项目概述

这是一个纯前端的在线刷题网站，可以直接部署在 GitHub Pages 上。所有数据存储在浏览器本地，支持导出/导入存档。

## 文件夹结构

```
quiz-site/
├── index.html          # 网站入口，单页应用
├── css/
│   └── style.css       # 全局样式，已适配手机和电脑
├── js/                 # JavaScript 模块
│   ├── storage.js      # 本地存储、导入导出
│   ├── data-loader.js  # 加载题目数据
│   ├── question-render.js  # 题目渲染引擎
│   ├── wrong-book.js   # 错题本逻辑
│   ├── mode-practice.js  # 练习模式
│   ├── mode-exam.js    # 考试模式
│   └── app.js          # 主应用逻辑
├── data/               # 题目数据根目录
│   ├── config.json     # 根配置：定义有哪些题组
│   ├── 小学数学/       # 题组文件夹
│   │   ├── config.json   # 题组配置：定义有哪些题库
│   │   ├── 一年级/       # 题库文件夹
│   │   │   ├── config.json   # 题库配置：定义有哪些题目集
│   │   │   ├── 基础加减法/   # 题目集文件夹
│   │   │   │   └── questions.json  # 题目文件
│   │   │   └── 认识图形/
│   │   │       └── questions.json
│   │   └── 二年级/
│   │       ├── config.json
│   │       ├── 表内乘法/
│   │       │   └── questions.json
│   │       └── 简单除法/
│   │           └── questions.json
│   └── 技术面试/
│       ├── config.json
│       ├── 前端开发/
│       │   ├── config.json
│       │   └── JavaScript/
│       │       └── questions.json
│       └── 后端开发/
│           ├── config.json
│           └── Nodejs/
│               └── questions.json
└── docs/
    ├── human-docs.md   # 本文档
    └── ai-docs.md      # AI 阅读文档
```

## 如何添加新的题组

1. 在 `data/` 下创建新的文件夹，例如 `data/高中数学/`
2. 在 `data/config.json` 的 `groups` 数组中添加一项：

```json
{
  "id": "highschool-math",
  "name": "高中数学",
  "folder": "高中数学",
  "description": "高中数学题库"
}
```

3. 在 `data/高中数学/` 下创建 `config.json`，定义题库列表

## 如何添加新的题库

1. 在对应题组文件夹下创建新文件夹，例如 `data/高中数学/高一/`
2. 在题组的 `config.json` 的 `banks` 数组中添加一项：

```json
{
  "id": "grade-10",
  "name": "高一",
  "folder": "高一",
  "description": "高一数学"
}
```

3. 在 `data/高中数学/高一/` 下创建 `config.json`，定义题目集列表

## 如何添加新的题目集

1. 在对应题库文件夹下创建新文件夹，例如 `data/高中数学/高一/函数基础/`
2. 在题库的 `config.json` 的 `sets` 数组中添加一项：

```json
{
  "id": "function-basic",
  "name": "函数基础",
  "folder": "函数基础",
  "description": "函数的基本概念"
}
```

3. 在文件夹内创建 `questions.json`

## 如何写题目（questions.json）

`questions.json` 的格式如下：

```json
{
  "title": "题目集名称",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "question": "题目内容",
      "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
      "answer": "B",
      "analysis": "解析内容，可为空",
      "points": 5
    }
  ]
}
```

### 题型说明

| 类型 | type 值 | 说明 |
|------|---------|------|
| 单选题 | `single` | answer 为单个字母，如 `"B"` |
| 多选题 | `multiple` | answer 为字母数组，如 `["A", "C"]` |
| 判断题 | `judgment` | answer 为 `true` 或 `false` |
| 填空题 | `fill` | answer 为字符串数组，每个元素对应一个空。题目中用 `____` 表示填空位置 |
| 简答题 | `essay` | answer 为字符串，参考答案 |

### 填空题示例

```json
{
  "id": "q1",
  "type": "fill",
  "question": "3 + ____ = 7，____ - 2 = 5",
  "answer": ["4", "7"],
  "analysis": "第一空：7-3=4；第二空：5+2=7",
  "points": 10
}
```

注意：题目中每个 `____` 对应 `answer` 数组中的一个元素，顺序必须一致。

### 简答题示例

```json
{
  "id": "q1",
  "type": "essay",
  "question": "请解释什么是函数",
  "answer": "函数是一种对应关系...",
  "analysis": "",
  "points": 10
}
```

### 判断题示例

```json
{
  "id": "q1",
  "type": "judgment",
  "question": "2 + 2 = 5",
  "options": ["正确", "错误"],
  "answer": false,
  "analysis": "2加2等于4",
  "points": 5
}
```

## 注意事项

1. `id` 在同一题目集中必须唯一
2. `analysis` 可以为空字符串 `""`，渲染时会显示"无"
3. `points` 为分值，整数
4. 所有配置文件和题目文件都必须使用 UTF-8 编码
5. 文件夹层级关系必须和配置文件中一致
6. 部署到 GitHub Pages 时，确保 `data/` 文件夹也被提交
