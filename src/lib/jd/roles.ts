import type { CompanyType, Seniority } from "./schema";

/**
 * Role catalog for the JD seed set.
 *
 * This is the "deep research" layer: each entry encodes the real technology
 * footprint, responsibility themes, and interview focus of a role as practised
 * in the industry. The LLM is given this grounding (plus seniority/company
 * overlays below) so it writes specific, genuine JDs instead of generic filler.
 *
 * Nothing here is copied from any job board or posting — it is a distilled
 * description of common industry practice, written for this project.
 */

export interface RoleSpec {
  /** Canonical label written into every JD for this role. */
  label: string;
  /** Real technologies the role uses; the LLM picks from these for requiredSkills. */
  stack: string[];
  /** Short name of the role's domain, used in the prompt. */
  domain: string;
  /** 2–3 interview areas this role's interview actually probes. */
  focusAreas: string[];
  /** Concrete responsibility themes (what the person really does day to day). */
  themes: string[];
  /** Plausible differentiators for nice-to-have. */
  niceToHave: string[];
}

export const ROLE_CATALOG: RoleSpec[] = [
  {
    label: "Frontend Engineer",
    domain: "web UI engineering",
    stack: ["TypeScript", "JavaScript", "React", "Next.js", "HTML", "CSS", "Tailwind CSS", "Vite", "Webpack", "GraphQL", "Jest", "Playwright", "Storybook", "Figma"],
    focusAreas: ["React rendering, state and component architecture", "browser performance and Core Web Vitals", "accessibility and design-system consistency"],
    themes: [
      "build and maintain accessible, reusable component libraries",
      "optimize bundle size, rendering and Core Web Vitals",
      "integrate REST and GraphQL APIs into resilient UI state",
      "implement responsive layouts that match design specifications",
      "write unit, component and end-to-end tests for critical flows",
      "partner with designers to turn prototypes into production UI",
    ],
    niceToHave: ["experience with server components or streaming SSR", "contributions to a design system", "familiarity with Web Accessibility (WCAG 2.2)", "performance profiling with Lighthouse and DevTools"],
  },
  {
    label: "Backend Engineer",
    domain: "server-side service engineering",
    stack: ["Go", "Java", "Python", "Node.js", "PostgreSQL", "MySQL", "Redis", "Kafka", "RabbitMQ", "gRPC", "REST", "GraphQL", "Docker", "Kubernetes"],
    focusAreas: ["API design and versioning", "data modeling and schema evolution", "concurrency, throughput and scaling"],
    themes: [
      "design, build and operate REST or gRPC services in production",
      "own database schema design and safe migrations",
      "diagnose and reduce p95/p99 latency in hot paths",
      "implement idempotency, retries and backpressure for reliability",
      "build background workers and queue-based processing",
      "participate in on-call and incident follow-up",
    ],
    niceToHave: ["experience with event-driven architecture", "exposure to distributed tracing", "familiarity with database query tuning", "prior ownership of a production service"],
  },
  {
    label: "Full-Stack Engineer",
    domain: "end-to-end product engineering",
    stack: ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Prisma", "REST", "GraphQL", "Docker", "AWS", "Tailwind CSS", "Vitest"],
    focusAreas: ["end-to-end feature ownership from UI to database", "frontend/backend contracts and data flow", "pragmatic trade-offs across the stack"],
    themes: [
      "ship user-facing features across the UI, API and database",
      "design schemas, endpoints and client state that stay in sync",
      "improve developer experience, CI and local setup",
      "debug issues that span the browser and the server",
      "own deployments and rollback for the features you build",
    ],
    niceToHave: ["experience joining a small team or early-stage product", "familiarity with caching (Redis or CDN)", "exposure to CI/CD pipelines", "a public side project or OSS contribution"],
  },
  {
    label: "iOS Engineer",
    domain: "Apple platform development",
    stack: ["Swift", "SwiftUI", "UIKit", "Combine", "async/await", "Core Data", "Xcode", "XCTest", "Fastlane", "REST", "GraphQL"],
    focusAreas: ["Swift concurrency and memory management", "UIKit/SwiftUI lifecycle and navigation", "app performance and store release process"],
    themes: [
      "build and ship features in SwiftUI and UIKit",
      "integrate REST or GraphQL APIs and persist local state",
      "reduce launch time, memory usage and frame drops",
      "write unit and UI tests for critical user journeys",
      "manage provisioning, builds and App Store releases",
    ],
    niceToHave: ["published apps on the App Store", "experience with SwiftUI migration", "knowledge of Instruments profiling", "familiarity with StoreKit or in-app purchase"],
  },
  {
    label: "Android Engineer",
    domain: "Android platform development",
    stack: ["Kotlin", "Jetpack Compose", "Coroutines", "Flow", "Room", "Hilt", "Gradle", "Retrofit", "Espresso", "REST", "GraphQL"],
    focusAreas: ["Android lifecycle and Compose state/recomposition", "background work and offline-first data", "startup time and rendering performance"],
    themes: [
      "build modern Android UIs with Jetpack Compose",
      "integrate APIs with Retrofit and model offline state",
      "optimize startup, jank and battery usage",
      "handle background work with WorkManager and coroutines",
      "own Play Store releases and staged rollouts",
    ],
    niceToHave: ["published apps on Google Play", "experience with baseline profiles", "familiarity with Kotlin Multiplatform", "knowledge of Play Console vitals"],
  },
  {
    label: "React Native Engineer",
    domain: "cross-platform mobile development",
    stack: ["React Native", "TypeScript", "Redux", "Zustand", "Hermes", "React Navigation", "Reanimated", "native modules", "Jest", "Detox", "Firebase"],
    focusAreas: ["bridge/JSI and native module design", "cross-platform performance and the JS/UI thread", "shared code architecture across iOS and Android"],
    themes: [
      "ship cross-platform features from a single TypeScript codebase",
      "write or bridge native modules for platform-specific capabilities",
      "diagnose and fix JS-thread and UI-thread performance issues",
      "handle platform differences without forking the codebase",
      "set up over-the-air updates and release pipelines",
    ],
    niceToHave: ["experience shipping to both stores from one codebase", "knowledge of the New Architecture (Fabric/TurboModules)", "exposure to native iOS/Android code", "familiarity with EAS or Fastlane"],
  },
  {
    label: "Flutter Engineer",
    domain: "cross-platform UI with Dart",
    stack: ["Dart", "Flutter", "Riverpod", "Bloc", "platform channels", "Firebase", "integration_test", "DevTools", "REST", "GraphQL"],
    focusAreas: ["widget lifecycle, rebuilds and rendering", "state management with Bloc/Riverpod", "platform channels and native interop"],
    themes: [
      "build responsive Flutter apps for iOS and Android",
      "manage application state with a predictable pattern",
      "integrate platform channels for native capabilities",
      "optimize frame rendering and app size",
      "maintain CI that builds and tests both platforms",
    ],
    niceToHave: ["published Flutter apps", "experience with Flutter Web or desktop", "knowledge of Impeller rendering", "contributions to an open-source Flutter package"],
  },
  {
    label: "DevOps Engineer",
    domain: "delivery and infrastructure automation",
    stack: ["CI/CD", "Docker", "Kubernetes", "Terraform", "GitHub Actions", "Jenkins", "ArgoCD", "Helm", "Prometheus", "Grafana", "AWS", "Bash", "Python"],
    focusAreas: ["CI/CD pipeline design and release safety", "infrastructure as code and environment parity", "observability, alerting and rollback"],
    themes: [
      "build and maintain CI/CD pipelines for frequent, safe releases",
      "codify and version infrastructure with Terraform",
      "operate and upgrade Kubernetes clusters and workloads",
      "improve deploy frequency, lead time and rollback times",
      "instrument services with metrics, logs and alerts",
    ],
    niceToHave: ["experience with GitOps (ArgoCD or Flux)", "knowledge of secrets management", "familiarity with cost optimization", "exposure to multi-environment promotion"],
  },
  {
    label: "Site Reliability Engineer",
    domain: "reliability engineering",
    stack: ["SLOs", "error budgets", "Kubernetes", "Prometheus", "Grafana", "OpenTelemetry", "Terraform", "Go", "Python", "chaos engineering", "incident response"],
    focusAreas: ["SLOs and error budgets", "incident command and postmortems", "capacity planning and failure modes"],
    themes: [
      "define SLIs/SLOs and drive reliability work against them",
      "lead incident response and blameless postmortems",
      "automate repetitive operational toil",
      "load-test and capacity-plan critical services",
      "design for graceful degradation and failure isolation",
    ],
    niceToHave: ["experience running a production on-call rotation", "knowledge of distributed systems failure modes", "familiarity with load and chaos testing", "experience reducing MTTR"],
  },
  {
    label: "Platform Engineer",
    domain: "internal developer platform",
    stack: ["Kubernetes", "Backstage", "Terraform", "Crossplane", "ArgoCD", "Helm", "Open Policy Agent", "Go", "Python", "GitHub Actions"],
    focusAreas: ["golden paths and self-service infrastructure", "platform adoption and developer experience", "infrastructure abstractions and multi-tenancy"],
    themes: [
      "build an internal developer platform that removes toil",
      "create golden-path templates and self-service workflows",
      "provide safe, multi-tenant compute and deployment primitives",
      "measure and improve developer experience and adoption",
      "evolve platform abstractions without breaking existing users",
    ],
    niceToHave: ["experience building a platform from scratch", "knowledge of Backstage or a service catalog", "familiarity with policy-as-code", "exposure to platform product thinking"],
  },
  {
    label: "Data Engineer",
    domain: "data platform and pipelines",
    stack: ["Python", "SQL", "Apache Spark", "Airflow", "Dagster", "dbt", "Snowflake", "BigQuery", "Kafka", "Apache Iceberg", "Great Expectations", "AWS"],
    focusAreas: ["pipeline reliability and data quality", "batch versus streaming design", "dimensional and warehouse data modeling"],
    themes: [
      "build batch and streaming pipelines that meet data SLAs",
      "model warehouse data with dbt and clear contracts",
      "enforce data quality, freshness and lineage",
      "tune Spark and warehouse jobs for cost and speed",
      "own orchestration, backfills and pipeline on-call",
    ],
    niceToHave: ["experience with lakehouse formats (Iceberg/Delta)", "knowledge of streaming exactly-once semantics", "familiarity with a data catalog", "exposure to reverse-ETL"],
  },
  {
    label: "Data Scientist",
    domain: "applied statistics and modeling",
    stack: ["Python", "pandas", "NumPy", "scikit-learn", "SQL", "statistics", "A/B testing", "Matplotlib", "causal inference", "Jupyter", "R"],
    focusAreas: ["experiment and causal design", "metric definition and measurement", "modeling trade-offs and communicating results"],
    themes: [
      "design and analyze experiments to guide product decisions",
      "build and validate predictive and statistical models",
      "define and instrument product metrics that matter",
      "translate analysis into clear recommendations for stakeholders",
      "wrangle messy data into analysis-ready datasets",
    ],
    niceToHave: ["experience owning an A/B testing platform or process", "knowledge of causal inference methods", "familiarity with Bayesian methods", "a public analysis, notebook or write-up"],
  },
  {
    label: "Machine Learning Engineer",
    domain: "production machine learning",
    stack: ["Python", "PyTorch", "TensorFlow", "scikit-learn", "MLflow", "feature stores", "Ray", "Kubernetes", "Docker", "SQL", "model serving"],
    focusAreas: ["model evaluation and offline/online metric gaps", "training/serving skew", "latency-aware serving and scaling"],
    themes: [
      "train, tune and evaluate models against real objectives",
      "build reliable feature pipelines and training data",
      "deploy models to production with monitoring",
      "monitor for drift and degradation after release",
      "optimize inference latency, throughput and cost",
    ],
    niceToHave: ["experience serving models at scale", "knowledge of recommendation or ranking systems", "familiarity with vector search/embeddings", "published model or Kaggle results"],
  },
  {
    label: "MLOps Engineer",
    domain: "ML platform and operations",
    stack: ["MLflow", "Kubeflow", "Airflow", "Kubernetes", "Docker", "Terraform", "Prometheus", "feature store", "CI/CD for ML", "Python"],
    focusAreas: ["reproducibility and artifact versioning", "deployment, monitoring and rollback for models", "drift detection and automated retraining"],
    themes: [
      "build CI/CD pipelines for training and model releases",
      "manage a model registry and reproducible artifacts",
      "automate retraining and scheduled pipeline runs",
      "monitor data quality, drift and model performance",
      "standardize training infrastructure for data scientists",
    ],
    niceToHave: ["experience with feature stores", "knowledge of GPU scheduling", "familiarity with model governance and lineage", "exposure to LLM deployment pipelines"],
  },
  {
    label: "AI Research Scientist",
    domain: "machine learning research",
    stack: ["deep learning", "transformers", "PyTorch", "JAX", "distributed training", "CUDA", "evaluation methodology", "Python", "NumPy"],
    focusAreas: ["novel method design and hypotheses", "rigorous ablation and evaluation", "depth in the relevant literature"],
    themes: [
      "design and run experiments that test novel hypotheses",
      "train and scale models on large compute clusters",
      "build evaluation harnesses and benchmarks",
      "publish results and review others' work",
      "partner with engineering to productionize research",
    ],
    niceToHave: ["peer-reviewed publications", "experience with large-scale distributed training", "contributions to open research code", "knowledge of efficient fine-tuning methods"],
  },
  {
    label: "Cloud Engineer (AWS)",
    domain: "AWS cloud infrastructure",
    stack: ["EC2", "EKS", "Lambda", "S3", "RDS", "IAM", "VPC", "CloudFormation", "AWS CDK", "Terraform", "CloudWatch", "Python"],
    focusAreas: ["Well-Architected trade-offs", "cost optimization and IAM least privilege", "resilience, networking and multi-AZ design"],
    themes: [
      "design and provision AWS infrastructure with IaC",
      "harden IAM roles and network boundaries",
      "optimize spend through rightsizing and savings plans",
      "build multi-AZ, fault-tolerant architectures",
      "migrate or modernize workloads onto managed services",
    ],
    niceToHave: ["an AWS certification (Solutions Architect or DevOps)", "experience with multi-account landing zones", "knowledge of cost anomaly detection", "familiarity with AWS Security Hub"],
  },
  {
    label: "Cloud Engineer (GCP)",
    domain: "Google Cloud infrastructure",
    stack: ["GKE", "BigQuery", "Cloud Run", "Vertex AI", "Pub/Sub", "Cloud Storage", "IAM", "Terraform", "Cloud Build", "Python"],
    focusAreas: ["GCP service selection for the workload", "data/analytics fit and BigQuery cost control", "cost, IAM and organization policy"],
    themes: [
      "architect and automate infrastructure on Google Cloud",
      "run containerized workloads on GKE or Cloud Run",
      "optimize BigQuery queries, slots and storage cost",
      "secure IAM, service accounts and organization policies",
      "build data and event pipelines with Pub/Sub",
    ],
    niceToHave: ["a Google Cloud certification", "experience with Anthos or multi-cloud", "knowledge of VPC Service Controls", "familiarity with Vertex AI pipelines"],
  },
  {
    label: "Cloud Engineer (Azure)",
    domain: "Microsoft Azure infrastructure",
    stack: ["AKS", "Azure Functions", "Cosmos DB", "Azure SQL", "Entra ID", "Bicep", "ARM templates", "Azure Monitor", "VNet", "Terraform"],
    focusAreas: ["Azure service selection and architecture", "identity and network design with Entra ID", "cost governance and policy compliance"],
    themes: [
      "build and automate Azure infrastructure with Bicep or Terraform",
      "manage identity, RBAC and privileged access",
      "design hub-spoke networking and private endpoints",
      "implement cost governance, budgets and tagging",
      "migrate on-premises workloads to Azure",
    ],
    niceToHave: ["a Microsoft Azure certification", "experience with Azure Policy and landing zones", "knowledge of hybrid/Arc scenarios", "familiarity with Microsoft Defender for Cloud"],
  },
  {
    label: "Security Engineer",
    domain: "application and cloud security",
    stack: ["AppSec", "OWASP Top 10", "threat modeling", "SAST", "DAST", "IAM", "cloud security", "cryptography", "SIEM", "Python", "Burp Suite"],
    focusAreas: ["threat modeling and secure design", "vulnerability discovery, triage and remediation", "incident response and detection engineering"],
    themes: [
      "threat-model systems and review designs for weaknesses",
      "run SAST/DAST scans and triage real findings",
      "harden cloud IAM, secrets and network controls",
      "build detections and improve incident response",
      "partner with engineers to fix vulnerabilities at the source",
    ],
    niceToHave: ["a security certification (OSCP, CISSP or equivalent)", "experience in a red-team or bug-bounty setting", "knowledge of supply-chain security", "contributions to security tooling"],
  },
  {
    label: "QA / SDET",
    domain: "quality engineering and test automation",
    stack: ["test strategy", "Playwright", "Cypress", "Selenium", "Jest", "pytest", "REST API testing", "performance testing", "CI/CD", "TypeScript"],
    focusAreas: ["test strategy and the test pyramid", "flakiness reduction and reliability", "automation architecture and CI integration"],
    themes: [
      "design test strategies that match product risk",
      "build and maintain end-to-end and API test suites",
      "eliminate flaky tests and stabilise CI",
      "integrate quality gates into the release pipeline",
      "advocate for quality and shift testing left",
    ],
    niceToHave: ["experience with contract testing", "knowledge of performance/load testing", "exposure to accessibility testing", "familiarity with test data management"],
  },
  {
    label: "Embedded / Firmware Engineer",
    domain: "embedded systems and firmware",
    stack: ["C", "C++", "FreeRTOS", "Zephyr", "ARM Cortex", "I2C", "SPI", "UART", "bare-metal", "JTAG", "power management", "Python"],
    focusAreas: ["memory and ISR constraints", "real-time behaviour and scheduling", "hardware debugging and bring-up"],
    themes: [
      "develop firmware for microcontrollers in C/C++",
      "write and debug device drivers for peripherals",
      "optimize memory footprint, latency and power consumption",
      "bring up new boards and debug with scopes and JTAG",
      "maintain bootloaders and over-the-air update paths",
    ],
    niceToHave: ["experience with a real-time operating system", "knowledge of functional safety standards", "familiarity with BLE or wireless stacks", "exposure to hardware-in-the-loop testing"],
  },
  {
    label: "Game Developer",
    domain: "game engine and gameplay engineering",
    stack: ["C++", "C#", "Unity", "Unreal Engine", "rendering", "shaders", "physics", "netcode", "profiling", "HLSL/GLSL"],
    focusAreas: ["game loop, frame budget and optimization", "engine architecture and gameplay systems", "rendering, physics or netcode depth"],
    themes: [
      "implement gameplay systems and mechanics",
      "optimize frame rate, memory and load times",
      "build rendering features and shaders",
      "develop or integrate multiplayer netcode",
      "improve content pipelines and internal tooling",
    ],
    niceToHave: ["a shipped or published game", "experience with a custom engine", "knowledge of graphics APIs (Vulkan/DirectX)", "game-jam or OSS game contributions"],
  },
  {
    label: "Blockchain / Web3 Engineer",
    domain: "smart contracts and decentralised systems",
    stack: ["Solidity", "EVM", "Hardhat", "Foundry", "ethers.js", "web3.js", "TypeScript", "subgraphs", "IPFS", "gas optimization", "security audits"],
    focusAreas: ["smart-contract security and gas optimization", "on-chain versus off-chain architecture", "consensus, RPC and indexer design"],
    themes: [
      "write, test and audit smart contracts",
      "optimize gas usage and contract storage layout",
      "build subgraphs and indexers for on-chain data",
      "integrate wallets and transaction flows into apps",
      "review contracts for security and upgradeability risks",
    ],
    niceToHave: ["audit reports or bug-bounty findings", "experience deploying to production mainnet", "knowledge of ZK or L2 scaling", "contributions to open-source protocol code"],
  },
  {
    label: "AR/VR Engineer",
    domain: "extended reality engineering",
    stack: ["Unity", "Unreal Engine", "C#", "OpenXR", "3D math", "shaders", "spatial tracking", "performance profiling", "Meta Quest SDK"],
    focusAreas: ["frame rate and performance budgets for XR", "tracking, input and interaction design", "spatial UX and comfort"],
    themes: [
      "build immersive XR applications for headsets and mobile AR",
      "implement interaction, locomotion and hand/controller input",
      "optimize for frame rate, thermals and comfort on device",
      "design 3D spatial user experiences",
      "integrate tracking, sensors and platform SDKs",
    ],
    niceToHave: ["a shipped XR title or demo", "experience with hand tracking or eye tracking", "knowledge of WebXR", "familiarity with spatial audio"],
  },
  {
    label: "Database Engineer",
    domain: "database internals and operations",
    stack: ["PostgreSQL", "MySQL", "indexing", "query planning", "partitioning", "replication", "backup and recovery", "PL/pgSQL", "performance tuning", "Redis"],
    focusAreas: ["query plans and indexing strategy", "schema and migration design", "replication, backup and high availability"],
    themes: [
      "tune slow queries, indexes and execution plans",
      "design schemas and safe, reversible migrations",
      "set up replication, failover and high availability",
      "automate backup, restore and disaster recovery",
      "capacity-plan and monitor database health",
    ],
    niceToHave: ["experience at very large data volumes", "knowledge of connection pooling at scale", "familiarity with Postgres internals (MVCC/VACUUM)", "experience with zero-downtime migrations"],
  },
  {
    label: "Solutions Architect",
    domain: "customer-facing solution design",
    stack: ["AWS", "Azure", "GCP", "integration patterns", "Terraform", "REST APIs", "microservices", "security", "cost modeling", "Python"],
    focusAreas: ["translating requirements into architecture", "integration patterns and system boundaries", "cost, risk and stakeholder trade-offs"],
    themes: [
      "translate business requirements into concrete architectures",
      "design integrations between systems and third parties",
      "produce reference architectures and design documents",
      "estimate cost, risk and effort for proposed designs",
      "guide delivery teams through implementation",
    ],
    niceToHave: ["a cloud or architecture certification", "pre-sales or customer-facing experience", "knowledge of domain-driven design", "exposure to compliance and data-residency constraints"],
  },
  {
    label: "Engineering Manager",
    domain: "engineering leadership",
    stack: ["delivery management", "hiring", "coaching", "roadmap planning", "agile", "performance management", "system design", "stakeholder management"],
    focusAreas: ["people leadership, coaching and growth", "delivery, prioritization and execution", "technical judgment and cross-team influence"],
    themes: [
      "lead, coach and grow a team of engineers",
      "own roadmap, delivery and execution health",
      "hire, onboard and retain strong engineers",
      "balance feature delivery against technical debt",
      "partner with product and stakeholders on priorities",
    ],
    niceToHave: ["experience managing managers", "a track record of scaling a team", "knowledge of platform or infra domains", "experience with distributed teams"],
  },
  {
    label: "Technical Product Manager",
    domain: "technical product management",
    stack: ["roadmap planning", "product discovery", "metrics", "SQL", "A/B testing", "API design", "stakeholder management", "product strategy"],
    focusAreas: ["discovery and prioritization", "metrics and experimentation", "technical partnership with engineering"],
    themes: [
      "define the roadmap and write clear requirements",
      "run discovery with users and internal stakeholders",
      "own product success metrics and instrument them",
      "partner with engineering on feasibility and trade-offs",
      "prioritize ruthlessly across competing demands",
    ],
    niceToHave: ["experience with a developer-facing or API product", "technical background (engineering or data)", "knowledge of pricing or platform strategy", "experience launching 0→1 products"],
  },
  {
    label: "Developer Relations / Advocacy",
    domain: "developer relations and advocacy",
    stack: ["public speaking", "technical writing", "open source", "SDK samples", "community management", "TypeScript", "Python", "Docker", "GitHub Actions"],
    focusAreas: ["storytelling, demos and developer communication", "developer empathy and community engagement", "technical depth plus open-source contribution"],
    themes: [
      "create demos, samples and starter kits developers can run",
      "write documentation, tutorials and release notes",
      "speak at conferences, meetups and livestreams",
      "engage the community and route feedback to product",
      "contribute to open-source SDKs and tooling",
    ],
    niceToHave: ["a public speaking or content track record", "open-source maintainership", "experience running a developer community", "knowledge of DevRel metrics"],
  },
];

