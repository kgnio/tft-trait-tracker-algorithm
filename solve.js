/* Fast and clean version. Working. (v2.0.0) */

const fs = require('fs');
const path = require('path');

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

const t0 = Date.now();
const champsPath = path.resolve(__dirname, 'champs.json');

function loadChamps() {
    const raw = fs.readFileSync(champsPath, 'utf8');
    const data = JSON.parse(raw);
    return data.filter(c => Number.isFinite(c.cost) && Array.isArray(c.traits) && c.traits.length > 0);
}

const all = loadChamps();
const excludeTraitsSet = new Set(excludeTraits);
const excludeChampsSet = new Set(excludeChamps);

// filter & strip
let pool = all.filter(c => !excludeChampsSet.has(c.name))
    .map(c => ({ ...c, traits: c.traits.filter(t => !excludeTraitsSet.has(t)) }))
    .filter(c => c.traits.length > 0);

// sort: cheapest first, then more traits, then name
pool.sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    if (b.traits.length !== a.traits.length) return b.traits.length - a.traits.length;
    return a.name.localeCompare(b.name);
});

// helpers
function getActivatedTraits(selected) {
    const counts = {};
    for (const ch of selected) for (const t of ch.traits) counts[t] = (counts[t] || 0) + 1;

    const activated = new Set();
    // Mentor special: exactly 1 or 4
    const m = counts['Mentor'] || 0;
    if (!excludeTraitsSet.has('Mentor') && (m === 1 || m === 4)) activated.add('Mentor');

    for (const [trait, min] of Object.entries(TRAIT_MIN_THRESH)) {
        if (trait === 'Mentor' || excludeTraitsSet.has(trait)) continue;
        if ((counts[trait] || 0) >= min) activated.add(trait);
    }
    return activated;
}

function tiebreakScore(team) {
    const costs = team.map(c => c.cost);
    const has5 = costs.includes(5);
    const has4 = costs.includes(4);
    const avg = costs.reduce((a, b) => a + b, 0) / team.length;
    const sum = costs.reduce((a, b) => a + b, 0);
    return { has5, has4, avg, sum };
}

function better(a, b) {
    // same k ensured by caller
    if (a.score.has5 !== b.score.has5) return a.score.has5 ? 1 : -1;
    if (a.score.has4 !== b.score.has4) return a.score.has4 ? 1 : -1;
    if (a.score.avg !== b.score.avg) return a.score.avg - b.score.avg;
    if (a.score.sum !== b.score.sum) return a.score.sum - b.score.sum;
    const an = a.team.map(c => c.name).sort().join('|');
    const bn = b.team.map(c => c.name).sort().join('|');
    return an.localeCompare(bn);
}

// quick optimistic bound: even if each future champ adds 2 new traits
function canReachTarget(currentActivatedCount, slotsLeft) {
    return currentActivatedCount + 2 * slotsLeft >= TARGET_TRAIT_COUNT;
}

let nodeVisits = 0, prunesCannotReach = 0;

// depth-limited search that builds exactly k champions
function dfsFixedK(k, startIdx, chosen, bestForK) {
    nodeVisits++;

    const activated = getActivatedTraits(chosen);
    const remainSlots = k - chosen.length;
    if (!canReachTarget(activated.size, remainSlots)) {
        prunesCannotReach++;
        return bestForK;
    }

    if (remainSlots === 0) {
        if (activated.size >= TARGET_TRAIT_COUNT) {
            const cand = { team: chosen.slice(), traits: activated, score: tiebreakScore(chosen) };
            if (!bestForK || better(cand, bestForK) < 0) {
                bestForK = cand;
                console.log(`👌 candidate(k=${k}) | 5=${cand.score.has5 ? 'y' : 'n'} 4=${cand.score.has4 ? 'y' : 'n'} avg=${cand.score.avg.toFixed(2)} | team=${cand.team.map(c => `${c.name}(${c.cost})`).join(', ')}`);
            }
        }
        return bestForK;
    }

    for (let i = startIdx; i < pool.length; i++) {
        // pruning: if remaining champs cannot fill required slots, break
        const remainPool = pool.length - i;
        if (remainPool < remainSlots) break;

        chosen.push(pool[i]);
        bestForK = dfsFixedK(k, i + 1, chosen, bestForK);
        chosen.pop();
    }
    return bestForK;
}

// iterative deepening over team size k
let final = null;
for (let k = 1; k <= pool.length; k++) {
    console.log(`\n🔎 Searching exact team size k=${k} ...`);
    const bestK = dfsFixedK(k, 0, [], null);
    if (bestK) {
        final = bestK;
        console.log(`\n 👍 Found minimal team size: k=${k}`);
        break; // stop at the first k that works
    }
}

console.log("──────────────────────────────────────────────");
if (!final) {
    console.log("🫥 No feasible combination. Adjust exclusions/thresholds.");
} else {
    const names = final.team.map(c => c.name);
    const costs = final.team.map(c => c.cost);
    const avg = (costs.reduce((s, v) => s + v, 0) / costs.length).toFixed(2);
    const traits = [...final.traits].sort();

    console.log("=== RESULT ===");
    console.log(`Champion count: ${final.team.length}`);
    console.log(`Team: ${names.join(', ')}`);
    console.log(`Costs: [${costs.join(', ')}], Avg: ${avg}`);
    console.log(`Has 5-cost?: ${final.score.has5 ? 'Yes' : 'No'}`);
    console.log(`Has 4-cost?: ${final.score.has4 ? 'Yes' : 'No'}`);
    console.log(`Activated traits (${traits.length}): ${traits.join(', ')}`);
}
console.log("──────────────────────────────────────────────");
console.log(`📈 Node visits: ${nodeVisits}, prunes(cannot-reach): ${prunesCannotReach}`);
console.log(`⏱️  Done in ${Date.now() - t0} ms`);
