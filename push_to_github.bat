@echo off
REM ============================================================
REM  CLPS Lunar Mission Browser — Git Push Helper
REM  Run this from: e:\college work\CLPS lunar
REM ============================================================

echo [1/4] Staging all changes...
git add src/data.ts src/App.tsx src/Dashboard.tsx src/Scene.tsx
git add clps-app/src/data.ts clps-app/src/App.tsx clps-app/src/Dashboard.tsx clps-app/src/Scene.tsx
git add clps-app/public/
git add public/

echo [2/4] Committing...
git commit -m "feat: add 8 landing sites with dynamic site switching

- data.ts: expanded LandingSite interface with dataFile + heightmapUrl fields
  Added 8 sites: Shackleton, Malapert, de Gerlache, Mons Mouton, Nobile Rim,
  Haworth, Cabeus B, Slater Plain
  DataPoint: added optional solarIrradiance, batteryLevel, dataRate, commsStatus

- App.tsx: lifted selectedSite state up; fetches correct JSON on site change;
  isSiteFetching spinner overlay while loading; normalizes both array/object JSON

- Dashboard.tsx: accepts onSelectSite prop; site list scrollable (max-h 200px);
  loading spinner on active site button; 4 extra telemetry cards (irradiance,
  battery with progress bar, dataRate, commsStatus); coordinates show E/W correctly

- Scene.tsx: accepts heightmapUrl prop; LunarSurface uses key prop to reload
  heightmap texture when site changes

- public/: all 8 *_data.json + 8 *_heightmap.png synced to clps-app/public/"

echo [3/4] Pushing to GitHub...
git push origin main

echo [4/4] Done!
pause
