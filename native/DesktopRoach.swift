import AppKit
import QuartzCore

private func clamp(_ value: CGFloat, _ lower: CGFloat, _ upper: CGFloat) -> CGFloat {
    min(max(value, lower), max(lower, upper))
}

private func distance(_ a: CGPoint, _ b: CGPoint) -> CGFloat {
    hypot(a.x - b.x, a.y - b.y)
}

private func color(_ hex: UInt32, alpha: CGFloat = 1) -> NSColor {
    NSColor(srgbRed: CGFloat((hex >> 16) & 255) / 255,
            green: CGFloat((hex >> 8) & 255) / 255,
            blue: CGFloat(hex & 255) / 255, alpha: alpha)
}

private func drawRoach(_ context: CGContext, center: CGPoint, angle: CGFloat,
                       scale: CGFloat, phase: CGFloat, time: Double) {
    context.saveGState()
    context.translateBy(x: center.x, y: center.y)
    context.rotate(by: angle)
    context.scaleBy(x: scale, y: scale)
    context.setFillColor(color(0x1D160D, alpha: 0.15).cgColor)
    context.fillEllipse(in: CGRect(x: -25, y: -14, width: 48, height: 23))
    context.setStrokeColor(color(0x64442B).cgColor)
    context.setLineWidth(1.25)
    context.setLineCap(.round)
    for side in [-1.0, 1.0] {
        for index in 0..<3 {
            let x = CGFloat(9 - index * 10)
            let step = sin(phase + CGFloat(index) * 2 + (side < 0 ? .pi : 0)) * 3
            context.move(to: CGPoint(x: x, y: side * 5))
            context.addLine(to: CGPoint(x: x - 3 + step, y: side * CGFloat(13 + index)))
            context.addLine(to: CGPoint(x: x - 9 + step * 1.5, y: side * CGFloat(index == 1 ? 22 : 19)))
            context.addLine(to: CGPoint(x: x - 12 + step * 1.5, y: side * CGFloat(index == 1 ? 23 : 20)))
            context.strokePath()
        }
    }
    context.saveGState()
    context.addEllipse(in: CGRect(x: -24, y: -11, width: 38, height: 22))
    context.clip()
    let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                              colors: [color(0xBD925B).cgColor, color(0x966638).cgColor,
                                       color(0x56371F).cgColor] as CFArray,
                              locations: [0, 0.45, 1])!
    context.drawLinearGradient(gradient, start: CGPoint(x: -8, y: 11),
                               end: CGPoint(x: 4, y: -11), options: [])
    context.restoreGState()
    context.setStrokeColor(color(0x513720).cgColor)
    context.setLineWidth(0.85)
    context.strokeEllipse(in: CGRect(x: -24, y: -11, width: 38, height: 22))
    context.setStrokeColor(color(0xD8B778, alpha: 0.42).cgColor)
    context.setLineWidth(0.6)
    for index in 0..<5 {
        let x = CGFloat(-15 + index * 5)
        context.move(to: CGPoint(x: x, y: -8))
        context.addQuadCurve(to: CGPoint(x: x, y: 8), control: CGPoint(x: x + 6, y: 0))
        context.strokePath()
    }
    context.setStrokeColor(color(0x46301D, alpha: 0.8).cgColor)
    context.move(to: CGPoint(x: -22, y: 0))
    context.addQuadCurve(to: CGPoint(x: 12, y: 0), control: CGPoint(x: -4, y: -1))
    context.strokePath()
    context.setFillColor(color(0x694528).cgColor)
    context.fillEllipse(in: CGRect(x: 5, y: -8, width: 16, height: 16))
    context.setFillColor(color(0xBA8B4D).cgColor)
    context.fillEllipse(in: CGRect(x: 8, y: -2, width: 10, height: 8))
    context.setFillColor(color(0x543921).cgColor)
    context.fillEllipse(in: CGRect(x: 17, y: -5, width: 9, height: 10))
    for side in [-1.0, 1.0] {
        context.setFillColor(color(0x211C15).cgColor)
        context.fillEllipse(in: CGRect(x: 21, y: side * 3 - 1, width: 2.5, height: 2.5))
        let wiggle = sin(time * 2.8 + side) * 3
        context.setStrokeColor(color(0x715232).cgColor)
        context.setLineWidth(0.8)
        context.move(to: CGPoint(x: 24, y: side * 2))
        context.addCurve(to: CGPoint(x: 49 + wiggle, y: side * 25),
                         control1: CGPoint(x: 33, y: side * 6),
                         control2: CGPoint(x: 42, y: side * (16 + wiggle)))
        context.strokePath()
    }
    context.restoreGState()
}

