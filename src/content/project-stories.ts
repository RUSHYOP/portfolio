export interface ProjectStory {
  slug: string;
  category: string;
  headline: string;
  intro: string;
  context: string;
  image?: string;
  imageAlt?: string;
  imageCaption?: string;
  sections: { title: string; paragraphs: string[] }[];
}

export const projectStories: Record<string, ProjectStory> = {
  "digital-garden": {
    slug: "digital-garden",
    category: "Full stack · Knowledge platform",
    context: "Reading library & private notes",
    headline: "A place for ideas to connect.",
    intro:
      "Digital Garden turns an Obsidian-based collection into a web reading experience, pairing a public library of book notes with connected reading paths, private Markdown vaults, and PDF exports.",
    image: "/work/digital-garden.webp",
    imageAlt:
      "Digital Garden’s public homepage with a featured reading note and book library",
    imageCaption: "Digital Garden / Public reading library",
    sections: [
      {
        title: "From a vault to a reading experience",
        paragraphs: [
          "Notes become more useful when their connections are easy to follow. Digital Garden takes an Obsidian vault and presents it as linked notes, book breakdowns, and ordered reading paths, while keeping Markdown as the source format.",
          "The public library gives readers a starting point through collection overviews and published sample notes. Signed-in readers can explore the wider garden, with access determined by the collection and their account.",
        ],
      },
      {
        title: "Reading through connections",
        paragraphs: [
          "The reading interface supports Obsidian wikilinks and callouts, mathematical notation, highlighted code, and Mermaid diagrams. Backlinks and outgoing links make it possible to move between related ideas instead of treating each note as a standalone page.",
          "Maps of Content organize notes into reading sequences. A searchable graph shows connections between collections, while a typo-tolerant command palette helps readers find note titles. Collection-level read status provides a way to keep track of explored material.",
        ],
      },
      {
        title: "A space for your own notes",
        paragraphs: [
          "Members can import Markdown files or Markdown-only ZIP archives into a private vault. The implementation separates personal notes from public library content, with ownership and access checks around reads, uploads, and exports.",
          "PDF export extends the experience beyond the browser. A reader can export an individual note or an ordered collection, with the collection workflow assembling its overview, contents, and notes. Full-book exports use a queued job flow so preparation and rendering can continue outside a single page request.",
        ],
      },
      {
        title: "The systems behind the garden",
        paragraphs: [
          "The application uses Next.js, React, TypeScript, and Tailwind CSS. A Node.js internal API connects the frontend to PostgreSQL for accounts, subscriptions, and member operations. Content storage supports Cloudflare R2 and a home-server backend.",
          "The vault sync pipeline builds metadata, backlinks, reading sequences, and search indexes ahead of time. Content hashes identify changed files, allowing an incremental sync rather than uploading the entire vault after every edit.",
          "Google sign-in provides account access, while Razorpay handles subscription billing. Signed webhook events feed subscription state into the application; a browser checkout callback alone does not grant access. Server-side content checks also apply to PDF exports.",
        ],
      },
    ],
  },
  gharpay: {
    slug: "gharpay",
    category: "Web application · Collaboration",
    context: "Collaborative project",
    headline: "A clearer picture of society finances.",
    intro:
      "GharPay brings monthly maintenance, payment records, expenses, and reserve funds into a shared accounting workflow for apartment societies. A collaborative project built around the everyday work of administrators and residents.",
    image: "/work/gharpay.webp",
    imageAlt:
      "GharPay’s public homepage introducing its apartment society accounting product",
    imageCaption: "GharPay / Public website · Collaborative project",
    sections: [
      {
        title: "One month, many moving parts",
        paragraphs: [
          "A society’s monthly accounts connect several kinds of information: what each unit owes, what residents have paid, which expenses have been recorded, and what remains at the end of the month. GharPay organizes these records around apartments, blocks, units, and the people responsible for them.",
          "Administrators work with statements, collections, expenses, and the corpus reserve. Residents get a view of their own dues and payment records. The same underlying accounting process serves both, with a different workspace for each role.",
        ],
      },
      {
        title: "From a statement to a settled month",
        paragraphs: [
          "Monthly statements bring maintenance dues and configured corpus contributions together. Residents can review their unit’s statement, use the society’s payment instructions, and submit proof of payment for review.",
          "An administrator then approves or rejects the submission. The review records who made the decision and when, keeping a submitted proof distinct from an approved collection. Month-end summaries combine approved dues and recorded expenses before the period is closed.",
          "The society-payment workflow records transfers made to the society; it does not require GharPay to hold those funds. This keeps the product focused on the accounting record and the work around it.",
        ],
      },
      {
        title: "The engineering behind the record",
        paragraphs: [
          "The web application uses Next.js and TypeScript, with Drizzle ORM and PostgreSQL for relational data. Better Auth handles authentication. Server-side permissions scope operations to the appropriate apartment or unit, while database row-level security provides another layer of access control.",
          "Payment review is guarded by the submission’s current state. An approval updates only a still-pending submission, so a second administrator cannot simply overwrite a review that has already happened. Monetary inputs are validated before they reach statement records, including checks for negative, non-finite, and over-precision amounts.",
          "Closing a month is also a permission-checked operation. The implementation coordinates the expense freeze and surplus posting under a shared apartment-and-month lock. These details matter because a useful ledger depends on consistent transitions, not just a clear dashboard.",
        ],
      },
      {
        title: "A shared product, a consistent interface",
        paragraphs: [
          "I worked on GharPay in collaboration. The project brings together product design, application development, and the accounting rules that connect residents with society administrators.",
          "The interface uses shared navigation, page headers, settings patterns, and a common design system across roles. Its risograph-inspired visual language carries from the public website into the signed-in workspaces, while the information shown changes with each user’s responsibilities.",
        ],
      },
    ],
  },
  proj_2: {
    slug: "procsage",
    category: "Machine learning · Research",
    context: "IEEE ESCI 2025 publication",
    headline: "Looking for threats in system-call behavior.",
    intro:
      "ProcSAGE explores host-based threat detection through machine learning, using anomalies in system calls as signals of potentially suspicious activity.",
    sections: [
      {
        title: "Watching what a process does",
        paragraphs: [
          "System calls describe how a running program interacts with its operating system. ProcSAGE focuses on this behavior as a source of information for endpoint security, looking for activity that differs from expected patterns.",
          "The project approaches the problem through anomaly detection: using a Python-based machine learning model to examine system-call behavior rather than treating every unusual event as a confirmed threat.",
        ],
      },
      {
        title: "Research as the deliverable",
        paragraphs: [
          "The work was published at the IEEE ESCI 2025 conference. The publication is the place to explore the research methodology, evaluation, and conclusions in detail.",
          "The project sits at the intersection of systems and machine learning: understanding what the host exposes, how that behavior can be represented, and what a model can infer from it.",
        ],
      },
      {
        title: "Read the publication",
        paragraphs: [
          "The paper is linked below for the full research account. This page introduces the project without making additional claims about detection accuracy or real-world deployment.",
        ],
      },
    ],
  },
  proj_1: {
    slug: "pulseai",
    category: "IoT · Machine learning",
    context: "Smartwatch prototype",
    headline: "Exploring heart-health signals on the wrist.",
    intro:
      "PulseAI is a smartwatch prototype that brings together health monitoring, anomaly detection, GSM alerts, and cloud synchronization.",
    sections: [
      {
        title: "A connected monitoring idea",
        paragraphs: [
          "The project explores how a wearable device could connect collected health signals with a machine learning workflow. Its scope combines the device, a way to synchronize information, and an alerting path.",
          "Python and machine learning form part of the prototype, alongside IoT integration and real-time cloud synchronization.",
        ],
      },
      {
        title: "Beyond the model",
        paragraphs: [
          "A wearable concept involves more than identifying an unusual signal. Information also has to move from the device to the systems that use it. PulseAI’s scope includes GSM alerts and cloud sync alongside anomaly detection, bringing communication into the same experiment.",
        ],
      },
      {
        title: "Prototype scope",
        paragraphs: [
          "PulseAI is a development prototype. It explores a technical approach to health monitoring; it is not presented as a clinically validated medical device. The repository provides the implementation context.",
        ],
      },
    ],
  },
  proj_5: {
    slug: "finai",
    category: "Natural language processing",
    context: "Google Dev Solution Challenge project",
    headline: "A conversational interface for finance questions.",
    intro:
      "FinAI is a finance-focused chatbot developed for the Google Dev Solution Challenge, combining Python, Flask, and natural language processing.",
    sections: [
      {
        title: "Starting with a question",
        paragraphs: [
          "FinAI explores conversation as an interface for financial topics. The project brings market-related information and legal context into a chatbot experience, rather than requiring users to navigate separate topic screens.",
        ],
      },
      {
        title: "The application layer",
        paragraphs: [
          "Python and Flask provide the application foundation, with NLP at the center of the interaction. The project’s technology stack also includes Google Cloud.",
          "The focus is an application of language technology to a specific domain: taking a user’s question and presenting a response within a finance-oriented experience.",
        ],
      },
      {
        title: "An exploratory application",
        paragraphs: [
          "This is a challenge project and an exploration of a conversational product. Its responses should not be treated as professional financial or legal advice. The source link provides a closer look at the implementation.",
        ],
      },
    ],
  },
  proj_6: {
    slug: "piggame",
    category: "JavaScript · Game logic",
    context: "Two-player browser game",
    headline: "A small game with state at its center.",
    intro:
      "PigGame is a two-player dice game built with HTML, CSS, and JavaScript, with the emphasis on the logic behind the interaction.",
    sections: [
      {
        title: "Rules become interactions",
        paragraphs: [
          "A two-player dice game is a compact way to work with application state. Each interaction belongs to a sequence of turns and outcomes, so the game logic has to stay in step with what the interface shows.",
        ],
      },
      {
        title: "Working with randomness",
        paragraphs: [
          "The implementation includes a Fisher–Yates shuffle in its dice logic. The project combines algorithmic work with the practical task of presenting a playable browser interface.",
          "HTML and CSS handle the page, while JavaScript carries the game behavior. The result is a focused exercise in connecting rules, state, and user actions.",
        ],
      },
      {
        title: "Play or inspect",
        paragraphs: [
          "The live game and source repository are both linked below. They offer two ways into the project: trying the interaction and reading the logic that drives it.",
        ],
      },
    ],
  },
  proj_7: {
    slug: "parkinsons-predictor",
    category: "Machine learning · Gradio",
    context: "Experimental health chatbot",
    headline: "Exploring a symptom-based chatbot interface.",
    intro:
      "A Python and Gradio experiment that uses symptom inputs in a Parkinson’s risk-assessment chatbot.",
    sections: [
      {
        title: "Making a model approachable",
        paragraphs: [
          "The project explores a conversational way to supply symptom information to a machine learning application. Gradio provides the interface around the Python implementation, making the experiment available as an interactive demo.",
        ],
      },
      {
        title: "The scope of the experiment",
        paragraphs: [
          "The original goal was to explore early diagnosis support through symptom-based inputs. The portfolio presents it as an experimental application, without claiming clinical validation or diagnostic accuracy.",
          "A model-facing interface can make an experiment easier to try, but that accessibility does not establish medical reliability. The distinction is part of how this project should be understood.",
        ],
      },
      {
        title: "Explore the prototype",
        paragraphs: [
          "The demo is hosted on Hugging Face Spaces, with source available separately. It is a technical and educational prototype, not a substitute for a clinician’s assessment.",
        ],
      },
    ],
  },
  proj_8: {
    slug: "securevault",
    category: "Browser application",
    context: "Local-storage experiment",
    headline: "Organizing credentials in the browser.",
    intro:
      "SecureVault is a personal project exploring grouped password records, JSON manipulation, and browser-local persistence.",
    sections: [
      {
        title: "A deliberately small application",
        paragraphs: [
          "The project started as an exercise in managing password records locally. Entries are organized into groups, with JSON as the working data format and browser local storage providing persistence.",
        ],
      },
      {
        title: "State that stays between visits",
        paragraphs: [
          "Built with HTML, CSS, and JavaScript, the application connects a simple interface to data stored in the browser. It explores how structured records can be read, changed, grouped, and kept across page visits.",
        ],
      },
      {
        title: "What the name does not guarantee",
        paragraphs: [
          "This is a local-storage learning project, not a claim of audited credential security. Browser persistence alone does not establish encryption or secure storage. Explore it with sample entries rather than real passwords.",
        ],
      },
    ],
  },
  proj_9: {
    slug: "mazesolver",
    category: "Python · Algorithms",
    context: "Maze generation and visualization",
    headline: "Making a search algorithm visible.",
    intro:
      "MazeSolver pairs maze generation with path visualization, using depth-first and breadth-first search to explore a classic data-structures problem.",
    sections: [
      {
        title: "From a maze to a graph",
        paragraphs: [
          "A maze turns an abstract search problem into something that can be seen. The project generates mazes and visualizes paths through them, connecting Python code to a clear spatial result.",
        ],
      },
      {
        title: "Two ways to explore",
        paragraphs: [
          "Depth-first search and breadth-first search provide different ways to visit the connected spaces in a maze. MazeSolver uses these algorithms as the basis for its generation and solving work.",
          "The visualization gives the algorithms a concrete setting: the search has a place to begin, routes to explore, and a path to show.",
        ],
      },
      {
        title: "Try the visualization",
        paragraphs: [
          "A live version is available on Hugging Face Spaces. The Python source is also linked for a closer look at the maze and path-finding implementation.",
        ],
      },
    ],
  },
  proj_10: {
    slug: "todo-list",
    category: "Python · Data structures",
    context: "Academic project",
    headline: "Practicing data structures through everyday tasks.",
    intro:
      "A Python to-do list application built as an academic project, using task management as a practical setting for data-structure skills.",
    sections: [
      {
        title: "A familiar problem to model",
        paragraphs: [
          "A task list gives data structures a tangible job: representing a collection of items that a person wants to keep track of. The project uses that familiar problem as a way to move from classroom concepts into application code.",
        ],
      },
      {
        title: "Learning through implementation",
        paragraphs: [
          "The scope is intentionally focused on Python and data structures. It is an academic exercise in translating a simple application idea into a working implementation, rather than a claim of a full productivity platform.",
        ],
      },
      {
        title: "Explore the code",
        paragraphs: [
          "The repository is the primary artifact for this project. It provides the implementation behind the task-list concept and its academic focus.",
        ],
      },
    ],
  },
};
