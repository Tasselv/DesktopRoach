# 桌面小强

原生 macOS 桌面宠物。小强是独立的透明置顶窗口，不在网页里，不依赖浏览器、Electron 或网络。

## 打开

双击 `../DesktopRoach.app`。启动后会出现两只小强，控制入口在屏幕顶部菜单栏的虫子图标。

- 默认穿透鼠标，不影响桌面和其他应用的点击。
- 菜单里可以投喂、领养、暂停、调整爬行速度和召唤小强。
- 开启「互动模式」后，可以拖动或点击小强；右键小强也能打开菜单。
- 「暂时隐藏」用于开会或屏幕共享。隐藏前没有自动屏蔽屏幕录制，小强可能被录进去。
- 「退出小强收容所」会关闭所有小强和面包屑窗口。
- 室友数量和累计进食保存在此应用自己的 macOS 偏好设置中。
- 不开机自启，不需要辅助功能或屏幕录制权限。

## 编译与验证

需要 Apple Silicon Mac、macOS 13 或更新版本，以及 Xcode Command Line Tools。

```sh
zsh native/build.sh
./DesktopRoach.app/Contents/MacOS/DesktopRoach --self-test
open DesktopRoach.app
```

从 `roach-room` 目录运行。自检使用独立的偏好设置，不覆盖真实宠物存档。
