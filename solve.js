const fs = require('fs');
const path = require('path');

/* ======================= KULLANICI KONFİG (elle gir) ======================= */

// İşleme ALINMAYACAK trait'ler (örn: tekil veya kullanmak istemediklerin)
const excludeTraits = [
    "Monster Trainer", "Rogue Captain", "The Champ", "Rosemother", "Stance Master"
];

// İşleme ALINMAYACAK şampiyonlar
const excludeChamps = [
    "Ekko", "Lulu", "Kog'Maw", "Smolder", "Rammus", "Lee Sin"
];

// Kaç trait açılacak (hedef)
const TARGET_TRAIT_COUNT = 7;

/* ====== Trait minimum eşikleri ====== */
/** Mentor özel: exactly 1 veya 4. Burada min eşik 1 ama "tam 1" veya "tam 4" şartı var. */
const TRAIT_MIN_THRESH = {
    // Origins / Lines
    "Battle Academia": 3,
    "Crystal Gambit": 3,
    "Luchador": 2,
    "Mentor": 1,             // özel kural (exactly 1 or 4)
    "Mighty Mech": 3,
    "Monster Trainer": 1,
    "Prodigy": 2,
    "Protector": 2,
    "Rogue Captain": 1,
    "Rosemother": 1,
    "Sniper": 2,
    "Sorcerer": 2,
    "Soul Fighter": 2,
    "Stance Master": 1,      // Lee Sin 
    "Star Guardian": 2,
    "Strategist": 2,
    "Supreme Cells": 2,
    "The Champ": 1,
    "The Crew": 2,
    "Wraith": 2,
    // Classes
    "Bastion": 2,
    "Duelist": 2,
    "Edgelord": 2,
    "Executioner": 2,
    "Heavyweight": 2,
    "Juggernaut": 2,
};

/* =========================== Yardımcı Fonksiyonlar =========================== */

function loadChamps() {
    const file = path.resolve(__dirname, 'champs.json');
    const raw = fs.readFileSync(file, 'utf8');
    /** @type {{name:string,cost:number,traits:string[]}[]} */
    const data = JSON.parse(raw);
    return data.filter(c => Number.isFinite(c.cost) && Array.isArray(c.traits) && c.traits.length > 0);
}


/** Trait eşiklerini sağlayıp sağlamadığını hesapla */
function getActivatedTraits(selectedChamps) {
    const counts = {};
    for (const ch of selectedChamps) {
        for (const t of ch.traits) {
            if (excludeTraitsSet.has(t)) continue;
            counts[t] = (counts[t] || 0) + 1;
        }
    }

    const activated = new Set();

    // Mentor özel kural: exactly 1 veya 4
    const mentorCount = counts['Mentor'] || 0;
    if (!excludeTraitsSet.has('Mentor')) {
        if (mentorCount === 1 || mentorCount === 4) {
            activated.add('Mentor');
        }
    }

    for (const [trait, min] of Object.entries(TRAIT_MIN_THRESH)) {
        if (trait === 'Mentor') continue; // özel kuralı yukarıda ele aldık
        if (excludeTraitsSet.has(trait)) continue;
        const c = counts[trait] || 0;
        if (c >= min) activated.add(trait);
    }

    return activated;
}

/*  Önce 5-cost yok (true>), sonra 4-cost yok, sonra ortalama cost küçük */
function tiebreakScore(selectedChamps) {
    const costs = selectedChamps.map(c => c.cost);
    const has5 = costs.some(c => c === 5);
    const has4 = costs.some(c => c === 4);
    const avg = costs.reduce((a, b) => a + b, 0) / (costs.length || 1);
    // Daha iyi kombinasyon = daha büyük skor olsun diye neg’leri kullanmıyoruz;
    // Tersine, sıralamada custom comparator yazacağız.
    return { has5, has4, avg };
}

/** İki çözümü bizim kurallara göre kıyasla */
function betterSolution(a, b) {
    // 1) daha az şampiyon
    if (a.team.length !== b.team.length) return a.team.length - b.team.length;

    // 2) 5-cost içermeyen tercih
    if (a.tie.has5 !== b.tie.has5) return a.tie.has5 ? 1 : -1;

    // 3) 4-cost içermeyen tercih
    if (a.tie.has4 !== b.tie.has4) return a.tie.has4 ? 1 : -1;

    // 4) ortalama cost küçük
    if (a.tie.avg !== b.tie.avg) return a.tie.avg - b.tie.avg;

    // 5) toplam cost küçük (ek küçük eşitlik kırıcı)
    const aSum = a.team.reduce((s, c) => s + c.cost, 0);
    const bSum = b.team.reduce((s, c) => s + c.cost, 0);
    if (aSum !== bSum) return aSum - bSum;

    // 6) son çare: alfabetik sabitlik
    const an = a.team.map(c => c.name).sort().join('|');
    const bn = b.team.map(c => c.name).sort().join('|');
    return an.localeCompare(bn);
}

