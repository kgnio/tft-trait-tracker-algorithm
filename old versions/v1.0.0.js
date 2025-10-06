/* It's trying 1 trillion possibilites for 40 champions. Totally worthless (v1.0.0) */

const fs = require('fs');
const path = require('path');

/* ======================= MANUAL INPUT =======================
   - Traits to EXCLUDE entirely from consideration
   - Champions to EXCLUDE entirely from consideration
   - Target number of activated traits
   - Trait thresholds (minimum units required to activate)
*/
const excludeTraits = [
    "Monster Trainer", "Rogue Captain", "The Champ", "Rosemother", "Stance Master"
];
const excludeChamps = [
    "Ekko", "Lulu", "Kog'Maw", "Smolder", "Rammus", "Lee Sin"
];
const TARGET_TRAIT_COUNT = 7;
const TRAIT_MIN_THRESH = {
    "Battle Academia": 3,
    "Crystal Gambit": 3,
    "Luchador": 2,
    "Mentor": 1, // exactly 1 or 4
    "Mighty Mech": 3,
    "Monster Trainer": 1,
    "Prodigy": 2,
    "Protector": 2,
    "Rogue Captain": 1,
    "Rosemother": 1,
    "Sniper": 2,
    "Sorcerer": 2,
    "Soul Fighter": 2,
    "Stance Master": 1,
    "Star Guardian": 2,
    "Strategist": 2,
    "Supreme Cells": 2,
    "The Champ": 1,
    "The Crew": 2,
    "Wraith": 2,
    "Bastion": 2,
    "Duelist": 2,
    "Edgelord": 2,
    "Executioner": 2,
    "Heavyweight": 2,
    "Juggernaut": 2,
};
/* ====================================================================== */

const t0 = Date.now();
console.log("▶️  Start solve.js");
const file = path.resolve(__dirname, 'champs.json');
console.log("📄 Champs file:", file);

function loadChamps() {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    const cleaned = data.filter(c => Number.isFinite(c.cost) && Array.isArray(c.traits) && c.traits.length > 0);
    console.log(`📦 Loaded champions: ${data.length}, usable after basic filter: ${cleaned.length}`);
    return cleaned;
}

const all = loadChamps();

const excludeTraitsSet = new Set(excludeTraits.map(s => s.trim()));
const excludeChampsSet = new Set(excludeChamps.map(s => s.trim()));

console.log("⛔ Excluded traits:", [...excludeTraitsSet].join(', ') || '(none)');
console.log("⛔ Excluded champs:", [...excludeChampsSet].join(', ') || '(none)');

let pool = all.filter(c => !excludeChampsSet.has(c.name));
console.log(`🔎 After champ exclusion: ${pool.length}`);

pool = pool.map(c => ({
    ...c,
    traits: c.traits.filter(t => !excludeTraitsSet.has(t)),
})).filter(c => c.traits.length > 0);

console.log(`🧹 After trait stripping (and removing empty): ${pool.length}`);
console.log("🧾 Pool preview:", pool.slice(0, Math.min(10, pool.length)).map(c => `${c.name}(${c.cost})[${c.traits.join('|')}]`).join(' | ') + (pool.length > 10 ? ' ...' : ''));

pool.sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    if (b.traits.length !== a.traits.length) return b.traits.length - a.traits.length;
    return a.name.localeCompare(b.name);
});
console.log("↕️  Pool sorted by (cost asc, trait-count desc, name asc).");

function getActivatedTraits(selectedChamps) {
    const counts = {};
    for (const ch of selectedChamps) {
        for (const t of ch.traits) {
            if (excludeTraitsSet.has(t)) continue;
            counts[t] = (counts[t] || 0) + 1;
        }
    }
    const activated = new Set();
    const mentorCount = counts['Mentor'] || 0;
    if (!excludeTraitsSet.has('Mentor')) {
        if (mentorCount === 1 || mentorCount === 4) activated.add('Mentor');
    }
    for (const [trait, min] of Object.entries(TRAIT_MIN_THRESH)) {
        if (trait === 'Mentor') continue;
        if (excludeTraitsSet.has(trait)) continue;
        const c = counts[trait] || 0;
        if (c >= min) activated.add(trait);
    }
    return activated;
}

function tiebreakScore(selectedChamps) {
    const costs = selectedChamps.map(c => c.cost);
    const has5 = costs.some(c => c === 5);
    const has4 = costs.some(c => c === 4);
    const avg = costs.reduce((a, b) => a + b, 0) / (costs.length || 1);
    return { has5, has4, avg };
}

