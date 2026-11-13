// Everything Otto knows. Every spoken line lives here so scripts/voice.mjs can
// pre-generate its audio. Keep answers short: they are read aloud.

export const CONTACT = {
  whatsapp: "917704833769",
  email: "yatharthsaxena50@gmail.com",
  linkedin: "https://www.linkedin.com/in/yatharthsaxena01",
  github: "https://github.com/Yatharth-Saxena",
};

// One line per section, said when Otto arrives there.
export const TOUR = {
  hero: "That's Yatharth. He designs and builds websites, and he built me too. Scroll, and I'll show you his work.",
  otto: "That's me, up close. Every part of me is something he built: I listen, I think, and I talk.",
  work: "Five things he has built. Two of them are real stores, for real paying clients.",
  aashi: "This one is live, and it is taking real customer orders.",
  drona: "Those product models are real 3D. You can spin them around on the live site.",
  quickbite: "QuickBite tells you the truth about your wait. It counts the walk-in queue too.",
  aethon: "Aethon is my cousin, sort of. It listens, talks back, and warns you when you skip a step.",
  about: "That's him. Third year of computer science, and already shipping for clients.",
  stack: "These are the tools he reaches for.",
  contact: "Got a project? Type it here and it goes straight to his WhatsApp.",
  footer: "That's the tour. Flick me around if you get bored.",
};

// Tap-to-ask chips per section: [question, answer id]
export const CHIPS = {
  otto: [["Who are you?", "pebble"], ["How was I made?", "howmade"], ["Does he do AI?", "ai"]],
  hero: [["Who is Yatharth?", "who"], ["What does he build?", "services"], ["Is he available?", "available"], ["Who are you?", "pebble"]],
  work: [["Which are client work?", "clients"], ["What's the best one?", "best"], ["Can I see the code?", "code"]],
  aashi: [["What did he build here?", "aashi"], ["Is it really live?", "aashi-live"], ["Can he build mine?", "hire"]],
  drona: [["What did he build here?", "drona"], ["How is the 3D made?", "threejs"], ["Can he build mine?", "hire"]],
  quickbite: [["What is QuickBite?", "quickbite"], ["How does the maths work?", "ept"], ["What's next for it?", "quickbite-next"]],
  aethon: [["What is Aethon?", "aethon"], ["What was his part?", "aethon-role"], ["How did it place?", "sih"]],
  about: [["Where does he study?", "college"], ["What's his CGPA?", "cgpa"], ["Any achievements?", "achievements"]],
  stack: [["What's his main stack?", "stack"], ["Does he do backend?", "backend"], ["Does he do AI?", "ai"]],
  contact: [["How much does a site cost?", "price"], ["How long does it take?", "timeline"], ["How does it work?", "process"]],
  footer: [["Get his resume", "resume"], ["Is he available?", "available"], ["How do I reach him?", "contact"]],
};

