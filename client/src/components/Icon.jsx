import React from "react";
const paths = {
  home: "M3 10 12 3l9 7v11h-6v-7H9v7H3Z",
  bag: "M5 7h14l1 14H4ZM8 7V5a4 4 0 0 1 8 0v2",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  plus: "M12 5v14M5 12h14",
  menu: "M4 6h16M4 12h16M4 18h16",
  clock: "M12 7v6l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  shirt: "m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4a4 4 0 0 1-8 0Z",
  grid: "M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  gift: "M3 10h18v11H3Zm-1-5h20v5H2Zm10 0v16M12 5H8.5a2.5 2.5 0 1 1 2.2-3.7L12 5Zm0 0h3.5a2.5 2.5 0 1 0-2.2-3.7L12 5Z"
};
export default function Icon({
  name = "bag",
  size = 22
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.bag} /></svg>;
}
