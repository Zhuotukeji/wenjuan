import React from "react";

export const metadata = {
  title: "AI 工作流课前问卷",
  description: "面向综合部与商务团队的 AI 工作流实战课前调研"
};

export default function RootLayout({ children }) {
  return React.createElement(
    "html",
    { lang: "zh-CN" },
    React.createElement("body", null, children)
  );
}