private final class PetPanel: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }

    init(size: CGSize) {
        super.init(contentRect: CGRect(origin: .zero, size: size),
                   styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = false
        level = .floating
        isFloatingPanel = true
        hidesOnDeactivate = false
        isReleasedWhenClosed = false
        ignoresMouseEvents = true
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]
        animationBehavior = .none
    }
}

private final class Pet {
    let panel = PetPanel(size: CGSize(width: 210, height: 150))
    let view = PetView(frame: CGRect(x: 0, y: 0, width: 210, height: 150))
    let name: String
    var position: CGPoint
    var target: CGPoint?
    var screen: NSScreen
    var angle: CGFloat = -.pi / 4
    var phase: CGFloat = 0
    var size: CGFloat
    var wait: Double = 0
    var dragging = false
    var message = ""
    var messageUntil: Double = 0

    init(name: String, screen: NSScreen, position: CGPoint, size: CGFloat) {
        self.name = name
        self.screen = screen
        self.position = position
        self.size = size
        panel.contentView = view
        panel.setAccessibilityLabel("桌面小强：\(name)")
        view.pet = self
        synchronize()
        panel.orderFrontRegardless()
    }

    func synchronize() {
        panel.setFrameOrigin(CGPoint(x: position.x - 105, y: position.y - 57))
        view.needsDisplay = true
    }

    func say(_ text: String) {
        message = text
        messageUntil = CACurrentMediaTime() + 3.2
    }
}

private final class PetView: NSView {
    weak var pet: Pet?
    var dragOffset = CGPoint.zero
    var startPosition = CGPoint.zero
    override var acceptsFirstResponder: Bool { false }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    override func draw(_ dirtyRect: NSRect) {
        guard let pet, let context = NSGraphicsContext.current?.cgContext else { return }
        context.clear(bounds)
        let time = CACurrentMediaTime()
        drawRoach(context, center: CGPoint(x: 105, y: 57), angle: pet.angle,
                  scale: pet.size, phase: pet.phase, time: time)
        if pet.messageUntil > time {
            let attributes: [NSAttributedString.Key: Any] = [
                .font: NSFont.systemFont(ofSize: 11, weight: .medium),
                .foregroundColor: color(0x526541),
            ]
            let text = pet.message as NSString
            let textSize = text.size(withAttributes: attributes)
            let box = CGRect(x: (bounds.width - textSize.width - 22) / 2, y: 105,
                             width: textSize.width + 22, height: 29)
            color(0xFFFEF0, alpha: 0.98).setFill()
            let path = NSBezierPath(roundedRect: box, xRadius: 9, yRadius: 9)
            path.fill()
            color(0xB7C3A4).setStroke()
            path.lineWidth = 0.75
            path.stroke()
            text.draw(at: CGPoint(x: box.minX + 11, y: box.minY + 7), withAttributes: attributes)
        }
    }

    override func mouseDown(with event: NSEvent) {
        guard let pet else { return }
        pet.dragging = true
        startPosition = pet.position
        let mouse = NSEvent.mouseLocation
        dragOffset = CGPoint(x: pet.position.x - mouse.x, y: pet.position.y - mouse.y)
    }

