import { listKnownSkills } from "@/lib/jd";

/**
 * Read the facts out of the candidate's OWN job description.
 *
 * The offline provider used to ground questions in the seed JD that matched the
 * role title, which meant a candidate who pasted "Node, Postgres and
 * TypeScript" for a Backend Engineer role was asked about Java and Python —
 * technologies from the seed variant, not from their posting. This module
 * extracts the technologies and duties the candidate actually pasted so the
 * fallback can prefer them over assumed role knowledge.
 *
 * Deliberately deterministic: no AI, no network, no dependency on anything
 * except the committed seed dataset's skill vocabulary (`listKnownSkills`),
 * which keeps the recognized terms in sync with the dataset instead of a second
 * hand-maintained keyword list.
 */

export interface JdFacts {
  /** Technologies named in the posting, in order of first mention, display-cased. */
  skills: string[];
  /** Duty-shaped lines ("Build APIs …", "Own reliability …"), clause-ready. */
  responsibilities: string[];
  /** Whether the posting is design/architecture shaped. */
  designs: boolean;
  /** Whether the posting is data/ML shaped. */
  data: boolean;
}

const MAX_SKILLS = 12;
const MAX_RESPONSIBILITIES = 6;

/** Technologies common in postings that the seed dataset does not name. */
const EXTRA_SKILLS = [
  "Django",
  "Flask",
  "FastAPI",
  "Express",
  "Spring Boot",
  "Angular",
  "Vue",
  "Svelte",
  "Rust",
  "Scala",
  "PHP",
  "Ruby on Rails",
  "Laravel",
  "MongoDB",
  "DynamoDB",
  "Elasticsearch",
  "OpenSearch",
  "Supabase",
  "Vercel",
  "WebSocket",
  "OAuth",
  "OpenAPI",
  "Swagger",
  "Stripe",
  "Celery",
  "Nginx",
  "Datadog",
  "Sentry",
  "Sass",
  "Babel",
  "Electron",
  "LangChain",
  "OpenAI",
  "MATLAB",
  "Power BI",
];

/**
 * Spelling variants seen in real postings, keyed by the canonical (dataset)
 * label. An alias is only used to FIND a mention — the question text always
 * uses the canonical display label.
 */
const ALIASES: Record<string, string[]> = {
  "node.js": ["node", "nodejs", "node js"],
  postgresql: ["postgres", "psql"],
  javascript: ["js", "ecmascript"],
  typescript: ["ts"],
  kubernetes: ["k8s"],
  "c#": ["csharp", "c sharp"],
  "c++": ["cpp"],
  rest: ["rest api", "rest apis", "restful"],
  "rest apis": ["rest api", "restful"],
  "ci/cd": ["cicd", "ci cd", "continuous integration", "continuous delivery"],
  aws: ["amazon web services"],
  gcp: ["google cloud"],
  azure: ["microsoft azure"],
  graphql: ["graph ql"],
  "next.js": ["nextjs", "next js"],
  opentelemetry: ["otel"],
  "github actions": ["gh actions"],
  "a/b testing": ["ab testing", "split testing"],
  grpc: ["g rpc"],
  "tailwind css": ["tailwind"],
  "react native": ["reactnative"],
  go: ["golang"],
  sql: ["t-sql", "pl/sql"],
  "pl/pgsql": ["plpgsql"],
  "sdk samples": ["sdk"],
  "spring boot": ["spring"],
  "ruby on rails": ["rails"],
  "power bi": ["powerbi"],
};

/**
 * Short labels that are also ordinary English words. Matched case-sensitively
 * so "go to market" in a posting can't become a question about Go, and "the
 * rest of the team" can't become a question about REST.
 */
const CASE_SENSITIVE = new Set(["go", "r", "c"]);