function betterSolution(a, b) {
    if (a.team.length !== b.team.length) return a.team.length - b.team.length;
    if (a.tie.has5 !== b.tie.has5) return a.tie.has5 ? 1 : -1;
    if (a.tie.has4 !== b.tie.has4) return a.tie.has4 ? 1 : -1;
    if (a.tie.avg !== b.tie.avg) return a.tie.avg - b.tie.avg;
    const aSum = a.team.reduce((s, c) => s + c.cost, 0);
    const bSum = b.team.reduce((s, c) => s + c.cost, 0);
    if (aSum !== bSum) return aSum - bSum;
    const an = a.team.map(c => c.name).sort().join('|');
    const bn = b.team.map(c => c.name).sort().join('|');
    return an.localeCompare(bn);
}

function canReachTarget(currentActivated, remaining, target = TARGET_TRAIT_COUNT) {
    const maxGain = remaining * 2;
    return currentActivated.size + maxGain >= target;
}

let best = null;
let nodeVisits = 0;
let prunesCannotReach = 0;
let prunesLongerThanBest = 0;

function search(champs, startIndex, chosen, activated) {
    nodeVisits++;

    if (best && chosen.length > best.team.length) {
        prunesLongerThanBest++;
        return;
    }

    if (activated.size >= TARGET_TRAIT_COUNT) {
        const sol = {
            team: chosen.slice(),
            traits: new Set(activated),
            tie: tiebreakScore(chosen),
        };
        if (!best || betterSolution(sol, best) < 0) {
            best = sol;
            const names = best.team.map(c => `${c.name}(${c.cost})`).join(', ');
            const traits = [...best.traits].sort().join(', ');
            console.log(`✅ New best! size=${best.team.length} | 5-cost=${best.tie.has5 ? 'yes' : 'no'} | 4-cost=${best.tie.has4 ? 'yes' : 'no'} | avg=${best.tie.avg.toFixed(2)}`);
            console.log(`   team: ${names}`);
            console.log(`   traits(${best.traits.size}): ${traits}`);
        }
        return;
    }

    const remaining = champs.length - startIndex;
    if (!canReachTarget(activated, remaining, TARGET_TRAIT_COUNT)) {
        prunesCannotReach++;
        return;
    }

    for (let i = startIndex; i < champs.length; i++) {
        const ch = champs[i];
        const before = new Set(activated);
        const chosenNames = chosen.map(x => x.name).join(', ');
        console.log(`→ Try + ${ch.name} (${ch.cost}) at idx=${i} | chosen=[${chosenNames}] | activated=${activated.size}/${TARGET_TRAIT_COUNT}`);

        chosen.push(ch);
        const newActivated = getActivatedTraits(chosen);
        const newly = [...newActivated].filter(t => !before.has(t));
        if (newly.length > 0) {
            console.log(`   + Activated new traits: ${newly.join(', ')} | total=${newActivated.size}`);
        } else {
            console.log(`   (no new trait) total=${newActivated.size}`);
        }

        if (!best || chosen.length <= best.team.length) {
            search(champs, i + 1, chosen, newActivated);
        }

        chosen.pop();
    }
}

console.log(`🎯 Target activated traits: ${TARGET_TRAIT_COUNT}`);
console.log(`📊 Trait thresholds in use: ${Object.entries(TRAIT_MIN_THRESH).map(([k, v]) => `${k}:${v}`).join(' | ')}`);
console.log(`🚀 Starting DFS over pool size=${pool.length} ...`);
search(pool, 0, [], new Set());

console.log("──────────────────────────────────────────────");
if (!best) {
    console.log('❌ No feasible combination. Check exclusions/thresholds.');
} else {
    const names = best.team.map(c => c.name);
    const costs = best.team.map(c => c.cost);
    const avg = (costs.reduce((s, v) => s + v, 0) / costs.length).toFixed(2);
    const activatedList = Array.from(best.traits).sort();

    console.log('=== RESULT ===');
    console.log(`Champion count: ${best.team.length}`);
    console.log(`Team: ${names.join(', ')}`);
    console.log(`Costs: [${costs.join(', ')}], Avg: ${avg}`);
    console.log(`Has 5-cost?: ${best.tie.has5 ? 'Yes' : 'No'}`);
    console.log(`Has 4-cost?: ${best.tie.has4 ? 'Yes' : 'No'}`);
    console.log(`Activated traits (${activatedList.length}): ${activatedList.join(', ')}`);
}
console.log("──────────────────────────────────────────────");
console.log(`📈 Node visits: ${nodeVisits}, prunes(cannot-reach): ${prunesCannotReach}, prunes(longer-than-best): ${prunesLongerThanBest}`);
console.log(`⏱️  Done in ${(Date.now() - t0)} ms`);
