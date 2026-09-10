# 🌀 Tropical Cyclone Explorer

A static GitHub Pages web app for searching historical **tropical storms and hurricanes** and viewing their track and intensity.

It uses the U.S. National Hurricane Center's **HURDAT2** best-track database for:

- Atlantic: 1851 onward
- Northeast / North Central Pacific: 1949 onward

The map uses Leaflet + OpenStreetMap.

## What it does

- Search by storm name, year, basin, or NHC storm ID
- Filter Atlantic vs East/Central Pacific
- Filter hurricanes vs tropical storms
- Click any storm to draw its complete historical best track
- Track segments change colour with intensity
- Click track points to see:
  - date/time
  - classification
  - wind in knots and mph
  - pressure
  - coordinates
- Shows lifetime peak category, peak wind, minimum pressure, and dates
- Responsive layout for desktop, iPad and mobile

## First setup

1. Create a new GitHub repository.
2. Upload the contents of this folder, preserving the folders.
3. Go to **Actions** in GitHub.
4. Open **Update NOAA storm data**.
5. Click **Run workflow**.
6. Wait for the action to commit `data/atlantic.txt` and `data/pacific.txt`.
7. Go to **Settings → Pages**.
8. Under **Build and deployment**, choose:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/(root)**
9. Save.

GitHub will give you a URL such as:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

## Automatic updates

The included GitHub Action checks NOAA every Monday and commits the latest HURDAT2 files if NOAA has published a new version.

You can also run it manually from the Actions tab.

## Important limitation

HURDAT2 is the **post-storm best-track archive**, not a live hurricane feed. NOAA describes it as the official historical best-track record, with mostly six-hourly positions and intensities.

That makes this version ideal for historical search (Katrina, Andrew, Beryl, Milton, etc.).

A later version can add a **LIVE NOW** section using current NHC advisories / GIS data for active cyclones.

## Intensity colours

- Tropical Depression: blue
- Tropical Storm: turquoise
- Category 1: yellow
- Category 2: amber
- Category 3: orange-red
- Category 4: red/pink
- Category 5: purple
- Extratropical / low / disturbance: grey

## Files

- `index.html` — page structure
- `styles.css` — styling
- `app.js` — search, HURDAT parser, map, storm display
- `scripts/update_data.py` — finds and downloads the newest NOAA HURDAT2 files
- `.github/workflows/update-data.yml` — scheduled/manual updater

## Data source

National Hurricane Center HURDAT2:
https://www.nhc.noaa.gov/data/

This project is not an official NOAA/NHC product.