    override func mouseDragged(with event: NSEvent) {
        guard let pet else { return }
        let mouse = NSEvent.mouseLocation
        pet.position = CGPoint(x: mouse.x + dragOffset.x, y: mouse.y + dragOffset.y)
        if let screen = NSScreen.screens.first(where: { $0.frame.contains(mouse) }) { pet.screen = screen }
        pet.phase += 0.7
        pet.synchronize()
    }

    override func mouseUp(with event: NSEvent) {
        guard let pet else { return }
        pet.dragging = false
        pet.target = nil
        pet.wait = 1.5
        if distance(startPosition, pet.position) > 8 {
            pet.say("免费观光电梯，好评！")
        } else {
            pet.say(["是摸摸，不是拍扁，对吧？", "你忙你的，我陪着你。", "收到！今天也喜欢你。"].randomElement()!)
        }
        pet.synchronize()
    }

    override func rightMouseDown(with event: NSEvent) {
        guard let menu = (NSApp.delegate as? AppDelegate)?.menu else { return }
        NSMenu.popUpContextMenu(menu, with: event, for: self)
    }
}

private final class SnackView: NSView {
    override func draw(_ dirtyRect: NSRect) {
        NSColor.clear.setFill()
        bounds.fill(using: .copy)
        for index in 0..<7 {
            let angle = CGFloat(index) * 2.4
            let radius = CGFloat(index) * 1.7
            let rect = CGRect(x: 19 + cos(angle) * radius, y: 18 + sin(angle) * radius,
                              width: index.isMultiple(of: 2) ? 7 : 5, height: 5)
            color(index.isMultiple(of: 2) ? 0xDEBA7E : 0xB98B49).setFill()
            let crumb = NSBezierPath(roundedRect: rect, xRadius: 1, yRadius: 1)
            crumb.fill()
            color(0x8B693D).setStroke()
            crumb.lineWidth = 0.5
            crumb.stroke()
        }
    }
}

private final class Snack {
    let panel = PetPanel(size: CGSize(width: 44, height: 44))
    let position: CGPoint
    let screen: NSScreen
    var bites = 3
    init(position: CGPoint, screen: NSScreen) {
        self.position = position
        self.screen = screen
        panel.contentView = SnackView(frame: CGRect(x: 0, y: 0, width: 44, height: 44))
        panel.setFrameOrigin(CGPoint(x: position.x - 22, y: position.y - 22))
        panel.orderFrontRegardless()
    }
}