/** Basit greedy üst-sınır tahmini: kalan şampiyonların ekleyebileceği maksimum yeni trait sayısıyla prunelar */
function canReachTarget(currentActivated, idx, remaining, target = TARGET_TRAIT_COUNT) {
    // Kaba bir üst sınır: her şampiyon sanki 2 yeni trait kazandırıyormuş gibi varsay
    // (pratikte daha yüksek olabilir ama prunelamak için yeterli kaba üst sınır)
    const maxGain = remaining * 2;
    return currentActivated.size + maxGain >= target;
}

/* ========================== Çözüm / Arama (DFS + BB) ========================= */

let best = null;

/** Şampiyonları trait verimine göre sıralayıp DFS yapalım */
function search(champs, startIndex, chosen, activated) {
    // Prune: mevcut seçim zaten daha kötü mü?
    if (best && chosen.length > best.team.length) return;

    // Hedefe ulaştık mı?
    if (activated.size >= TARGET_TRAIT_COUNT) {
        const sol = {
            team: chosen.slice(),
            traits: new Set(activated),
            tie: tiebreakScore(chosen),
        };
        if (!best || betterSolution(sol, best) < 0) best = sol;
        // Daha da eklemek gereksiz
        return;
    }

    // combinational prune: teorik olarak kalanlarla hedefe erişilebiliyor mu?
    const remaining = champs.length - startIndex;
    if (!canReachTarget(activated, startIndex, remaining, TARGET_TRAIT_COUNT)) return;

    // Ayrıca: eğer en iyi çözüm varsa ve kalan minimum şampiyon sayısı bile yetse bile
    // bir alt bound ile prunelayabiliriz:
    if (best) {
        // Gereken trait sayısı:
        const needed = TARGET_TRAIT_COUNT - activated.size;
        // Safça “her şampiyon min 1 yeni trait getirir” desek bile:
        if (chosen.length + needed >= best.team.length) {
            // eşit sayıda kişi ile ancak tiebreak'e kalacak, yine de deneyebiliriz ama çok dallanıyorsa atla
            // Burada yine de devam etmeyi seçebiliriz; performans sorunu olursa aktif edin.
        }
    }

    for (let i = startIndex; i < champs.length; i++) {
        const ch = champs[i];

        // Adayı seç
        chosen.push(ch);

        // yeni activated set’i hesapla (fazla kopya maliyetini azaltmak için incrementally yapabiliriz)
        const newActivated = getActivatedTraits(chosen);

        // Erken prunelar
        if (!best || chosen.length <= best.team.length) {
            search(champs, i + 1, chosen, newActivated);
        }

        // Geri al
        chosen.pop();

        // Opsiyonel: “ch’i almadan” devam
        // Eğer zaten daha önce pruned değilse, atlanmış dalları da gezelim:
        // (Ama klasik kombinasyon DFS'inde “seçmeden geç” zaten sonraki i+1 ile oluyor)
    }
}

/* ================================ Çalıştır ================================ */

const all = loadChamps();

// Hariç tutulacaklar setleri
const excludeTraitsSet = new Set(excludeTraits.map(s => s.trim()));
const excludeChampsSet = new Set(excludeChamps.map(s => s.trim()));

// Filtrele
let pool = all.filter(c => !excludeChampsSet.has(c.name));

// Her şampiyonun trait listesinden excludeTraits'i ayıkla (işleme alınmayacak)
pool = pool.map(c => ({
    ...c,
    traits: c.traits.filter(t => !excludeTraitsSet.has(t)),
})).filter(c => c.traits.length > 0);

// Ön-sıralama: ucuz ve verimli şampiyonları üste al
// Basit sezgi: cost artan, trait sayısı azalan sıralama (ucuz ve çok trait’li olan üste)
pool.sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    if (b.traits.length !== a.traits.length) return b.traits.length - a.traits.length;
    return a.name.localeCompare(b.name);
});

// DFS başlat
best = null;
search(pool, 0, [], new Set());

// Sonuç yazdır
if (!best) {
    console.log('Uygun bir kombinasyon bulunamadı. (Filtreleri / hariç tutulanları kontrol et)');
    process.exit(0);
}

const names = best.team.map(c => c.name);
const costs = best.team.map(c => c.cost);
const avg = (costs.reduce((s, v) => s + v, 0) / costs.length).toFixed(2);
const activatedList = Array.from(best.traits).sort();

console.log('=== ÇÖZÜM ===');
console.log(`Şampiyon sayısı: ${best.team.length}`);
console.log(`Takım: ${names.join(', ')}`);
console.log(`Costlar: [${costs.join(', ')}], Ortalama: ${avg}`);
console.log(`5-cost var mı?: ${best.tie.has5 ? 'Evet' : 'Hayır'}`);
console.log(`4-cost var mı?: ${best.tie.has4 ? 'Evet' : 'Hayır'}`);
console.log(`Aktif edilen trait sayısı: ${activatedList.length}`);
console.log(`Aktif traitler: ${activatedList.join(', ')}`);
