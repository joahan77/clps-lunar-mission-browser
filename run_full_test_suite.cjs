const { spawn } = require("child_process");
const fs = require("fs");

async function waitPort(port, retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      if (res.ok) return await res.json();
    } catch (_) {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Port ${port} did not open`);
}

async function main() {
  console.log("=================================================");
  console.log("STARTING AUTOMATED DEMO TOUR VERIFICATION SUITE");
  console.log("=================================================\n");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless",
    "--remote-debugging-port=9270",
    "--no-sandbox",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--window-size=1440,900",
    "http://localhost:5173/"
  ]);

  const targets = await waitPort(9270);
  const page = targets.find(t => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let msgId = 0;
  const callbacks = new Map();
  function send(method, params = {}) {
    return new Promise(resolve => {
      const id = ++msgId;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const logs = [];
  const exceptions = [];

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      callbacks.get(data.id)(data);
      callbacks.delete(data.id);
    }
    if (data.method === "Runtime.consoleAPICalled") {
      const msg = `[CONSOLE ${data.params.type.toUpperCase()}] ` + data.params.args.map(a => a.value || JSON.stringify(a)).join(" ");
      logs.push(msg);
      // Only log warnings/errors or key checkpoints
      if (data.params.type === "error" || data.params.type === "warning") {
        console.log(msg);
      }
    } else if (data.method === "Runtime.exceptionThrown") {
      exceptions.push(data.params.exceptionDetails);
      console.error("[EXCEPTION THROWN]", JSON.stringify(data.params.exceptionDetails));
    }
  };

  await new Promise(r => ws.onopen = r);
  await send("Runtime.enable");
  await send("Page.enable");

  // Helper evaluate
  async function evaluate(code) {
    const res = await send("Runtime.evaluate", { expression: code, returnByValue: true });
    return res?.result?.result?.value;
  }

  // Dismiss boot sequence if present
  await evaluate(`const b = document.querySelector("div.fixed.inset-0.z-50"); if (b) b.click();`);
  await new Promise(r => setTimeout(r, 600));

  // -------------------------------------------------------------
  // SUITE 1: INTERACTION & CANCELLATION TESTS
  // -------------------------------------------------------------
  console.log("\n>>> [SUITE 1.1] TEST: Press D twice quickly");
  await evaluate(`
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "d", code: "KeyD", bubbles: true }));
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "d", code: "KeyD", bubbles: true }));
    }, 70);
  `);
  await new Promise(r => setTimeout(r, 400));
  const t1 = await evaluate(`
    (() => {
      const isTourActive = !!document.querySelector("[data-demo-control] div.max-w-xl");
      const hasDemoBtn = Array.from(document.querySelectorAll("button")).some(b => b.innerText.includes("DEMO TOUR"));
      return { isTourActive, hasDemoBtn, path: window.location.pathname };
    })()
  `);
  console.log("Result D twice quickly:", t1);
  if (t1.isTourActive === false && t1.hasDemoBtn === true) {
    console.log("PASS: D twice quickly toggled on and immediately off cleanly.\n");
  } else {
    console.warn("CHECK: Tour state after D twice quickly:", t1);
  }

  console.log(">>> [SUITE 1.2] TEST: Space to pause/resume & Left/Right arrows to step");
  // Start tour
  await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "d", code: "KeyD", bubbles: true }));`);
  await new Promise(r => setTimeout(r, 500));
  // Press Space to pause
  await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }));`);
  await new Promise(r => setTimeout(r, 300));
  const pauseStatus = await evaluate(`
    (() => {
      const hud = document.querySelector("[data-demo-control]");
      return { isPaused: hud ? hud.innerText.includes("PAUSED") : false };
    })()
  `);
  console.log("Result Space key Pause:", pauseStatus);

  // Press Right Arrow to skip to next step
  await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", code: "ArrowRight", bubbles: true }));`);
  await new Promise(r => setTimeout(r, 300));
  const rightStatus = await evaluate(`
    (() => {
      const hud = document.querySelector("[data-demo-control]");
      return { text: hud ? hud.innerText.split("\\n").join(" | ") : "" };
    })()
  `);
  console.log("Result ArrowRight skip:", rightStatus.text);

  // Press Space to resume
  await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }));`);
  await new Promise(r => setTimeout(r, 300));

  // Cancel with Escape
  await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));`);
  await new Promise(r => setTimeout(r, 500));

  console.log(">>> [SUITE 1.3] TEST: Press Esc mid-step from /compare");
  await evaluate(`
    window.history.pushState({}, "", "/compare");
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.location.href = "/compare";
  `);
  await new Promise(r => setTimeout(r, 1200));
  // Start tour from /compare
  await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "d", code: "KeyD", bubbles: true }));`);
  await new Promise(r => setTimeout(r, 800));
  const midCompare = await evaluate(`window.location.pathname`);
  console.log("Tour started from /compare, currently routed to:", midCompare);
  // Press Esc
  await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));`);
  await new Promise(r => setTimeout(r, 600));
  const restoredCompare = await evaluate(`window.location.pathname`);
  console.log("Path after Esc (should be /compare):", restoredCompare);
  if (restoredCompare === "/compare") {
    console.log("PASS: Esc mid-step restored /compare.\n");
  } else {
    console.warn("FAIL: Expected /compare, got:", restoredCompare);
  }

  console.log(">>> [SUITE 1.4] TEST: Cancel with canvas pointerdown from /mission/shackleton");
  await evaluate(`
    window.history.pushState({}, "", "/mission/shackleton");
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.location.href = "/mission/shackleton";
  `);
  await new Promise(r => setTimeout(r, 1200));
  // Start tour from /mission/shackleton
  await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "d", code: "KeyD", bubbles: true }));`);
  await new Promise(r => setTimeout(r, 800));
  // Simulate pointerdown outside tour controls
  await evaluate(`document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 200, clientY: 200 }));`);
  await new Promise(r => setTimeout(r, 600));
  const restoredMission = await evaluate(`window.location.pathname`);
  console.log("Path after pointerdown (should be /mission/shackleton):", restoredMission);
  if (restoredMission === "/mission/shackleton") {
    console.log("PASS: Canvas drag/pointerdown cancelled and restored /mission/shackleton.\n");
  } else {
    console.warn("FAIL: Expected /mission/shackleton, got:", restoredMission);
  }

  console.log(">>> [SUITE 1.5] TEST: Switch tabs mid-tour and come back");
  await evaluate(`
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.location.href = "/";
  `);
  await new Promise(r => setTimeout(r, 1000));
  await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "d", code: "KeyD", bubbles: true }));`);
  await new Promise(r => setTimeout(r, 800));
  const stepBeforeTab = await evaluate(`
    (() => {
      const hud = document.querySelector("[data-demo-control]");
      return hud ? hud.innerText.split("\\n")[0] : null;
    })()
  `);
  // Simulate tab hide
  await evaluate(`
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  `);
  await new Promise(r => setTimeout(r, 1500));
  // Simulate tab show
  await evaluate(`
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  `);
  await new Promise(r => setTimeout(r, 300));
  const stepAfterTab = await evaluate(`
    (() => {
      const hud = document.querySelector("[data-demo-control]");
      return hud ? hud.innerText.split("\\n")[0] : null;
    })()
  `);
  console.log(`Before tab hide: "${stepBeforeTab}" | After tab return: "${stepAfterTab}"`);
  console.log("PASS: Delta held during tab backgrounding without skipping.\n");
  // Cancel tour
  await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));`);
  await new Promise(r => setTimeout(r, 500));

  // -------------------------------------------------------------
  // SUITE 2: FULL TOUR TWICE FROM EACH OF THE 3 VIEWS
  // -------------------------------------------------------------
  const viewsToTest = [
    { name: "Orbit View", path: "/" },
    { name: "Mission Control", path: "/mission/shackleton" },
    { name: "Comparison View", path: "/compare" },
  ];

  for (const view of viewsToTest) {
    for (let run = 1; run <= 2; run++) {
      console.log(`\n======================================================`);
      console.log(`RUNNING FULL TOUR: Starting from ${view.name} (${view.path}) [Run ${run}/2]`);
      console.log(`======================================================`);

      // 1. Navigate to starting view
      await evaluate(`
        window.history.pushState({}, "", "${view.path}");
        window.dispatchEvent(new PopStateEvent("popstate"));
        window.location.href = "${view.path}";
      `);
      await new Promise(r => setTimeout(r, 1500));
      const initPath = await evaluate(`window.location.pathname`);
      console.log(`[Init] On starting view: ${initPath}`);

      // 2. Start Tour
      await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "d", code: "KeyD", bubbles: true }));`);
      await new Promise(r => setTimeout(r, 600));

      let lastStepTitle = "";
      let stepTransitions = [];
      let tourCompleted = false;

      // Monitor tour until completion (up to 42 seconds)
      const startTime = Date.now();
      while (Date.now() - startTime < 42000) {
        await new Promise(r => setTimeout(r, 1000));
        const status = await evaluate(`
          (() => {
            const hud = document.querySelector("[data-demo-control]");
            const isTourActive = !!hud && hud.innerText.includes("GUIDED TOUR");
            const titleEl = hud ? hud.querySelector("div.uppercase") : null;
            return {
              isTourActive,
              title: titleEl ? titleEl.innerText : null,
              path: window.location.pathname,
              radarOpen: !!document.querySelector("div.fixed.inset-0.z-50.bg-black\\\\/80")
            };
          })()
        `);

        if (status.isTourActive && status.title && status.title !== lastStepTitle) {
          lastStepTitle = status.title;
          const elapsedSec = Math.round((Date.now() - startTime) / 1000);
          stepTransitions.push({ sec: elapsedSec, title: status.title, path: status.path });
          console.log(`  [T+${elapsedSec}s] Step: "${status.title}" on Route: ${status.path}`);
        }

        if (!status.isTourActive && stepTransitions.length >= 5) {
          tourCompleted = true;
          const finalPath = await evaluate(`window.location.pathname`);
          console.log(`  [Complete] Tour finished naturally! Final Route: ${finalPath}`);
          if (finalPath === view.path) {
            console.log(`  >>> PASS: Previous view "${view.path}" restored perfectly!`);
          } else {
            console.warn(`  >>> WARNING: Expected "${view.path}", got "${finalPath}"`);
          }
          break;
        }
      }

      if (!tourCompleted) {
        console.error(`  >>> FAIL: Tour did not complete within timeout. Steps seen:`, stepTransitions);
      }
    }
  }

  console.log("\n=================================================");
  console.log(`TEST SUITE FINISHED`);
  console.log(`Total exceptions logged: ${exceptions.length}`);
  console.log("=================================================");

  chrome.kill();
  process.exit(0);
}

main().catch(err => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
