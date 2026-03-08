# Optimize app performance and reduce unnecessary re-renders

## What this will improve

After reviewing the entire codebase, here are the key performance issues and the fixes planned:

---

### 🔄 **Reduce unnecessary screen re-renders**

- **Auth, Truck Settings, and Navigation contexts** don't memoize their return values — every state change in these providers causes all screens using them to re-render, even if the data they use didn't change
- Wrap return values in `useMemo` for AuthContext, TruckSettingsContext, and NavigationContext (similar to how FleetContext and NotificationsContext already do it)

---

### 🗺️ **Map screen optimizations**

- The map screen pulls data from **6 different contexts** — any change in any of them re-renders the entire map with all markers
- Add memoization to the marker lists so they don't re-render when unrelated state changes (e.g. drawer opening shouldn't re-render markers)
- Memoize the `onPress` handlers passed to each `Marker` to avoid creating new function references on each render

---

### 📦 **Avoid redundant style recalculations**

- `MapMarkers` recalculates `markerStyles(colors)` inside every marker instance via `useMemo` — when there are hundreds of markers, this is wasteful since `colors` is the same for all of them
- Move style calculation to a shared reference that only recalculates when the theme actually changes

---

### ⚡ **Optimize route hazard filtering**

- The `filterHazardsNearRoute` function checks every hazard against every route coordinate — this is very slow for long routes with many hazards
- Optimize by sampling route coordinates and using a bounding box pre-filter before expensive distance calculations

---

### 🧠 **Reduce AsyncStorage write frequency**

- Currently, every small state update (e.g. marking a notification as read) triggers an immediate `AsyncStorage.setItem`
- Batch writes by adding a small debounce to the persist hook, so rapid updates only write once

---

### 🔧 **Memoize context return values consistently**

- Ensure all context providers (Auth, TruckSettings, Community, Favourites) return memoized objects
- This prevents downstream consumers from re-rendering when the provider re-renders but its output hasn't changed

---

### Summary of changes
- 6 context files updated for memoization
- 1 hook updated for write debouncing  
- 2 service files optimized for computation
- 1 map screen optimized for rendering
- 1 marker component optimized for style sharing