// The answer bank. k = words and phrases that point at this answer (English + Hinglish).
export const BANK = [
  { id: "who", k: "who is yatharth saxena about him introduce yourself kaun hai tell me about", a: "Yatharth is a full-stack developer and a third-year computer science student. His name means real, and so is his work: he has shipped two online stores for paying clients." },
  { id: "pebble", k: "who are you what are you otto robot your name bot tum kaun ho are you ai", a: "I'm Otto, a small robot who lives on this page. Yatharth built me to walk you through his work and answer questions about it." },
  { id: "services", k: "what does he build services offer do make kya banata website banwani hai web app landing page store ecommerce", a: "He builds business websites, online stores, landing pages and custom web apps. Design, code, backend and launch, all by him." },
  { id: "available", k: "available hire free open to work internship job freelance looking kaam availability", a: "Yes. He is taking freelance projects now, and he is looking for software internships and entry-level roles." },
  { id: "hire", k: "can he build mine make my website for me my business hire him mera banwana banado project chahiye", a: "Very likely. Tell him what you need in the box at the bottom of the page, and he will reply within a day." },
  { id: "price", k: "price cost charge rate fees how much kitna kitne ka padega paisa budget quote pricing expensive cheap rupees", a: "It depends on what you need, so he quotes after a short chat. Send him a message and you will get a price within a day." },
  { id: "timeline", k: "how long time take duration deadline days weeks kitna time kab tak delivery fast", a: "A landing page takes about a week. A full online store usually takes three to five weeks, depending on the features." },
  { id: "process", k: "process how does it work steps workflow kaise hota what happens after", a: "Four steps. A call to understand what you need, a design you approve, the build, and then the launch with support after." },
  { id: "clients", k: "client work paid real clients which freelance customers kiske liye", a: "Aashi Enterprises and Drona Tek are paid client work. Aethon, QuickBite and Jarvis are projects, two of them from hackathons." },
  { id: "best", k: "best project favourite strongest most impressive top proud", a: "For clients, Aashi Enterprises, because real people buy from it. For engineering, Aethon, the voice-driven assistant from Smart India Hackathon." },
  { id: "code", k: "code github source repo repository open source dekh", a: "Aethon and QuickBite are on his GitHub. The client stores are private, but both sites are live for you to try." },
  { id: "aashi", k: "aashi enterprises mantra box store what built divine", a: "A full storefront for Aashi Enterprises: cart, order tracking, a delivery check by pincode, WhatsApp enquiries, and a 3D preview of the product in a room." },
  { id: "aashi-live", k: "really live real orders customers selling working aashi sales", a: "Yes. Aashi Enterprises is live at aashienterprises.store, and it takes real customer orders." },
  { id: "drona", k: "drona tek dronatek chalisa speaker what built catalogue", a: "A product catalogue for Drona Tek with interactive 3D models, a design picker for every product, and animations throughout. It is ready for the brand's online launch." },
  { id: "threejs", k: "3d three.js threejs models how made webgl animation motion", a: "The 3D is built with Three.js, straight in the browser. The motion uses the Motion library, and everything is served through Cloudflare." },
  { id: "quickbite", k: "quickbite quick bite food ordering queue cafeteria canteen what is", a: "QuickBite is a food ordering system that tells you honestly when your order will be ready. It was a finalist at the VibeCon hackathon." },
  { id: "ept", k: "maths math formula how does estimate pickup time engine algorithm work ept logic calculate", a: "It batches identical orders, spreads the work across the cooks on shift, and adds the walk-in queue that online-only apps cannot see." },
  { id: "quickbite-next", k: "next future plan camera roadmap upcoming quickbite improve", a: "The plan is a camera that counts the walk-in crowd by itself, so vendors never enter it by hand. That part is not built yet." },
  { id: "aethon", k: "aethon sih project space assistant lab isro what is", a: "Aethon is an AI assistant for space experiments. It watches your hands with computer vision, guides each step, and speaks up when one is done out of order." },
  { id: "aethon-role", k: "his part role contribution what did he do aethon frontend voice responsibility team", a: "He built the mission-control dashboard in React and Three.js, and the whole voice pipeline: speech to text, a local language model, and speech back." },
  { id: "sih", k: "sih smart india hackathon rank place result win position hackathon kaisa", a: "Aethon ranked third in the software category and top ten overall in the Smart India Hackathon 2026 internal pre-qualifiers." },
  { id: "achievements", k: "achievements awards wins hackathons vibecon ieee tech lead leadership position", a: "Rank three in software at the Smart India Hackathon pre-qualifiers, a finalist at VibeCon, and Tech Lead of the IEEE Computer Society at his university." },
  { id: "college", k: "college university study where education degree btech galgotias kahan padhta student year", a: "He is in the third year of a B.Tech in computer science at Galgotias University, graduating in 2028." },
  { id: "cgpa", k: "cgpa gpa marks grades percentage score academics", a: "His CGPA is 8.4 out of 10." },
  { id: "stack", k: "stack tech technology tools languages main uses skills kya aata framework", a: "React and Three.js on the front, Node and Express behind, with JavaScript, Python and Java as his main languages." },
  { id: "backend", k: "backend api server database node express mongodb mysql rest websockets full stack", a: "Yes. He writes the APIs himself, in Node and Express, and works with MongoDB and MySQL. Both client stores run on APIs he wrote." },
  { id: "ai", k: "ai artificial intelligence machine learning llm voice speech ollama ml chatbot", a: "Yes, mostly voice. He has built speech to text, text to speech and local language model pipelines, first in Jarvis and then in Aethon." },
  { id: "jarvis", k: "jarvis voice assistant python desktop", a: "Jarvis is a voice assistant he wrote in Python. It opens apps and searches the web when you ask out loud." },
  { id: "contact", k: "contact reach email phone whatsapp call message number linkedin baat kaise connect", a: "The fastest way is WhatsApp. The box at the bottom of the page opens a message to him, and his email and LinkedIn are right under it." },
  { id: "resume", k: "resume cv download pdf biodata", a: "His resume is one page. There is a link to it at the top of this page and in the footer." },
  { id: "location", k: "where based location city live from country india noida remote", a: "He is based in Greater Noida, India, and works with clients remotely." },
  { id: "leetcode", k: "leetcode dsa competitive coding codeforces problems data structures algorithms", a: "He knows his data structures and algorithms, and he is practising on LeetCode. The projects here are the stronger proof." },
  { id: "name", k: "name meaning yatharth means matlab", a: "Yatharth is a Hindi word. It means real, or the truth of a thing." },
  { id: "howmade", k: "how was this site made built this website portfolio you made of who made you", a: "Yatharth built this site with GSAP for the scroll, his own physics for me, and a voice generated ahead of time so it costs nothing to run." },
  { id: "hello", k: "hi hello hey namaste hii yo sup good morning", a: "Hello! Ask me anything about Yatharth, or scroll and I'll walk you through his work." },
  { id: "thanks", k: "thanks thank you shukriya dhanyavad nice cool great awesome", a: "Happy to help! If you have a project in mind, the box at the bottom goes straight to him." },
];