@MainActor
private final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    let menu = NSMenu()
    var statusItem: NSStatusItem!
    var timer: Timer?
    var pets: [Pet] = []
    var snacks: [Snack] = []
    var paused = false
    var hidden = false
    var interactive = false
    var speed: CGFloat = 1
    var previousTime = CACurrentMediaTime()
    var previousMouse = NSEvent.mouseLocation
    var mouseMovedUntil: Double = 0
    var meals = 0
    let defaults = CommandLine.arguments.contains("--self-test")
        ? UserDefaults(suiteName: "local.little-roach.desktop.tests")! : UserDefaults.standard
    let petNames = ["阿强", "六六", "小饼干", "跑跑", "芝麻", "小煤球", "闪电", "勇敢强"]

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        if CommandLine.arguments.contains("--self-test") {
            defaults.removePersistentDomain(forName: "local.little-roach.desktop.tests")
        }
        meals = max(0, defaults.integer(forKey: "meals"))
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem.button?.image = menuIcon()
        statusItem.button?.imagePosition = .imageLeading
        statusItem.button?.toolTip = "桌面小强：点击投喂、互动或退出"
        menu.delegate = self
        menu.autoenablesItems = false
        statusItem.menu = menu
        let count = defaults.object(forKey: "petCount") == nil ? 2 : min(8, max(1, defaults.integer(forKey: "petCount")))
        for _ in 0..<count { addPet() }
        pets.first?.say("这次，真的住进桌面啦。")
        rebuildMenu()
        timer = Timer(timeInterval: 1.0 / 30, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.tick() }
        }
        RunLoop.main.add(timer!, forMode: .common)
        NotificationCenter.default.addObserver(self, selector: #selector(screensChanged),
                                               name: NSApplication.didChangeScreenParametersNotification, object: nil)
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(willSleep),
                                                         name: NSWorkspace.willSleepNotification, object: nil)
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(didWake),
                                                         name: NSWorkspace.didWakeNotification, object: nil)
        if CommandLine.arguments.contains("--self-test") {
            DispatchQueue.main.async { self.runSelfTest() }
        }
    }

    func menuIcon() -> NSImage {
        let image = NSImage(size: CGSize(width: 21, height: 21), flipped: false) { _ in
            guard let ctx = NSGraphicsContext.current?.cgContext else { return false }
            ctx.setStrokeColor(NSColor.black.cgColor)
            ctx.setLineWidth(1.1)
            ctx.strokeEllipse(in: CGRect(x: 7, y: 3, width: 8, height: 12))
            ctx.move(to: CGPoint(x: 11, y: 3)); ctx.addLine(to: CGPoint(x: 11, y: 15))
            for y in [5, 9, 13] {
                ctx.move(to: CGPoint(x: 7, y: y)); ctx.addLine(to: CGPoint(x: 3, y: y - 2))
                ctx.move(to: CGPoint(x: 15, y: y)); ctx.addLine(to: CGPoint(x: 19, y: y - 2))
            }
            ctx.move(to: CGPoint(x: 9, y: 15)); ctx.addLine(to: CGPoint(x: 6, y: 20))
            ctx.move(to: CGPoint(x: 13, y: 15)); ctx.addLine(to: CGPoint(x: 17, y: 20))
            ctx.strokePath()
            return true
        }
        image.isTemplate = true
        return image
    }

    func menuWillOpen(_ menu: NSMenu) { rebuildMenu() }

    func rebuildMenu() {
        menu.removeAllItems()
        let title = NSMenuItem(title: "小强收容所 · 真正的桌面版", action: nil, keyEquivalent: "")
        title.isEnabled = false
        menu.addItem(title)
        let stats = NSMenuItem(title: "\(pets.count) 位室友 · 已吃掉 \(meals) 口面包屑", action: nil, keyEquivalent: "")
        stats.isEnabled = false
        menu.addItem(stats)
        menu.addItem(.separator())
        addMenu("投喂面包屑", #selector(feed))
        addMenu("召唤到鼠标附近", #selector(gather))
        addMenu("再领养一只", #selector(adopt), enabled: pets.count < 8)
        addMenu("送最后一只去休息", #selector(removePet), enabled: pets.count > 1)
        addMenu("打扫面包屑", #selector(clean), enabled: !snacks.isEmpty)
        menu.addItem(.separator())
        addMenu("互动模式：可以拖拽、摸摸", #selector(toggleInteractive), checked: interactive)
        let hint = NSMenuItem(title: interactive ? "现在可以拖拽小强，右键打开菜单" : "当前穿透鼠标，不影响正常办公", action: nil, keyEquivalent: "")
        hint.isEnabled = false
        menu.addItem(hint)
        addMenu("摸鱼模式：慢慢爬", #selector(toggleSpeed), checked: speed < 1)
        addMenu(paused ? "继续爬行" : "暂停爬行", #selector(togglePause))
        addMenu(hidden ? "显示小强" : "暂时隐藏（开会救星）", #selector(toggleHidden))
        menu.addItem(.separator())
        addMenu("关于桌面小强", #selector(about))
        addMenu("退出小强收容所", #selector(quit), key: "q")
        statusItem.button?.title = " \(pets.count)"
    }

    func addMenu(_ title: String, _ action: Selector, checked: Bool = false,
                 enabled: Bool = true, key: String = "") {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: key)
        item.target = self
        item.state = checked ? .on : .off
        item.isEnabled = enabled
        menu.addItem(item)
    }

    func activeScreen() -> NSScreen? {
        NSScreen.screens.first(where: { $0.frame.contains(NSEvent.mouseLocation) }) ?? NSScreen.main
    }

    func bounds(for screen: NSScreen) -> CGRect { screen.visibleFrame.insetBy(dx: 52, dy: 46) }

    func randomPoint(in rect: CGRect) -> CGPoint {
        CGPoint(x: CGFloat.random(in: rect.minX...max(rect.minX, rect.maxX)),
                y: CGFloat.random(in: rect.minY...max(rect.minY, rect.maxY)))
    }

    func addPet() {
        guard pets.count < 8, let screen = activeScreen() else { return }
        let rect = bounds(for: screen)
        let pet = Pet(name: petNames[pets.count], screen: screen,
                      position: CGPoint(x: rect.minX + rect.width * CGFloat.random(in: 0.32...0.68),
                                        y: rect.minY + rect.height * CGFloat.random(in: 0.3...0.6)),
                      size: pets.isEmpty ? 1.3 : CGFloat.random(in: 1.05...1.25))
        pet.panel.ignoresMouseEvents = !interactive
        if hidden { pet.panel.orderOut(nil) }
        pets.append(pet)
        defaults.set(pets.count, forKey: "petCount")
    }

    @objc func adopt() {
        addPet()
        pets.last?.say("这么大的桌面，有我的位置吗？")
        rebuildMenu()
    }

    @objc func removePet() {
        guard pets.count > 1 else { return }
        pets.removeLast().panel.close()
        defaults.set(pets.count, forKey: "petCount")
        rebuildMenu()
    }

    @objc func feed() {
        if hidden { toggleHidden() }
        if paused { togglePause() }
        for pet in pets.prefix(3) where snacks.count < 18 {
            let rect = bounds(for: pet.screen)
            let position = CGPoint(x: clamp(pet.position.x + CGFloat.random(in: -130...130), rect.minX, rect.maxX),
                                   y: clamp(pet.position.y + CGFloat.random(in: -100...100), rect.minY, rect.maxY))
            snacks.append(Snack(position: position, screen: pet.screen))
            pet.wait = 0
            pet.target = nil
            pet.say("闻到了，是碳水的香气！")
        }
    }

    @objc func clean() {
        snacks.forEach { $0.panel.close() }
        snacks.removeAll()
        pets.first?.say("连烦恼也一起扫走了。")
    }

    @objc func gather() {
        guard let screen = activeScreen() else { return }
        if hidden { toggleHidden() }
        let mouse = NSEvent.mouseLocation
        let rect = bounds(for: screen)
        for (index, pet) in pets.enumerated() {
            pet.screen = screen
            pet.position = CGPoint(x: clamp(mouse.x + CGFloat(index * 58 - 45), rect.minX, rect.maxX),
                                   y: clamp(mouse.y - CGFloat.random(in: 100...180), rect.minY, rect.maxY))
            pet.target = nil
            pet.wait = 2
            pet.say("小强小分队，集合！")
            pet.synchronize()
        }
    }

    @objc func toggleInteractive() {
        interactive.toggle()
        for pet in pets {
            pet.panel.ignoresMouseEvents = !interactive
            pet.dragging = false
            pet.say(interactive ? "轻轻拖我，不许拍扁。" : "你忙你的，我自己玩。")
            pet.synchronize()
        }
        rebuildMenu()
    }

    @objc func toggleSpeed() { speed = speed < 1 ? 1 : 0.4; rebuildMenu() }
    @objc func togglePause() { paused.toggle(); previousTime = CACurrentMediaTime(); rebuildMenu() }
    @objc func toggleHidden() {
        hidden.toggle()
        for pet in pets { hidden ? pet.panel.orderOut(nil) : pet.panel.orderFrontRegardless() }
        for snack in snacks { hidden ? snack.panel.orderOut(nil) : snack.panel.orderFrontRegardless() }
        previousTime = CACurrentMediaTime()
        rebuildMenu()
    }

    @objc func about() {
        let alert = NSAlert()
        alert.messageText = "小强收容所 · 桌面版"
        alert.informativeText = "这是原生 macOS 桌面宠物，不是网页。\n\n小强会在真实桌面和普通窗口上爬行、躲开移动的鼠标、寻找面包屑。菜单栏的虫子图标是它们的控制中心。\n\n默认穿透鼠标，不挡你的工作。开启互动模式后可拖拽、点击小强，右键打开菜单。\n\n不联网，不读取屏幕，不需要辅助功能权限，也不会开机自启。退出后所有小强立即消失。"
        alert.addButton(withTitle: "继续一起摸鱼")
        NSApp.activate(ignoringOtherApps: true)
        alert.runModal()
    }

    @objc func quit() { NSApp.terminate(nil) }
    @objc func willSleep() { timer?.fireDate = .distantFuture }
    @objc func didWake() { previousTime = CACurrentMediaTime(); timer?.fireDate = .now }

    @objc func screensChanged() {
        guard let fallback = NSScreen.main else { return }
        let screens = NSScreen.screens
        for pet in pets {
            pet.screen = screens.first(where: { $0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? Int == pet.screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? Int }) ?? fallback
            let rect = bounds(for: pet.screen)
            pet.position = CGPoint(x: clamp(pet.position.x, rect.minX, rect.maxX), y: clamp(pet.position.y, rect.minY, rect.maxY))
            pet.target = nil
            pet.synchronize()
        }
        clean()
    }

    func tick() {
        let now = CACurrentMediaTime()
        let dt = min(0.08, now - previousTime)
        previousTime = now
        guard !paused, !hidden else { return }
        let mouse = NSEvent.mouseLocation
        if distance(mouse, previousMouse) > 2 { mouseMovedUntil = now + 0.3 }
        previousMouse = mouse
        let reduceMotion = NSWorkspace.shared.accessibilityDisplayShouldReduceMotion
        for pet in pets {
            if pet.dragging { continue }
            if pet.wait > 0 {
                pet.wait -= dt
                pet.view.needsDisplay = true
                continue
            }
            let rect = bounds(for: pet.screen)
            let snack = snacks.filter { $0.screen == pet.screen }.min { distance($0.position, pet.position) < distance($1.position, pet.position) }
            var velocity: CGFloat = 48 * speed * (reduceMotion ? 0.5 : 1)
            if let snack { pet.target = snack.position; velocity *= 1.6 }
            else if now < mouseMovedUntil && !interactive && distance(mouse, pet.position) < 100 {
                let escapeAngle = atan2(pet.position.y - mouse.y, pet.position.x - mouse.x)
                pet.target = CGPoint(x: clamp(pet.position.x + cos(escapeAngle) * 155, rect.minX, rect.maxX),
                                     y: clamp(pet.position.y + sin(escapeAngle) * 155, rect.minY, rect.maxY))
                velocity *= 2.5
            }
            if pet.target == nil { pet.target = randomPoint(in: rect) }
            guard let target = pet.target else { continue }
            let dx = target.x - pet.position.x
            let dy = target.y - pet.position.y
            let length = hypot(dx, dy)
            if length < 9 {
                pet.target = nil
                pet.wait = Double.random(in: 0.7...2.5)
                if let snack {
                    snack.bites -= 1
                    meals += 1
                    defaults.set(meals, forKey: "meals")
                    pet.say(["咔嚓！真香。", "桌面有粮，心里不慌。", "房租可以用可爱抵吗？"].randomElement()!)
                    if snack.bites <= 0 {
                        snack.panel.close()
                        snacks.removeAll { $0 === snack }
                    }
                } else if Int.random(in: 0..<12) == 0 {
                    pet.say(["我不是摸鱼，我在巡逻。", "你忙你的，我陪着你。", "今天也要认真地活着。", "禁止内卷，允许乱爬。"].randomElement()!)
                }
            } else {
                let desired = atan2(dy, dx)
                let turn = atan2(sin(desired - pet.angle), cos(desired - pet.angle))
                pet.angle += turn * min(1, dt * 8)
                let step = min(length, velocity * dt)
                pet.position.x = clamp(pet.position.x + dx / length * step, rect.minX, rect.maxX)
                pet.position.y = clamp(pet.position.y + dy / length * step, rect.minY, rect.maxY)
                pet.phase += dt * velocity * 0.45
            }
            pet.synchronize()
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        timer?.invalidate()
        pets.forEach { $0.panel.close() }
        snacks.forEach { $0.panel.close() }
    }

    func runSelfTest() {
        func check(_ condition: @autoclosure () -> Bool, _ description: String) {
            guard condition() else {
                fputs("FAIL: \(description)\n", stderr)
                exit(1)
            }
            print("PASS: \(description)")
        }
        check(pets.count == 2, "two native desktop pets created")
        check(pets.allSatisfy { $0.panel.isVisible && !$0.panel.isOpaque && !$0.panel.hasShadow },
              "visible transparent borderless pet windows")
        check(pets.allSatisfy { $0.panel.ignoresMouseEvents && !$0.panel.canBecomeKey },
              "default mouse passthrough without keyboard focus theft")
        check(pets.allSatisfy { $0.panel.level == .floating && $0.panel.collectionBehavior.contains(.canJoinAllSpaces) },
              "pets float over applications and follow desktop Spaces")
        toggleInteractive()
        check(pets.allSatisfy { !$0.panel.ignoresMouseEvents }, "interactive dragging mode enabled")
        toggleInteractive()
        adopt()
        check(pets.count == 3 && defaults.integer(forKey: "petCount") == 3, "adoption persists roommate count")
        feed()
        check(snacks.count == 3 && snacks.allSatisfy { $0.panel.ignoresMouseEvents }, "food appears without blocking desktop clicks")
        for _ in 0..<600 {
            previousTime = CACurrentMediaTime() - 1.0 / 30
            tick()
        }
        check(meals > 0 && defaults.integer(forKey: "meals") > 0, "autonomous food seeking and eating")
        togglePause()
        let position = pets[0].position
        tick()
        check(pets[0].position == position, "pause stops movement")
        togglePause()
        toggleHidden()
        check(pets.allSatisfy { !$0.panel.isVisible } && snacks.allSatisfy { !$0.panel.isVisible }, "meeting mode hides all windows")
        toggleHidden()
        check(pets.allSatisfy { $0.panel.isVisible }, "meeting mode restores pet windows")
        gather()
        check(pets.allSatisfy { bounds(for: $0.screen).contains($0.position) }, "summoning stays inside usable screen bounds")
        clean()
        check(snacks.isEmpty, "cleanup removes every food window")
        removePet()
        check(pets.count == 2, "retiring a pet closes its window")
        for _ in 0..<10 { addPet() }
        check(pets.count == 8, "pet population is capped at eight")
        rebuildMenu()
        check(menu.items.first(where: { $0.action == #selector(adopt) })?.isEnabled == false, "adoption disabled at capacity")
        defaults.removePersistentDomain(forName: "local.little-roach.desktop.tests")
        print("Native desktop pet self-test complete.")
        NSApp.terminate(nil)
    }
}

@main
private struct DesktopRoachMain {
    @MainActor static func main() {
        let app = NSApplication.shared
        let delegate = AppDelegate()
        app.delegate = delegate
        withExtendedLifetime(delegate) { app.run() }
    }
}