/* ----------------------------- Prompt overlays ----------------------------- */

export const SENIORITY_OVERLAY: Record<Seniority, string> = {
  entry:
    "ENTRY (0-2 years): implement well-scoped tasks with guidance and code review; learns the codebase and tools; writes first tests; asks good questions; no expectation of leading design or mentoring.",
  mid:
    "MID (3-5 years): independently owns and ships whole features or services; handles ambiguity; reviews others' code; improves reliability and developer experience; may mentor a junior.",
  senior:
    "SENIOR (6+ years): leads design and technical direction across teams; mentors and raises the bar; makes and defends trade-offs; owns the hardest problems end-to-end; influences roadmap and standards.",
};

export const COMPANY_OVERLAY: Record<CompanyType, string> = {
  startup:
    "STARTUP: lean and ownership-heavy. Broad scope, high autonomy, comfort with ambiguity and incomplete infrastructure. Minimal process, ship-fast culture, one or two primary stacks. Tone: direct, energetic, 'you will own this end to end'.",
  "mid-size":
    "MID-SIZE: balanced. A defined area with cross-team dependencies, lightweight process, established review and planning rituals. Combines individual ownership with collaboration. Tone: professional, collaborative, 'you will partner with'.",
  enterprise:
    "ENTERPRISE: large scale and process-aware. Scope spans systems and teams, with governance, compliance, observability, on-call and change management. Legacy and multi-region systems are common. Tone: measured and scope-heavy, 'you will lead cross-org', 'operate at scale while meeting'.",
};

/** Labels used when writing the dataset into markdown. */
export const SENIORITY_LABEL: Record<Seniority, string> = {
  entry: "Entry (0-2 yrs)",
  mid: "Mid (3-5 yrs)",
  senior: "Senior (6+ yrs)",
};

export const COMPANY_TYPE_LABEL: Record<CompanyType, string> = {
  startup: "Startup",
  "mid-size": "Mid-size",
  enterprise: "Enterprise / FAANG-style",
};
