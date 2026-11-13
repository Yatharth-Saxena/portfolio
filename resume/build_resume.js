const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink, AlignmentType,
  TabStopType, BorderStyle, LevelFormat,
} = require("docx");

const FONT = "Calibri";
const SZ = 22; // 11pt
const RIGHT = 11906 - 2 * 720; // A4 width minus 0.5" margins

const t = (text, o = {}) => new TextRun({ text, font: FONT, size: SZ, ...o });
const link = (text, url, o = {}) =>
  new ExternalHyperlink({ link: url, children: [t(text, { color: "1F4E9A", underline: {}, ...o })] });

const heading = (text) =>
  new Paragraph({
    spacing: { before: 140, after: 60 },
    keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "444444", space: 1 } },
    children: [t(text.toUpperCase(), { bold: true, size: 23, color: "1F1F1F" })],
  });

// Left text + right-aligned date on one line
const row = (left, right, o = {}) =>
  new Paragraph({
    spacing: { before: o.before ?? 60, after: 10 },
    keepNext: true,
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT }],
    children: [...left, t("\t" + (right || ""), { italics: !!right })],
  });

const bullet = (runs) =>
  new Paragraph({
    numbering: { reference: "b", level: 0 },
    spacing: { after: 10 },
    children: typeof runs === "string" ? [t(runs)] : runs,
  });

const line = (runs, o = {}) => new Paragraph({ spacing: { after: 20, ...o }, children: runs });

const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 30 },
    children: [t("YATHARTH SAXENA", { bold: true, size: 34 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 20 },
    children: [
      t("+91 77048 33769  |  ", { size: 20 }),
      link("yatharthsaxena50@gmail.com", "mailto:yatharthsaxena50@gmail.com", { size: 20 }),
      t("  |  ", { size: 20 }),
      link("github.com/Yatharth-Saxena", "https://github.com/Yatharth-Saxena", { size: 20 }),
      t("  |  ", { size: 20 }),
      link("linkedin.com/in/yatharthsaxena01", "https://www.linkedin.com/in/yatharthsaxena01", { size: 20 }),
    ],
  }),

  heading("Summary"),
  line([
    t("Full-stack developer and B.Tech CSE student who has shipped production e-commerce websites for 2 paying clients, "
      + "one now taking real customer orders. Built the frontend and voice AI for Aethon, ranked 3rd (Software) in the "
      + "Smart India Hackathon 2026 internal pre-qualifiers. Seeking software development internships and entry-level roles."),
  ]),

  heading("Education"),
  row([t("Galgotias University", { bold: true }), t("  |  B.Tech, Computer Science and Engineering  |  "), t("CGPA: 8.40/10", { bold: true })], "2024 – 2028", { before: 20 }),
  row([t("New RSJ Public School", { bold: true }), t("  |  Class XII (CBSE): 80.0%  ·  Class X (CBSE): 89.9%")], "2024 / 2022", { before: 20 }),

  heading("Skills"),
  line([t("Languages: ", { bold: true }), t("JavaScript, Python, Java, C++, C, SQL")]),
  line([t("Frontend: ", { bold: true }), t("React, Tailwind CSS, Three.js, HTML, CSS")]),
  line([t("Backend & Databases: ", { bold: true }), t("Node.js, Express, REST APIs, WebSockets, MongoDB, MySQL")]),
  line([t("AI: ", { bold: true }), t("Speech-to-Text, Text-to-Speech, Local LLMs (Ollama)")]),
  line([t("Tools: ", { bold: true }), t("Git, GitHub, Vite, Linux, Cloudflare")]),
  line([t("Core CS: ", { bold: true }), t("Data Structures & Algorithms, OOP, DBMS")]),

  heading("Experience"),
  row([t("Freelance Full-Stack Web Developer", { bold: true })], "Sep 2026 – Present", { before: 20 }),
  bullet([
    t("Delivered production e-commerce websites for "), t("2 paying D2C clients", { bold: true }),
    t(" end to end, owning requirements, UI design, backend APIs and deployment on Cloudflare."),
  ]),
  bullet([
    link("aashienterprises.store", "https://aashienterprises.store"),
    t(": launched a storefront that now takes "), t("real customer orders", { bold: true }),
    t(", with cart, order tracking, and custom APIs for pincode-based delivery checks and WhatsApp enquiries."),
  ]),
  bullet([
    link("dronatek.in", "https://dronatek.in"),
    t(": developed an API-driven product catalogue with interactive Three.js 3D product models, a per-product design selector and Motion animations."),
  ]),

  heading("Projects"),
  row([t("Aethon – AI Assistant for Space Experiments", { bold: true }), t("  |  React, Three.js, Python  |  "), link("GitHub", "https://github.com/Yatharth-Saxena/Aethon-AI")], "Sep 2026", { before: 20 }),
  bullet("Built the React mission-control dashboard for an SIH 2026 project (team of 6): live camera feed with YOLOv8 and MediaPipe overlays, a Three.js 3D telemetry view, and step-by-step guidance updated over WebSockets."),
  bullet("Developed the voice assistant pipeline (speech-to-text, command parsing, local LLM via Ollama, text-to-speech) so users can run experiments hands-free and hear spoken warnings on out-of-order steps."),

  row([t("QuickBite – Food Ordering & Queue Management", { bold: true }), t("  |  React, Node.js, Express  |  "), link("GitHub", "https://github.com/Yatharth-Saxena/QuickBite")], "Mar 2026"),
  bullet("Designed an Estimated Pickup Time engine that models kitchen capacity: it batches identical orders, spreads work across active cooks, and adds walk-in (offline) load that online-only systems miss."),
  bullet("Implemented REST APIs for orders, menus and offline load that power separate customer and vendor apps with order tracking and crowd-level indicators (team of 3)."),

  row([t("Jarvis – Voice Assistant", { bold: true }), t("  |  Python")], "Jan 2026"),
  bullet("Automated desktop tasks such as launching apps and running web searches through voice commands, using a modular command system so new skills plug in without changing core logic."),

  heading("Achievements & Leadership"),
  bullet([t("Smart India Hackathon 2026", { bold: true }), t(" – Rank 3 in Software category and Top 10 overall in internal pre-qualifiers (Aethon)")]),
  bullet([t("VibeCon Hackathon", { bold: true }), t(" – Finalist with QuickBite")]),
  bullet([t("Tech Lead, IEEE Computer Society", { bold: true }), t(" – Galgotias University (2026 – Present)")]),

  heading("Certifications"),
  bullet([t("Red Hat", { bold: true }), t(" – Linux, System Administration")]),
  bullet([t("Oracle Academy", { bold: true }), t(" – Database Management Systems (DBMS)")]),
  bullet([t("GUVI | HCL", { bold: true }), t(" – Java, OOP, Servlets & JSP, Mastering MySQL")]),
];

const doc = new Document({
  creator: "Yatharth Saxena",
  title: "Yatharth Saxena – Resume",
  styles: { default: { document: { run: { font: FONT, size: SZ } } } },
  numbering: {
    config: [{
      reference: "b",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 300, hanging: 200 } } },
      }],
    }],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 620, bottom: 620, left: 720, right: 720 } } },
    children,
  }],
});

Packer.toBuffer(doc).then((b) => { fs.writeFileSync(process.argv[2], b); console.log("wrote", process.argv[2]); });
