import React from "react";

const iconPaths = {
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5",
  upload: "M12 16V4 M7 9l5-5 5 5 M5 20h14",
  scissors: "M4 6l16 12 M4 18l16-12 M6 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  merge: "M7 7h6a4 4 0 0 1 4 4v6 M17 17l-3-3 M17 17l3-3 M7 17h4 M7 7l3-3 M7 7l3 3",
  signature: "M4 20h16 M6 16c2-6 4-6 5-3 1 3 3 3 5-1 1-2 2-2 4-2 M14 2l6 6-9 9H5v-6z",
  lock: "M7 11V8a5 5 0 0 1 10 0v3 M6 11h12v10H6z M12 15v2",
  unlock: "M7 11V8a5 5 0 0 1 9.6-2 M6 11h12v10H6z M12 15v2",
  image: "M4 5h16v14H4z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M4 17l5-5 4 4 3-3 4 4",
  search: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z M20 20l-4-4",
  spark: "M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z",
  download: "M12 4v10 M8 10l4 4 4-4 M5 20h14",
  history: "M3 12a9 9 0 1 0 3-6.7 M3 4v5h5 M12 7v6l4 2",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4 12h2 M18 12h2 M12 4v2 M12 18v2 M5.6 5.6l1.4 1.4 M17 17l1.4 1.4 M18.4 5.6L17 7 M7 17l-1.4 1.4",
  crown: "M3 8l5 4 4-7 4 7 5-4-2 11H5z",
  shield: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z M8.5 12l2.3 2.3L16 9",
  plus: "M12 5v14 M5 12h14",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  folder: "M3 7h7l2 2h9v10H3z",
  zap: "M13 2L4 14h7l-1 8 10-13h-7z",
  check: "M20 6L9 17l-5-5",
  wand: "M15 4l5 5 M14 5l5 5 M4 20l11-11 M6 4h.01 M10 2h.01 M3 8h.01 M20 16h.01 M17 21h.01",
  minimize: "M6 12h12",
  maximize: "M7 7h10v10H7z",
  close: "M6 6l12 12 M18 6L6 18",
  home: "M4 11l8-7 8 7v9H4z M10 20v-6h4v6",
  arrowLeft: "M19 12H5 M12 19l-7-7 7-7",
  trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  arrowUp: "M12 19V5 M5 12l7-7 7 7",
  arrowDown: "M12 5v14 M19 12l-7 7-7-7",
  printer: "M6 9V2h12v7 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6z",
  layers: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  code: "M16 18l6-6-6-6 M8 6L2 12l6 6"
};

export default function Icon({ name = "file", size = 20, className = "" }) {
  const safeName = typeof name === "string" && iconPaths[name] ? name : "file";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={iconPaths[safeName]} />
    </svg>
  );
}
