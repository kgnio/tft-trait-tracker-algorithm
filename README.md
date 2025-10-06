# 🧩 TFT Trait Tracker Algorithm

A **Node.js-based combinatorial search algorithm** designed to determine the **minimum set of champions** required to activate **seven unique traits** in *Teamfight Tactics (TFT)*.

This tool helps optimize compositions by balancing **trait activations**, **champion costs**, and **rarity constraints**, making it easier to build efficient TFT teams programmatically.

---

## 🚀 Features

- Reads champion data from a structured JSON file (`champs.json`).
- Allows manual exclusion of **traits** and **champions** from the search pool.
- Honors **trait activation thresholds** (e.g., `(2)`, `(3)`, `(4)`).
- Uses a **Depth-First Search (DFS)** algorithm with **branch & bound pruning** for efficiency.
- Automatically applies tie-breaking rules:
  1. Prefer teams **without 5-cost champions**.
  2. If tied, prefer teams **without 4-cost champions**.
  3. If still tied, prefer teams with a **lower average cost**.
- Provides detailed step-by-step logs in the console (shows search depth, new best results, pruning stats, etc.).

---

## 🧠 How It Works

1. Loads and filters champions from `champs.json`.
2. Excludes manually specified traits and champions.
3. Iteratively explores possible team combinations.
4. Checks which traits become active using trait thresholds.
5. Keeps track of the current best combination based on:
   - Minimum number of champions.
   - Cost efficiency.
   - Activated trait diversity.

---

## ⚙️ Installation

### Prerequisites
- **Node.js ≥ 18**
- **npm** (comes with Node)

### Setup

```bash
git clone https://github.com/kgnio/tft-trait-tracker-algorithm.git
cd tft-trait-tracker-algorithm
npm init -y
```

> ⚠️ If npm is not recognized in PowerShell, make sure your Node.js installation is added to your system PATH or open a new PowerShell window.

---

## ▶️ Usage

1. Place your champion data in a file named **`champs.json`** in the project root.
2. Edit the configuration section at the top of `solve.js`:

```js
const excludeTraits = ["Monster Trainer", "The Champ"];
const excludeChamps = ["Lee Sin", "Lulu"];
const TARGET_TRAIT_COUNT = 7;
```

3. Run the script:

```bash
node solve.js
```

4. Watch the detailed step-by-step output directly in the terminal:
   - Champion selections
   - Activated traits
   - Pruning stats
   - Best found combinations

---

## 📄 Example Output

```
✅ New best! size=5 | 5-cost=no | 4-cost=yes | avg=2.60
   team: Garen(1), Rakan(2), Senna(3), Karma(2), Jarvan IV(4)
   traits(7): Bastion, Strategist, Sorcerer, Mighty Mech, Executioner, Luchador, Star Guardian
──────────────────────────────────────────────
Champion count: 5
Team: Garen, Rakan, Senna, Karma, Jarvan IV
Costs: [1, 2, 3, 2, 4], Avg: 2.40
Has 5-cost?: No
Has 4-cost?: Yes
Activated traits (7): Bastion, Strategist, Sorcerer, Mighty Mech, Executioner, Luchador, Star Guardian
──────────────────────────────────────────────
📈 Node visits: 273, prunes(cannot-reach): 54, prunes(longer-than-best): 33
⏱️  Done in 132 ms
```

---

## 📁 File Structure

```
tft-trait-tracker-algorithm/
├── champs.json       # Champion data (input)
├── solve.js          # Main algorithm
└── README.md         # Documentation
```

---

## 🧩 champs.json Format

Each champion entry must include:
- `name` (string)
- `cost` (integer)
- `traits` (array of strings)

Example:
```json
[
  {
    "name": "Garen",
    "cost": 1,
    "traits": ["Battle Academia", "Bastion"]
  },
  {
    "name": "Senna",
    "cost": 3,
    "traits": ["Mighty Mech", "Executioner"]
  }
]
```

---

## 🧠 Future Improvements

- Add CLI arguments for runtime configuration (`--target 8 --exclude-traits ...`)
- Add visualization (graph/tree of trait activations)
- Integrate a front-end React dashboard for interactive trait planning

---

## 🪪 License

MIT License © 2025 [kgnio](https://github.com/kgnio)

---

**Made with ❤️ by Kagan-dev**
