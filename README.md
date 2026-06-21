# SAIFE Gateway (Safe AI Framework for Education)

> [!WARNING]
> **Experimental Concept / Proof of Concept**
> This repository represents an early-stage, experimental concept for a secure AI middleware in educational environments. It has **not** been formally audited, tested in a real-world production environment, or proven to be completely secure. It is provided as a humble attempt to spark discussion and offer a potential direction for how AI integration *could* be implemented safely in schools.

## 📌 About This Project

The deployment of Large Language Models (LLMs) in schools faces a significant challenge: how do we ensure absolute security (complying with strict regulations like the EU AI Act) without crippling the pedagogical freedom of teachers? 

The **SAIFE Gateway** is a conceptual TypeScript middleware designed to explore a solution to this problem. Instead of relying on fragile text-based "system prompts" to filter content, this concept proposes an API-native, multi-layered architecture:
1. **Security Layer:** Cryptographically signed red-lines (e.g., self-harm, hate speech) defined by educational authorities.
2. **Pedagogical Layer:** A flexible Didactic DSL allowing teachers to choose *how* the AI helps (e.g., Socratic dialogue vs. direct answers).

By strictly separating these layers, we hope to demonstrate a model where security is guaranteed by cryptography, while the classroom remains under the teacher's control.

> [!NOTE]
> **Author's Background**
> This project was conceived and initiated by an educator who loves building practical solutions for the education sector, rather than a professional software developer. As such, the focus is heavily on the didactic value and solving real-world classroom challenges. The technical implementation serves as a conceptual blueprint (Proof of Concept) and explicitly invites the developer and security community to audit, challenge, and improve the code.

## ⚙️ Core Technical Concepts

While the full details are in the Technical Paper, the Gateway explores several key concepts:
- **The Chunk-Gate:** Instead of waiting for the AI to finish or inspecting every single word, the stream is buffered into small semantic chunks. Each chunk is verified *before* it reaches the student, preventing "salami-slicing" exploits.
- **Cryptographic Enforcement:** Educational authorities sign safety policies using Ed25519 cryptography. The Gateway verifies the signature locally and incorporates a strict TTL fallback mechanism.
- **Pedagogical Telemetry & Differential Privacy:** The Gateway acts as a stateless, intelligent sensor. Instead of storing chat history, it emits discrete real-time events to the local school backend. This includes welfare alerts (e.g., `struggle_detected`, including the specific `identified_barrier`) and — as a planned feature — pedagogical observation events (e.g., `learning_signal` based on teacher-defined `learning_objectives`). All observation events carry an `is_formative_only: true` flag to prevent misuse as automated grading. Research data is anonymized: numeric fields receive Laplacian noise, string fields are stripped entirely before emission.
## 🤝 Call for Contributions & Peer Review

We explicitly invite the open-source community, security researchers, educators, and developers to **challenge and review this concept**. 
Since this is an unproven architectural draft, we are actively looking for critical feedback:
- **Security Vulnerabilities:** Can you bypass the Chunk-Gate? Can you spoof the Ed25519 signatures? 
- **Pedagogical Feedback:** Does the Didactic DSL make sense in a real classroom?
- **Architectural Flaws:** Where does this middleware introduce unacceptable latency or fail to scale?

If you find vulnerabilities or have ideas for improvement, please open an Issue or a Pull Request. We welcome all critical feedback to help shape a safer digital learning environment.

## 📖 Documentation

For a deep dive into the proposed architecture, including the Chunk-Gate mechanism, the cryptographic signature process, and our approach to GDPR-compliant telemetry, please read the **Technical & Pedagogical Blueprint**:

- 📝 [SAIFE_Technical_Paper.md](./SAIFE_Technical_Paper.md) (Technical & Pedagogical Blueprint)

## 🛠️ Repository Structure

- `src/core/`: Experimental middleware engine (Orchestrator, Chunk-Gate, Pre-Flight Gate).
- `src/security/`: Cryptographic signature verification and TTL fallback concepts.
- `src/telemetry/`: Draft implementation of stateless, differential privacy telemetry.
- `src/types/`: TypeScript contracts and Didactic DSL definitions.
- `tests/`: Initial evaluation suite (adversarial testing drafts).

## 📄 License
MIT License (or your preferred open-source license)
