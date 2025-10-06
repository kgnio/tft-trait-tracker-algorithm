# 🧩 TFT Trait Tracker Algorithm (v2.0.0)

**Fast and clean** Node.js algorithm that finds the **minimum number of champions** required to activate **seven traits** in *Teamfight Tactics (TFT)* — now using **iterative deepening** over team size for guaranteed minimality.

This version tries teams in order of size `k = 1, 2, 3, ...` (sorted from **cheapest champions first**) and **stops at the first feasible size**. Within the same `k`, it applies strict tie‑breakers (no 5‑costs → no 4‑costs → lowest average cost → lowest total cost → stable alphabetical).

---

## 🚀 What’s new in v2.0.0

- ✅ **Iterative deepening by team size** — guarantees the minimal team size that can activate the target number of traits.
- ⚡ **Cost‑aware ordering** — the pool is sorted by cost asc, then by trait count desc, then by name.
- ✂️ **Branch & bound** — prunes branches that cannot mathematically reach the target.
- 🔎 **Clear logging** — prints candidate teams per `k` and a final summary, plus visit/prune stats.

---

## 🧠 How it works

1. Load champions from `champs.json`.
2. Apply manual **exclusions**:
   - `excludeTraits`: remove certain traits from consideration.
   - `excludeChamps`: remove unwanted champions entirely.
3. Sort the pool (cost ↑, trait-count ↓, name ↑) to bias towards cheaper solutions.
4. For `k = 1..N`, run a **depth‑limited DFS** that builds **exactly k** champions:
   - Compute activated traits (with per‑trait thresholds).
   - Use an **optimistic bound** (`+2 traits per remaining slot`) to prune.
   - Record each **valid candidate**; keep the **best** for that `k` using tie-breakers.
5. **Stop** when a valid `k` is found; print the best team for that size.

---

## 📁 Project structure

```
tft-trait-tracker-algorithm/
├── champs.json       # Champion data (input)
├── solve.js          # v2.0.0 algorithm (iterative deepening)
└── README.md
```

---

## 📦 Installation

### Prerequisites
- **Node.js ≥ 18**
- **npm** (comes with Node)

```bash
git clone https://github.com/kgnio/tft-trait-tracker-algorithm.git
cd tft-trait-tracker-algorithm
npm init -y   # optional, only if you want a package.json
```

> Windows/PowerShell tips  
> - If `npm` is not recognized: open a new terminal or add `C:\Program Files\nodejs` and `%AppData%\npm` to PATH.  
> - If you see `running scripts is disabled`:  
>   `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

---

## ▶️ Usage

1) Put your champion data into **`champs.json`** (see format below).

2) Configure the **manual input** section at the top of `solve.js`:

```js
/* ======================= MANUAL INPUT (edit here) ======================= */
const excludeTraits = ["Monster Trainer", "Rogue Captain", "The Champ", "Rosemother", "Stance Master"];
const excludeChamps = ["Ekko", "Lulu", "Kog'Maw", "Smolder", "Rammus", "Lee Sin"];
const TARGET_TRAIT_COUNT = 7;
const TRAIT_MIN_THRESH = {
  "Battle Academia": 3, "Crystal Gambit": 3, "Luchador": 2, "Mentor": 1,
  "Mighty Mech": 3, "Monster Trainer": 1, "Prodigy": 2, "Protector": 2,
  "Rogue Captain": 1, "Rosemother": 1, "Sniper": 2, "Sorcerer": 2,
  "Soul Fighter": 2, "Stance Master": 1, "Star Guardian": 2, "Strategist": 2,
  "Supreme Cells": 2, "The Champ": 1, "The Crew": 2, "Wraith": 2,
  "Bastion": 2, "Duelist": 2, "Edgelord": 2, "Executioner": 2, "Heavyweight": 2, "Juggernaut": 2,
};
/* ======================================================================= */
```

3) Run:

```bash
node solve.js
```

---

## 🧩 champs.json format

Each champion:

- `name`: string  
- `cost`: integer (1..5)  
- `traits`: string[]  

**Example:**
```json
[
  { "name": "Garen", "cost": 1, "traits": ["Battle Academia", "Bastion"] },
  { "name": "Senna", "cost": 3, "traits": ["Mighty Mech", "Executioner"] },
  { "name": "Ahri",  "cost": 3, "traits": ["Star Guardian", "Sorcerer"] }
]
```

---

## 🧮 Tie-breakers (applied only among solutions with the same k)

1. Prefer **no 5-cost** champions.  
2. If tied, prefer **no 4-cost** champions.  
3. If tied, prefer **lower average cost**.  
4. If tied, prefer **lower total cost**.  
5. If tied, prefer **alphabetical** (stable output).

---

## 📊 Interpreting the logs

Example session:

```
🔎 Searching exact team size k=6 ...
✅ candidate(k=6) | 5=n 4=n avg=2.17 | team=Aatrox(1), Kennen(1), Kai'Sa(2), Udyr(3), Ahri(3), Neeko(3)
✅ candidate(k=6) | 5=n 4=n avg=1.83 | team=Kennen(1), Malphite(1), Rell(1), Shen(2), Ahri(3), Yasuo(3)

🎯 Found minimal team size: k=6
──────────────────────────────────────────────
=== RESULT ===
Champion count: 6
Team: Kennen, Malphite, Rell, Shen, Ahri, Yasuo
Costs: [1, 1, 1, 2, 3, 3], Avg: 1.83
Has 5-cost?: No
Has 4-cost?: No
Activated traits (7): Bastion, Edgelord, Mentor, Protector, Sorcerer, Star Guardian, The Crew
──────────────────────────────────────────────
📈 Node visits: 508714, prunes(cannot-reach): 469823
⏱️  Done in 1476 ms
```

- **k=…**: the algorithm is checking **exactly k-sized** teams.  
- **candidate(k=6)**: this 6‑champ team activates ≥7 traits and is considered for best‑of‑k.  
- **Found minimal team size**: the first `k` that yields a valid solution — the search stops here.  
- **Node visits / prunes**: performance counters (visited states / pruned branches by bound).

---

## ⚡ Performance notes

- The theoretical search space for combinations is large, but **branch & bound** and **cheap‑first ordering** keep it fast in practice.
- The optimistic bound (`+2 traits per remaining slot`) is a safe over‑approximation used only for pruning.

---

## 🧪 Tips & extensions

- To print **all valid candidates** for the minimal `k`, you can log every candidate before comparing:
  ```js
  // inside dfsFixedK() when remainSlots===0 and activated.size ok:
  console.log(`✅ candidate(k=${k}) ...`);
  if (!bestForK || better(cand, bestForK) < 0) bestForK = cand;
  ```
- You can expose config via CLI flags (e.g., `--target 7 --exclude "Monster Trainer,Lee Sin"`).

---

## 🪪 License

MIT License © 2025 [kgnio](https://github.com/kgnio)

---

**Made with ❤️ by Kagan-dev**