// m13: one line on arrival in a dimension, then one for each stop the camera makes there (zone -> lines)
export const GUIDE = {
  1: { in: "m13-1-in", beats: ["m13-1-0", "m13-1-1"] },
  2: { in: "m13-2-in", beats: ["m13-2-0", "m13-2-1", "m13-2-2"] },
  3: { in: "tour-make", beats: ["m13-3-0", "m13-3-1", "m13-3-2"] },
  4: { in: "m13-4-in", beats: ["m13-4-0", "m13-4-1", "tour-quickbite", "m13-4-3"] },
  5: { beats: ["m13-5-0", "tour-contact"] },
};
const GUIDE_LINES = {
  "m13-1-in": "And we're through. Watch the stars up ahead.",
  "m13-1-0": "See the face in the stars, over the horizon? That's Yatharth.",
  "m13-1-1": "He's a full-stack developer. He builds websites, online stores and apps, and he built me too.",
  "m13-2-in": "This is where you get to know him. Three numbers tell his story.",
  "m13-2-0": "Two. That's how many websites he has built for paying clients, start to finish.",
  "m13-2-1": "Three. His team's rank in software at the Smart India Hackathon. That's the team, just beside it.",
  "m13-2-2": "And eight point four. His CGPA, in the third year of computer science.",
  "m13-3-0": "Websites for people who want to be remembered, and online stores that take real orders.",
  "m13-3-1": "Over here, the apps and APIs behind them, and 3D you can turn in your hands.",
  "m13-3-2": "And voice AI. Speech in, a model that runs locally, speech out. A bit like me.",
  "m13-4-in": "Now, his work. Stores for paying clients, and the things he built at hackathons.",
  "m13-4-0": "Two online stores, built end to end for paying clients. Aashi Enterprises is already live.",
  "m13-4-1": "Aethon is an AI for space experiments that talks back. He built its dashboard and its voice.",
  "m13-4-3": "And Jarvis, his side project. Ask it out loud, and it opens apps and searches the web.",
  "m13-5-0": "Last stop. If you liked what you saw, this is where you reach him.",
};

export const FALLBACK = "I'm not sure about that one. Yatharth will know, so ask him directly on WhatsApp.";
export const RESTING = "Pick me up and throw me. Go on.";

export const byId = Object.fromEntries(BANK.map((b) => [b.id, b]));

// Every line that needs a voice clip: id -> text
export function allLines() {
  const out = {};
  for (const [k, v] of Object.entries(TOUR)) out["tour-" + k] = v;
  for (const b of BANK) out["a-" + b.id] = b.a;
  out["intro-go"] = "Lovely. Let me introduce you to Yatharth.";
  // the cinematic tour (m11)
  out["tour-start"] = "Systems online. Hi, I'm Otto. Let me show you around.";
  out["tour-make"] = "This is what he makes. Websites first, and everything a website needs behind it.";
  out["tour-end"] = "That's the tour. Write to him, and I'll make sure he sees it.";
  // the dimensions tour (m13): Otto speaks as each thing comes into view
  Object.assign(out, GUIDE_LINES);
  out["fallback"] = FALLBACK;
  out["ouch"] = "Whee!";
  out["ouch2"] = "Oof. Okay, that was fun.";
  out["sleep"] = "Wake me up when you need me.";
  return out;
}