/** Display casing the dataset does not carry (it stores most labels lowercase). */
const DISPLAY: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  "node.js": "Node.js",
  "next.js": "Next.js",
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
  graphql: "GraphQL",
  grpc: "gRPC",
  rest: "REST",
  "rest apis": "REST APIs",
  "rest api testing": "REST API testing",
  "api design": "API design",
  "ci/cd": "CI/CD",
  "github actions": "GitHub Actions",
  "tailwind css": "Tailwind CSS",
  "react native": "React Native",
  aws: "AWS",
  gcp: "GCP",
  iam: "IAM",
  s3: "S3",
  ec2: "EC2",
  rds: "RDS",
  eks: "EKS",
  gke: "GKE",
  aks: "AKS",
  vpc: "VPC",
  html: "HTML",
  css: "CSS",
  sdk: "SDK",
  "sdk samples": "SDK samples",
  cuda: "CUDA",
  jtag: "JTAG",
  uart: "UART",
  spi: "SPI",
  i2c: "I2C",
  sast: "SAST",
  dast: "DAST",
  owasp: "OWASP",
  slos: "SLOs",
  "error budgets": "error budgets",
  "a/b testing": "A/B testing",
  evm: "EVM",
  ipfs: "IPFS",
  mlflow: "MLflow",
  "pl/pgsql": "PL/pgSQL",
  "c#": "C#",
  "c++": "C++",
  "c": "C",
  "r": "R",
  "go": "Go",
  jest: "Jest",
  "apache spark": "Apache Spark",
  "apache iceberg": "Apache Iceberg",
  kubeflow: "Kubeflow",
  pytorch: "PyTorch",
  tensorflow: "TensorFlow",
  "scikit-learn": "scikit-learn",
  openxr: "OpenXR",
  "unreal engine": "Unreal Engine",
  "arm cortex": "Arm Cortex",
  freertos: "FreeRTOS",
  zephyr: "Zephyr",
};

/** Words that stay upper-case when a multi-word label is prettified. */
const ACRONYMS = new Set([
  "sql",
  "api",
  "apis",
  "ui",
  "ux",
  "ml",
  "ai",
  "sdk",
  "iam",
  "sre",
  "jwt",
  "dns",
  "tls",
  "http",
  "https",
  "crm",
  "erp",
  "crud",
  "p95",
  "p99",
]);

/** Plain-language / people skills: named in postings, but not "hands-on" tech. */
const NON_TECHNICAL = /^(roadmap planning|stakeholder management|community management|delivery management|hiring|coaching|performance management|public speaking|technical writing|open source|agile|product strategy|product discovery)$/i;

