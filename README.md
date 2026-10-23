# 🪳 小强收容所 · DesktopRoach

> 一个不需要勇气的桌面宠物。
> 投喂、逗玩、领养，给桌面上的小强一个家。

![版本](https://img.shields.io/badge/version-1.0.0-green)
![平台](https://img.shields.io/badge/macOS-Apple_Silicon-success)
![协议](https://img.shields.io/badge/license-MIT-blue)

---

## 🤔 这是什么？

**小强收容所** 是一个桌面宠物项目，有 **两个版本**：

| | 网页版 | 原生桌面版 |
|--|--------|-----------|
| 位置 | 浏览器里 | macOS 桌面透明窗口 |
| 依赖 | 任意现代浏览器 | Apple Silicon Mac, macOS 13+ |
| 特点 | 存档在浏览器里，随时打开 | 真正趴在桌面上，穿透鼠标不挡事 |

**它们都会：**
- 🍞 爬来找你投喂的面包屑
- 💧 吨吨吨喝水
- 🧸 追着小球跑
- 🛏️ 累了回小窝睡觉
- 💬 时不时冒出一句心里话

---

## 📦 安装

### 方式一：原生桌面版（推荐）

下载 [DesktopRoach-macOS-AppleSilicon.zip](https://github.com/Tasselv/DesktopRoach/releases) 解压，双击 `DesktopRoach.app` 即可。

> 如果 macOS 拦截，去 **系统设置 → 隐私与安全性** 里点「仍要打开」。

### 方式二：网页版

直接在浏览器打开 `index.html` 就行，不需要服务器。

---

## 🎮 怎么玩

### 原生桌面版

- **菜单栏** 会出现一只虫子图标，点击打开控制面板
- **投喂**：撒下面包屑，小强会闻香赶来
- **互动模式**：开启后可拖拽、点击小强；右键也能出菜单
- **暂时隐藏**：开会 / 屏幕共享时的救星
- **摸鱼模式**：慢动作爬行，老板来了也不怕
- **不碰权限**：不需要辅助功能、不需要屏幕录制，不会开机自启

### 网页版

| 操作 | 方式 |
|------|------|
| 投喂 | 按 `1` 或点工具栏「投喂」，再点桌面 |
| 加水 | 按 `2` 或点工具栏「加水」，再点桌面 |
| 逗玩 | 按 `3` 或点工具栏「逗逗它」，放个小球 |
| 回窝休息 | 按 `4` 或点工具栏「回小窝」 |
| 打扫 | 按 `5` 或点工具栏「打扫」 |
| 打招呼 | 直接点小强 |
| 拖动 | 按住小强拖拽 |
| 改名字 | 点击左侧名字旁的 ✎ 按钮 |
| 领养新室友 | 点「再添一位室友」（30 币，最多 8 只） |

**Esc** 取消当前工具 · **双击桌面** 召唤小强过来

---

## 💡 小知识

> 🪳 蟑螂的祖先在约 **3 亿年前**就出现了。现在，这位远古来客决定陪你上班。

- 每天登录可领取 **+50 小强币** 补给
- 完成「今日小事」可得额外奖励
- 饱食度 / 快乐值 / 活力值 会随时间缓慢下降——记得常来看看
- 数据自动存在浏览器里，关掉页面也不会丢（除非你清缓存）
- 原生版的进食次数保存在系统偏好设置里

---

## 🛠️ 技术栈

- **网页版**：纯 HTML + CSS + Canvas，零依赖，单文件可运行
- **原生版**：Swift + AppKit，原生透明置顶窗口，不依赖 Electron / 浏览器

---

## 📁 项目结构

```
roach-room/
├── index.html          # 网页版入口
├── app.js              # 网页版逻辑（Canvas 动画 + 状态管理）
├── style.css           # 网页版样式
├── DesktopRoach.app/   # 原生 macOS 应用
├── DesktopRoach-macOS-AppleSilicon.zip   # 打包好的安装包
├── native/
│   ├── DesktopRoach.swift   # 原生版源码
│   └── build.sh             # 编译脚本
└── README.md
```

---

## 🚀 自行编译原生版

```sh
# 需要 Apple Silicon Mac + macOS 13+ + Xcode Command Line Tools
cd roach-room/native
./build.sh
open DesktopRoach.app
```

---

## 📜 开源协议

MIT License，随便用，随便改。小强很乐意被分享。

---

## ❤️ 致谢

给小强一个家，也给你自己一点陪伴。

> *"不用铲屎，不用遛弯。只需要一点点面包屑，和你的偏爱。"*

---

<div align="center">

**MADE FOR THE LITTLE, UNLOVED THINGS.**

🪳 ✦ 🪳 ✦ 🪳

</div>
