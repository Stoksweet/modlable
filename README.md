![Modlable Overview](https://raw.githubusercontent.com/Stoksweet/modlable/refs/heads/main/Gemini_Generated_Image_s2tkjws2tkjws2tk.png)

# 🧠 Modlable

*A platform for building, training, and running inference on TensorFlowJS-based language models with the assistance of LLM-powered agents — hosted on Google Cloud Run.*

---

## 📘 Overview

**Modlable** is an experimental platform that allows developers and researchers to build, train, and deploy lightweight **language models (LMs)** directly in **JavaScript** using **TensorFlowJS**, augmented by **Large Language Model (LLM)** agents for orchestration, optimization, and workflow automation.

The platform is cloud-native — it’s designed to run efficiently on **Google Cloud Run**, enabling **serverless** and **scalable** model operations with minimal DevOps overhead.

---

## 🚀 Features

* 🧩 **Modular Training Pipelines** — Train custom token-based language models in TensorFlowJS.
* 🎛️ **Node-to-Python SFT Training Bridge** — Orchestrate heavy Hugging Face and TRL training workloads (SFTTrainer/PEFT LoRA) from TypeScript using real-time child process stdout streaming and stdin JSON IPC.
* 🧪 **Build-Time Schema Verification** — Automated type-checking that matches TypeScript training configurations with Python dataclasses via introspection to prevent API drift.
* 🤖 **LLM Orchestration Agents** — Use pre-configured agents to guide hyperparameter tuning, dataset preparation, and model evaluation.
* ☁️ **Cloud Run Deployment** — Run models and inference endpoints on demand using containerized builds.
* 🔁 **Seamless Inference API** — Serve models as REST endpoints for text generation, embedding, or classification.
* 🧠 **Local + Cloud Support** — Develop locally, then deploy to GCP with one command.

---

## 🧱 Project Structure

```
modlable/
├── frontend/
│   ├── modalble/            # The frontend Angular/Ionic App
│
├── backend/
│   ├── src/                 # Genkit + Cloud Functions/Cloud Run for agents
│   │   ├── trainer/         # Node-to-Python SFT Training Bridge
│   │   │   ├── types.ts     # TypeScript interfaces for configurations
│   │   │   ├── NodeSFTTrainer.ts # Wrapper orchestration class
│   │   │   ├── bridge.py    # Python runner executing TRL SFTTrainer
│   │   │   └── verify_types.py # Introspection type verification layer
│   │   └── index.ts         # Agent logic and flows
│   ├── Dockerfile           # Dual-runtime container environment
│   ├── requirements.txt     # Python training packages (torch, trl, transformers)
│   └── package.json         # Node project dependencies
├── docker-compose.yaml      # Multi-container local execution mapping
├── .env.example             # Example environment configuration
└── README.md                # You are here
```

---

## ⚙️ Prerequisites

Before getting started, ensure you have:

* **Node.js** ≥ 18.x
* **npm** or **yarn**
* **Python** ≥ 3.10 and **pip** (for local Python bridge development)
* **Docker** (for containerization)
* **Google Cloud SDK** (`gcloud`) configured with billing and permissions
* A **Google Cloud Project** with **Cloud Run**, **Artifact Registry**, and **Cloud Build** enabled

---

## 🧩 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/modlable.git
   cd modlable
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit the .env file with your API keys and Cloud project info
   ```

---

## 🧠 Local Development

Run the API locally for testing:

```bash
npm run dev
```

To start a local training session:

```bash
npm run train
```

Run inference on a local model:

```bash
npm run infer "Once upon a time"
```

---

## ☁️ Deployment (Google Cloud Run)

1. **Build and push Docker image**

   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT_ID]/modlable
   ```

2. **Deploy to Cloud Run**

   ```bash
   gcloud run deploy modlable \
       --image gcr.io/[PROJECT_ID]/modlable \
       --platform managed \
       --region [REGION] \
       --allow-unauthenticated
   ```

3. **Access your endpoint**

   ```
   https://modlable-[REGION]-a.run.app/infer
   ```

---

## 🧮 API Endpoints

| Method | Endpoint           | Description                             |
| ------ | ------------------ | --------------------------------------- |
| `POST` | `/train`           | Initiate a model training session       |
| `POST` | `/infer`           | Run inference with a trained model      |
| `GET`  | `/models`          | List all available trained models       |
| `POST` | `/agents/optimize` | Use LLM agent for optimization guidance |

**Example Request:**

```bash
curl -X POST https://modlable-[REGION]-a.run.app/infer \
  -H "Content-Type: application/json" \
  -d '{"prompt": "The future of AI is"}'
```

---

## 🧰 Environment Variables

| Variable            | Description                                  |
| ------------------- | -------------------------------------------- |
| `GOOGLE_PROJECT_ID` | Your GCP project ID                          |
| `MODEL_BUCKET`      | Cloud Storage bucket for model checkpoints   |
| `OPENAI_API_KEY`    | API key for LLM agent integration (optional) |
| `PORT`              | Server port (defaults to `8080`)             |

---

## 🧑‍💻 Contributing

Contributions are welcome!

1. Fork the repo
2. Create a new feature branch
3. Submit a pull request with a clear description

---

## 🧾 License

MIT License © 2025 — *Modlable Contributors*

---

## 🌐 Roadmap

* [ ] Web dashboard for model visualization and management
* [ ] Support for multimodal training data (text + image)
* [ ] Integration with Hugging Face model zoo
* [ ] Cross-runtime inference (Node, Browser, Edge)

---

**Made with ❤️ by the Modlable Team**
*Empowering developers to build LMs anywhere.*