interface SkillMatcher {
  /** What a generated question should call this technology. */
  display: string;
  /** Dedupe key — "rest" and "rest apis" are the same ground. */
  group: string;
  patterns: RegExp[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whole-term matcher. `[^a-z0-9]` boundaries (rather than `\b`) keep "sql" out
 * of "postgresql", "node" out of "anode", and "go" out of "good".
 *
 * Two-letter aliases ("js", "ts") also refuse `.`/`-` on the left, so the "js"
 * in "Node.js" and "Next.js" is not read as a JavaScript requirement.
 */
function termPattern(term: string, caseSensitive = false): RegExp {
  const escaped = escapeRegExp(term).replace(/\\ /g, "\\s+");
  const before = term.length <= 2 ? "(?:^|[^a-z0-9.-])" : "(?:^|[^a-z0-9])";
  const after = /^c$/i.test(term) ? "(?![a-z0-9#+])" : "(?![a-z0-9])";
  return new RegExp(`${before}(${escaped})${after}`, caseSensitive ? "" : "i");
}

/** REST is only REST when written as an API term, never "the rest of …". */
const REST_PATTERN = /(?:^|[^a-z0-9])(REST(?:\s+APIs?)?|rest(?:ful)?\s+apis?)(?![a-z0-9])/;

function prettify(label: string): string {
  const key = label.trim().toLowerCase();
  const known = DISPLAY[key];
  if (known) return known;
  // The dataset already carries real casing for some labels ("Go", "Node.js").
  if (label !== key) return label;
  return key
    .split(/\s+/)
    .map((word) => {
      if (DISPLAY[word]) return DISPLAY[word];
      if (ACRONYMS.has(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

let cachedMatchers: SkillMatcher[] | null = null;

function skillMatchers(): SkillMatcher[] {
  if (cachedMatchers) return cachedMatchers;
  const matchers: SkillMatcher[] = [];
  const seen = new Set<string>();

  for (const label of [...listKnownSkills(), ...EXTRA_SKILLS]) {
    const key = label.trim().toLowerCase();
    if (!key || seen.has(key) || NON_TECHNICAL.test(key)) continue;
    seen.add(key);

    // The label keeps its dataset casing so case-sensitive terms match "Go",
    // not the ordinary word "go".
    const terms = [label.trim(), ...(ALIASES[key] ?? [])];
    const patterns: RegExp[] = [];
    for (const term of terms) {
      if (term.toLowerCase() === "rest") {
        patterns.push(REST_PATTERN);
        continue;
      }
      patterns.push(termPattern(term, CASE_SENSITIVE.has(term.toLowerCase())));
    }

    matchers.push({
      display: prettify(label),
      // "rest apis" and "rest" describe the same ground; keep one question.
      group: key.replace(/\s+apis?$/, ""),
      patterns,
    });
  }

  cachedMatchers = matchers;
  return matchers;
}

/** Technologies named in a posting, in order of first mention. */
export function extractJdSkills(jobDescription?: string): string[] {
  const text = jobDescription?.trim();
  if (!text) return [];

  const hits: Array<{ index: number; display: string; group: string }> = [];
  for (const matcher of skillMatchers()) {
    let first = -1;
    for (const pattern of matcher.patterns) {
      const match = pattern.exec(text);
      if (match && (first === -1 || match.index < first)) first = match.index;
    }
    if (first >= 0) hits.push({ index: first, display: matcher.display, group: matcher.group });
  }

  hits.sort((a, b) => a.index - b.index);

  const seen = new Set<string>();
  const skills: string[] = [];
  for (const hit of hits) {
    if (seen.has(hit.group)) continue;
    seen.add(hit.group);
    skills.push(hit.display);
    if (skills.length >= MAX_SKILLS) break;
  }
  return skills;
}

/** Duties a posting actually asks for, as clause-ready fragments. */
const DUTY_VERB =
  /^(?:architect|analy[sz]e|automate|build|champion|coach|collaborate|communicate|contribute|coordinate|create|debug|define|deliver|deploy|design|develop|drive|ensure|establish|evaluate|execute|grow|help|hire|implement|improve|integrate|keep|lead|maintain|manage|mentor|measure|migrate|moderni[sz]e|monitor|operate|optimi[sz]e|own|partner|participate|plan|present|prioriti[sz]e|prototype|refactor|research|review|run|scale|set|ship|support|test|translate|troubleshoot|turn|work|write)\b/i;

/** Lead-ins that add nothing to a duty once it is spliced into a question. */
const LEAD_INS: RegExp[] = [
  /^you(?:'ll| will)\s+/i,
  /^(?:the ideal candidate|the right candidate|the successful candidate) will\s+/i,
  /^(?:we are|we're) looking for (?:someone|an? [a-z][a-z ]{0,30}) (?:to|who will)\s+/i,
  /^in this role,? you(?:'ll| will)\s+/i,
  /^this role will\s+/i,
];

const BULLET = /^(?:[-•*▪●o]|\d+[.)])\s+/;

/** Headings and boilerplate that look like lines but are not duties. */
const NOT_A_DUTY =
  /^(?:about|responsibilities|requirements|qualifications|benefits|what we offer|who you are|the role|nice to have|must have|skills|experience|we offer|why join)\b/i;

function cleanDuty(raw: string): string | null {
  let line = raw.replace(BULLET, "").replace(/\s+/g, " ").trim();
  for (const pattern of LEAD_INS) line = line.replace(pattern, "").trim();
  line = line.replace(/[.;]+$/, "");

  if (line.length < 12 || line.length > 160) return null;
  if (NOT_A_DUTY.test(line) || line.endsWith(":")) return null;
  if (!DUTY_VERB.test(line)) return null;
  return line;
}

/** Duty-shaped lines from a posting, in order, de-duplicated. */
export function extractJdResponsibilities(jobDescription?: string): string[] {
  const text = jobDescription?.trim();
  if (!text) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    // Split prose paragraphs into sentences so a one-paragraph posting still
    // yields its duties; built labels like "Node.js" have no trailing period.
    for (const sentence of rawLine.split(/(?<=[.!?])\s+/)) {
      const duty = cleanDuty(sentence);
      if (!duty) continue;
      const key = duty.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(duty);
      if (out.length >= MAX_RESPONSIBILITIES) return out;
    }
  }
  return out;
}

const DESIGNS_SHAPED =
  /(design|architect|scal|reliab|distribut|system|latenc|throughput|concurren|infrastructure)/i;
const DATA_SHAPED =
  /(data|machine learning|ml\b|ai\b|research|scientist|model|experiment|statistic|pipeline)/i;

/**
 * Everything the deterministic provider should know about the candidate's own
 * posting. An empty description yields empty facts, so callers can keep using
 * the seed JD unchanged.
 */
export function extractJdFacts(jobDescription?: string): JdFacts {
  const text = jobDescription?.trim() ?? "";
  if (!text) return { skills: [], responsibilities: [], designs: false, data: false };
  return {
    skills: extractJdSkills(text),
    responsibilities: extractJdResponsibilities(text),
    designs: DESIGNS_SHAPED.test(text),
    data: DATA_SHAPED.test(text),
  };
}
