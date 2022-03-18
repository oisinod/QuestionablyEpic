// 
import { strictEqual } from "assert";
import { applyDiminishingReturns } from "General/Engine/ItemUtilities";
import { MONKSPELLS } from "./MistweaverSpellDB";
import { convertPPMToUptime } from "Retail/Engine/EffectFormulas/EffectUtilities"

// Any settings included in this object are immutable during any given runtime. Think of them as hard-locked settings.
const discSettings = {
    chaosBrand: true
}

// This function automatically casts a full set of ramps. It's easier than having functions call ramps individually and then sum them.
export const allRamps = (boonSeq, fiendSeq, stats, settings = {}, conduits) => {
    
    const miniSeq = buildRamp('Mini', 6, [], stats.haste, "Kyrian Evangelism", [])
    const miniRamp = runCastSequence(miniSeq, stats, settings, conduits);
    const boonRamp = runCastSequence(boonSeq, stats, settings, conduits);
    const fiendRamp = runCastSequence(fiendSeq, stats, settings, conduits);
    return boonRamp + fiendRamp + miniRamp * 2;
}


/** A spells damage multiplier. It's base damage is directly multiplied by anything the function returns.
 * @schism 25% damage buff to primary target if Schism debuff is active.
 * @sins A 3-12% damage buff depending on number of active atonements.
 * @chaosbrand A 5% damage buff if we have Chaos Brand enabled in Disc Settings.
 * @AscendedEruption A special buff for the Ascended Eruption spell only. The multiplier is equal to 3% (4 with conduit) x the number of Boon stacks accrued.
 */
const getDamMult = (buffs, activeAtones, t, spellName, boonStacks, conduits) => {
    let mult = 1

    if (MONKSPELLS[spellName].damageType === "Physical")
    {
        mult *= 1.05 // Mystic Touch.
    }

    const multiplierBuffList = ["Dream Delver", "Tea Time"];
    multiplierBuffList.forEach(buffName => {
        if (checkBuffActive(buffs, buffName)) 
    {
        mult *= buffs.filter(function (buff) {return buff.name === buffName})[0].value;
    }
    });

    if (checkBuffActive(buffs, "Faeline Harmony Inc")) mult *= 1.08;

    return mult; 
}

/** A healing spells healing multiplier. It's base healing is directly multiplied by whatever the function returns.
 * @powerwordshield Gets a 200% buff if Rapture is active (modified by Exaltation if taken)
 * @ascendedEruption The healing portion also gets a buff based on number of boon stacks on expiry.
 */
const getHealingMult = (state, spellName, conduits) => {
    let mult = 1
    const buffs = state.activeBuffs;

    const multiplierBuffList = ["Dream Delver", "Token of Appreciation", "Tea Time"];

    multiplierBuffList.forEach(buffName => {
        if (checkBuffActive(buffs, buffName)) 
    {
        mult *= buffs.filter(function (buff) {return buff.name === buffName})[0].value;
    }
    });

    // Healing multiplier of 2pc affects all healing (including 4pc)
    if (state.settings.misc.includes("2T28") && (spellName === "Essence Font (HoT)" || spellName === "Essence Font (HoT - Faeline Stomp)")) {
        mult *= 1.05;
    }

    // Apply Jade Bond conduit
    if (spellName === "Gust of Mists (Chiji)" || spellName === "Gust of Mists (CTA Chiji)" || spellName === "Soothing Breath (CTA Yulon)" || spellName === "Soothing Breath (Yulon)")
    {
        mult *= 1.125;
    }

    // Apply Resplendant Mist conduit
    if (spellName === "Gust of Mists" || spellName === "Gust of Mists (Revival)" || spellName === "Gust of Mists (CTA Chiji)" || spellName === "Gust of Mists (Chiji)" || spellName === "Gust of Mists (Essence Font)" || spellName === "Gust of Mists (Bonedust Brew)")
    {
        mult *= 1 + 0.3 * 1;
    }

    if (spellName === "Gust of Mists (Essence Font)")
    {
        const efHots = ["Essence Font (HoT)", "Essence Font (HoT - Faeline Stomp)"]
        const activeEFBuffs = state.activeBuffs.filter(function (buff) {return efHots.includes(buff.name)})
        let multi = activeEFBuffs.length / 20;
        if (multi > 1) multi = 1;
        mult *= multi;
    }

    // FLS buffs 5 targets. We'll take the average healing increase. This is likely a slight underestimation since your RJW and FLS targets will line up closely. On the other
    // hand FLS likes to hit pets sometimes so it should be fair. 
    if (checkBuffActive(buffs, "Faeline Harmony Inc")) mult *= (0.08 * 5 / 20) + 1; 

    // Enveloping mist and breath healing increase
    if (spellName != "Faeline Stomp" && spellName != "Enveloping Mist" && spellName != "Enveloping Breath")
    {
        if (checkBuffActive(buffs, "Enveloping Mist"))
        {
            const EnvelopingMistCount = buffs.filter(function (buff) {return buff.name === "Enveloping Mist"}).length;
            mult *= 1 + 0.3 * EnvelopingMistCount / 20;
        }

        // This currently multiplies the healing value by 3.5 due to number of targets hit per buff
        if (checkBuffActive(buffs, "Enveloping Breath"))
        {
            const EnvelopingBreathCount = buffs.filter(function (buff) {return buff.name === "Enveloping Breath"}).length;
            mult *= 1 + 0.1 * EnvelopingBreathCount / 20 * 3.5;
        }
    }

    return mult;
}

/** Check if a specific buff is active. Buffs are removed when they expire so this is active buffs only.
 * @param buffs An array of buff objects.
 * @param buffName The name of the buff we're searching for.
 */
const checkBuffActive = (buffs, buffName) => {
    return buffs.filter(function (buff) {return buff.name === buffName}).length > 0;
}


/**
 * Returns a spells stat multiplier based on which stats it scales with.
 * @param {*} statArray A characters current stats including any active buffs.
 * @param {*} stats The secondary stats a spell scales with. Pulled from it's SpellDB entry.
 * @returns An effective multiplier. For a spell that scales with both crit and vers this would just be crit x vers.
 */
const getStatMult = (currentStats, stats) => {
    let mult = 1;
    if (stats.includes("vers")) mult *= (1 + currentStats['versatility'] / 40 / 100);
    if (stats.includes("crit")) mult *= (1.05 + currentStats['crit'] / 35 / 100); // TODO: Re-enable
    if (stats.includes("mastery")) mult *= (1.336 + currentStats['mastery'] / 35 * 4.2 / 100);
    return mult;
}

/**
 * Get our players active stats. This is made up of our base stats + any buffs. 
 * Diminishing returns is not in play in this function. It's instead included when we get the stat multiplier itself. 
 * @param {} statArray Our active stats.
 * @param {*} buffs Our active buffs.
 * @returns 
 */
const getCurrentStats = (statArray, buffs) => {
    const statBuffs = buffs.filter(function (buff) {return buff.buffType === "stats"});
    statBuffs.forEach(buff => {
        statArray[buff.stat] = (statArray[buff.stat] || 0) + buff.value;
    });

    statArray = applyDiminishingReturns(statArray);
    const multBuffs = buffs.filter(function (buff) {return buff.buffType === "statsMult"});
    multBuffs.forEach(buff => {
        // Multiplicative Haste buffs need some extra code. 
        if (buff.stat === "haste") statArray["haste"] = ((statArray[buff.stat] / 32 / 100 + 1 * buff.value)-1) * 32 * 100
        else statArray[buff.stat] = (statArray[buff.stat] || 0) * buff.value;
        
    });
    return statArray;
    //return statArray;
}

export const getHaste = (stats) => {  
    return 1 + stats.haste / 32 / 100;
}

const getSqrt = (targets, softCap = 1) => {
    if (softCap === 1) return Math.sqrt(targets);
    else return Math.min(Math.sqrt(softCap / targets), 1)
}

/**
 * Get a spells raw damage or healing. This is made up of it's coefficient, our intellect, and any secondary stats it scales with.
 * We'll take care of multipliers like Schism and Sins in another function.
 * @param {object} spell The spell being cast. Spell data is pulled from DiscSpellDB. 
 * @param {object} currentStats A players current stats, including any buffs.
 * @returns The raw damage or healing of the spell.
 */
export const getSpellRaw = (spell, currentStats) => {
    return spell.coeff * currentStats.intellect * getStatMult(currentStats, spell.secondaries); // Multiply our spell coefficient by int and secondaries.
}

// This function is for time reporting. It just rounds the number to something easier to read. It's not a factor in any results.
const getTime = (t) => {
    return Math.round(t*1000)/1000
}

/**
 * This function handles all of our effects that might change our spell database before the ramps begin.
 * It includes conduits, legendaries, and some trinket effects.
 * 
 * @param {*} spells Our spell database
 * @param {*} settings Settings including legendaries, trinkets, soulbinds and anything that falls out of any other category.
 * @param {*} conduits The conduits run in the current set.
 * @returns An updated spell database with any of the above changes made.
 */
const applyLoadoutEffects = (spells, settings, conduits, state) => {

    // Default Loadout
    // While Top Gear can automatically include everything at once, individual modules like Trinket Analysis require a baseline loadout
    // since if we compare trinkets like Bell against an empty loadout it would be very undervalued. This gives a fair appraisal when
    // we don't have full information about a character.
    // As always, Top Gear is able to provide a more complete picture. 

    if (settings['DefaultLoadout']) {
        //settings['Clarity of Mind'] = true;
        //settings['Pelagos'] = true;
        //conduits['Shining Radiance'] = 239;
        //conduits['Rabid Shadows'] = 239;
        //conduits['Courageous Ascension'] = 239;

        if (settings['covenant'] === "Necrolord") {
            settings['soulbind'] = "Emeni"
        }
        else if (settings['covenant'] === "Night Fae") {
            settings['soulbind'] = "Dreamweaver"
        }
        else if (settings['covenant'] === "Kyrian") {
            settings['soulbind'] = "Kleia"
        }
        else if (settings['covenant'] === "Venthyr") {
            settings['soulbind'] = "Theotar"
        }
    }

    // === Legendaries ===
    // Note: Some legendaries do not need to be added to a ramp and can be compared with an easy formula instead like Cauterizing Shadows.

    // -- Invoker's Delight --
    // 33% haste for 20s when summoning celestial
    if (settings['legendaries'].includes("Invoker's Delight")) 
    {
        spells['Invoke Chiji'].push({
            type: "buff",
            buffType: "statsMult",
            stat: 'haste',
            value: 1.33,
            buffDuration: 20,
        });

        spells['Invoke Yulon'].push({
            type: "buff",
            buffType: "statsMult",
            stat: 'haste',
            value: 1.33,
            buffDuration: 20,
        });
    }

    // === Soulbinds ===
    // Don't include Conduits here just any relevant soulbind nodes themselves.
    // This section can be expanded with more nodes, particularly those from other covenants.
    // Examples: Combat Meditation, Pointed Courage
    if (settings['soulbind'] === "Dreamweaver") {
        spells['Faeline Stomp'].push({
            type: "buff",
            buffType: "statsMult",
            stat: 'haste',
            value: 1.15,
            buffDuration: 6,
    });
        // Chrysalis
        state.activeBuffs.push({name: "Empowered Chrysalis", expiration: 999, buffType: "special", value: 0.1});
        state.activeBuffs.push({name: "Dream Delver", expiration: 999, buffType: "special", value: 1.03});
    }

    if (settings['soulbind'] === "Pelagos") {
        spells['Weapons of Order'].push({
            name: "Combat Meditation",
            type: "buff",
            buffType: 'stats',
            stat: 'mastery',
            value: 315,
            buffDuration: 32,
        });

        state.activeBuffs.push({name: "Newfound Resolve", expiration: 999, buffType: "statsMult", value: 1 + convertPPMToUptime(1/1.5, 15) * 0.1, stat: 'intellect'});
    }
    
    // 385 = 35 * 11% crit (this goes into diminishing returns so probably underestimating)
    if (settings['soulbind'] === "Kleia") state.activeBuffs.push({name: "Kleia", expiration: 999, buffType: "stats", value: 385, stat: 'crit'})

    if (settings['soulbind'] === "Emeni") {
        spells['Bonedust Brew'].push({
            name: "Lead by Example",
            type: "buff",
            buffType: 'statsMult',
            stat: 'intellect',
            value: 1.13,
            buffDuration: 10,
        });
    }

    if (settings['soulbind'] === "Theotar") {
        state.activeBuffs.push({name: "Token of Appreciation", expiration: 999, buffType: "special", value: 1.025}); // 4% is overvalued wwhen factoring in tier and "high HPS sim"
        state.activeBuffs.push({name: "Tea Time", expiration: 999, buffType: "special", value: 1.025}); // Int doesn't scale with tier so not 3%, other stats scale worse
    }


    // === Trinkets ===
    // These settings change the stat value prescribed to a given trinket. We call these when adding trinkets so that we can grab their value at a specific item level.
    // When adding a trinket to this section, make sure it has an entry in DiscSpellDB first prescribing the buff duration, cooldown and type of stat.
    if (settings["Instructor's Divine Bell"]) spells["Instructor's Divine Bell"][0].value = settings["Instructor's Divine Bell"];
    if (settings["Flame of Battle"]) spells["Flame of Battle"][0].value = settings["Flame of Battle"];
    if (settings['Shadowed Orb']) spells['Shadowed Orb'][0].value = settings['Shadowed Orb'];
    if (settings['Soulletting Ruby']) spells['Soulletting Ruby'][0].value = settings['Soulletting Ruby'];
    //

    // === Conduits ===
    // These are all scaled based on Conduit rank.
    // You can add whichever conduits you like here, though if it doesn't change your ramp then you might be better calculating it in the conduit formulas file instead.
    // Examples of would be Condensed Anima Sphere.
    if (conduits['Courageous Ascension']) spells['Ascended Blast'][0].coeff *= 1.45; // Blast +40%, Eruption +1% per stack (to 4%)
    if (conduits['Shining Radiance']) spells['Power Word: Radiance'][0].coeff *= 1.64; // +64% radiance healing
    if (conduits['Rabid Shadows']) spells['Shadowfiend'][0].dot.tickRate = spells['Shadowfiend'][0].dot.tickRate / 1.342; // Fiends faster tick rate.
    if (conduits['Exaltation']) {
        spells['Rapture'][1].buffDuration = 9;
        spells['Rapture'][0].coeff = 1.65 * (1 + 2 * 1.135);
    }
    //

    return spells;
}

export const runDamage = (state, spell, spellName) => {
    //const activeAtonements = getActiveAtone(atonementApp, t); // Get number of active atonements.
    let damMultiplier = getDamMult(state.activeBuffs, 0, state.t, spellName, 0, state.conduits); // Get our damage multiplier (Schism, Sins etc);
    if ('damageType' in spell && spell.damageType === "physical") damMultiplier *= 0.7
    const damageVal = getSpellRaw(spell, state.currentStats) * damMultiplier;

    state.damageDone[spellName] = (state.damageDone[spellName] || 0) + damageVal; // This is just for stat tracking.

    if (checkBuffActive(state.activeBuffs, "Bonedust Brew")) {
        // Run duplicate damage.
        const bonedustDam = damageVal * 0.5 * 0.72 // 268 conduit
        state.damageDone['Bonedust Brew'] = (state.damageDone['Bonedust Brew'] || 0) + bonedustDam;
    }
    else if (state.settings.misc.includes("BB")) // Simulate second legendary
    {
        const emenibonus = damageVal * (0.13 * convertPPMToUptime(1.5, 10));
        const bonedustDam = (damageVal + emenibonus) * 0.5 * 0.4 * 1.88 * 0.256 // 268 conduit
        state.damageDone['Bonedust Brew (Plus Emeni)'] = (state.damageDone['Bonedust Brew (Plus Emeni)'] || 0) + bonedustDam + emenibonus;
    }

    //if (reporting) console.log(getTime(state.t) + " " + spellName + ": " + damageVal + ". Buffs: " + JSON.stringify(state.activeBuffs));
}

export const runHeal = (state, spell, spellName, specialMult = 1) => {

    // Pre-heal processing
    const currentStats = state.currentStats;
    let flatHeal = 0;
    let T284pcOverhealMultiplier = 1;
    let healingMult = 1;
    let bonedustBrewGust = 0;

    // == 4T28 ==
    // Some spells do not benefit from the bonus. It's unknown whether this is intentional.
    if (checkBuffActive(state.activeBuffs, "Primordial Mending") && !["Ancient Teachings of the Monastery"].includes(spellName) && !["Yulon's Whisper (Initial)"].includes(spellName)) {
        flatHeal = 450;
        T284pcOverhealMultiplier = 1.05;

        let tierhit = 1;
        if (spell.targets) state.tierhits += 1 * spell.targets;
        else state.tierhits += 1;


    }

    // Add Bonedust Brew additional mastery healing
    if (spellName === "Gust of Mists (Bonedust Brew)")
    {
        bonedustBrewGust = (0.42 * 1.04) * getStatMult(currentStats, ['crit', 'vers']) * currentStats.intellect;
    }
    
    healingMult = getHealingMult(state, spellName, state.conduits); 

    const targetMult = ('tags' in spell && spell.tags.includes('sqrt')) ? getSqrt(spell.targets, spell.softCap || 1) * spell.targets : spell.targets || 1;
    const healingVal = (getSpellRaw(spell, currentStats) + bonedustBrewGust + flatHeal * getStatMult(currentStats,  ['crit', 'vers'])) * (1 - spell.overheal * T284pcOverhealMultiplier) * healingMult * targetMult * specialMult;
    state.healingDone[spellName] = (state.healingDone[spellName] || 0) + healingVal; 
    if (checkBuffActive(state.activeBuffs, "Primordial Mending")){
        state.T284pcwindow[spellName] = (state.T284pcwindow[spellName] || 0) + healingVal; 
    }

    if (spell.mastery) {
        const masteryProc = MONKSPELLS['Gust of Mists'][0];
        runHeal(state, masteryProc, "Gust of Mists")
    }

    // EF Mastery duplication
    const efHots = ["Essence Font (HoT)", "Essence Font (HoT - Faeline Stomp)"]
    const activeEFBuffs = state.activeBuffs.filter(function (buff) {return efHots.includes(buff.name)})
    if (activeEFBuffs.length > 0 && (spellName === "Gust of Mists" || spellName === "Gust of Mists (Revival)" || spellName === "Gust of Mists (CTA Chiji)" || spellName === "Gust of Mists (Chiji)"))
    {
        const bonusMasteryProc = MONKSPELLS['Gust of Mists'][0];
        runHeal(state, bonusMasteryProc, "Gust of Mists (Essence Font)");
    }

    if (checkBuffActive(state.activeBuffs, "Bonedust Brew")) {
        if (spellName === "Gust of Mists" || spellName === "Gust of Mists (Revival)" || spellName === "Gust of Mists (CTA Chiji)" || spellName === "Gust of Mists (Chiji)") {
            const bonusMasteryProc = MONKSPELLS['Gust of Mists'][0];
            runHeal(state, bonusMasteryProc, "Gust of Mists (Bonedust Brew)");
        }

        // Run duplicate heal.
        // 278 conduit (in enhanced slot)
        // Hits 75% of raid
        // Logs show 50% overhealing, had it scaled down again with the spells overheal (as any overhealing of the spells makes sense that the duplicated heal can't heal extra)
        // This causes a "double dip" in the spell overheal but that's accurate with how BDB works 
        let bonedustHealing = healingVal * 0.5 * 0.4 * 1.88

        if (state.settings.misc.includes("BDB40"))
        {
            bonedustHealing *= 0.4;
        }
        else if (state.settings.misc.includes("BDB60"))
        {
            bonedustHealing *= 0.6;
        }
        else if (state.settings.misc.includes("BDB90"))
        {
            bonedustHealing *= 0.9;
        }
        else
        {   // 75% raid hit by default
            bonedustHealing *= 0.75;
        }

        state.healingDone['Bonedust Brew'] = (state.healingDone['Bonedust Brew'] || 0) + bonedustHealing;

        if (checkBuffActive(state.activeBuffs, "Primordial Mending")){
            state.T284pcwindow['Bonedust Brew'] = (state.T284pcwindow['Bonedust Brew'] || 0) + bonedustHealing; 
        }
    }
    else if (state.settings.misc.includes("BB")) // Simulate second legendary
    {
        const emenigroupbonus = (0.8 * convertPPMToUptime(1.5, 10));
        // Hits 75% of predicted hits
        const emenibonus = healingVal * (0.13 * convertPPMToUptime(1.5, 10));
        let bonedustHealing = (healingVal + emenibonus) * 0.5 * 0.4 * 1.8 * 0.75 * 0.256

        if (state.settings.misc.includes("BDB40"))
        {
            bonedustHealing *= 0.4;
        }
        else if (state.settings.misc.includes("BDB60"))
        {
            bonedustHealing *= 0.6;
        }
        else if (state.settings.misc.includes("BDB90"))
        {
            bonedustHealing *= 0.9;
        }
        else
        {   // 75% raid hit by default
            bonedustHealing *= 0.75;
        }

        state.healingDone['Bonedust Brew (Bountiful Brew)'] = (state.healingDone['Bonedust Brew (Bountiful Brew)'] || 0) + bonedustHealing;
        state.healingDone['Emeni (Bountiful Brew)'] = (state.healingDone['Emeni (Bountiful Brew)'] || 0) + emenibonus;
        state.healingDone['Emeni Group bonus'] = (state.healingDone['Emeni (Bountiful Brew)'] || 0) + emenibonus;

        if (checkBuffActive(state.activeBuffs, "Primordial Mending")){
            state.T284pcwindow['Bonedust Brew (Bountiful Brew)'] = (state.T284pcwindow['Bonedust Brew (Bountiful Brew)'] || 0) + bonedustHealing;
            state.T284pcwindow['Emeni (Bountiful Brew)'] = (state.T284pcwindow['Emeni (Bountiful Brew)'] || 0) + emenibonus;
        }
    }

    
    
    if (checkBuffActive(state.activeBuffs, "Empowered Chrysalis")) {
        const chrysalisSize = (healingVal / (1 - spell.overheal * T284pcOverhealMultiplier) * (spell.overheal * T284pcOverhealMultiplier) * 0.1)
        state.healingDone['Empowered Chrysalis'] = (state.healingDone['Empowered Chrysalis'] || 0) + chrysalisSize;

        if (checkBuffActive(state.activeBuffs, "Primordial Mending")){
            state.T284pcwindow['Empowered Chrysalis'] = (state.T284pcwindow['Empowered Chrysalis'] || 0) + chrysalisSize; 
        }
    }
}

/**
 * Run a full cast sequence. This is where most of the work happens. It runs through a short ramp cycle in order to compare the impact of different trinkets, soulbinds, stat loadouts,
 * talent configurations and more. Any effects missing can be easily included where necessary or desired.
 * @param {} sequence A sequence of spells representing a ramp. Note that in two ramp cycles like alternating Fiend / Boon this function will cover one of the two (and can be run a second
 * time for the other).
 * @param {*} stats A players base stats that are found on their gear. This doesn't include any effects which we'll apply in this function.
 * @param {*} settings Any special settings. We can include soulbinds, legendaries and more here. Trinkets should be included in the cast sequence itself and conduits are handled below.
 * @param {object} conduits Any conduits we want to include. The conduits object is made up of {ConduitName: ConduitLevel} pairs where the conduit level is an item level rather than a rank.
 * @returns The expected healing of the full ramp.
 */
export const runCastSequence = (sequence, stats, settings = {}, conduits, runcount = 1) => {
    //console.log("Running cast sequence");

    let state = {t: 0, activeBuffs: [], healingDone: {}, damageDone: {}, conduits: {}, manaSpent: 0, settings: settings, conduits: conduits, T284pcwindow: {}, tierhits: 0}

    let nextSpell = 0;
    let tracker = 0; 
    
    const spells = applyLoadoutEffects(deepCopyFunction(MONKSPELLS), state.settings, state.conduits, state)
    if (state.settings.legendaries.includes("Ancient Teachings of the Monastery"))
    {
        state.activeBuffs.push({name: "Ancient Teachings of the Monastery", buffType: "special", expiration: 999});
    }

    let seq = [...sequence];

    for (var run = 1; run < runcount; run += 1)
    {
        seq = seq.concat(sequence);
    }

    // The length of any given sequence. Note that each ramp is calculated separately and then summed so this only has to cover a single ramp.
    // This is the length of time after a sequence begins that the healing is cut off.
    let sequenceLength = 40; 
    sequenceLength *= runcount;
    const reporting = true; // A flag to report our sequences to console. Used for testing. 

    for (var t = 0; state.t < sequenceLength; state.t += 0.01) {

        const healBuffs = state.activeBuffs.filter(function (buff) {return (buff.buffType === "heal" || buff.buffType === "function") && state.t >= buff.next})
        
        if (healBuffs.length > 0) {
            healBuffs.forEach((buff) => {
                let currentStats = {...stats};
                state.currentStats = getCurrentStats(currentStats, state.activeBuffs)

                if (buff.buffType === "heal") {
                    const spell = buff.attSpell;
                    runHeal(state, spell, buff.name)
                }
                else if (buff.buffType === "function") {
                    const func = buff.attFunction;
                    func(state);
                }


                buff.next = buff.next + (buff.tickRate / getHaste(state.currentStats));
                //console.log("Buff next: " + buff.next);

    
            });  
        }

        const expiringHots = state.activeBuffs.filter(function (buff) {return buff.buffType === "heal" && state.t >= buff.expiration})
        expiringHots.forEach(buff => {
            const tickRate = buff.tickRate / getHaste(state.currentStats)
            const partialTickPercentage = (buff.next - state.t) / tickRate;
            const spell = buff.attSpell;
            runHeal(state, spell, buff.name, partialTickPercentage)
        })
        // Clear slate of old buffs.
        state.activeBuffs = state.activeBuffs.filter(function (buff) {return state.t < buff.expiration});

        // This is a check of the current time stamp against the tick our GCD ends and we can begin our queued spell.
        // It'll also auto-cast Ascended Eruption if Boon expired.
        if ((state.t > nextSpell && seq.length > 0))  {
            const spellName = seq.shift();
            const fullSpell = spells[spellName];
            

            // Update current stats for this combat tick.
            // Effectively base stats + any current stat buffs.
            let currentStats = {...stats};
            state.currentStats = getCurrentStats(currentStats, state.activeBuffs);
            state.manaSpent += (fullSpell[0].cost * state.currentStats.manaMod) || 0;

            // We'll iterate through the different effects the spell has.
            // Smite for example would just trigger damage (and resulting atonement healing), whereas something like Mind Blast would trigger two effects (damage,
            // and the absorb effect).
            fullSpell.forEach(spell => {
                
                // The spell has a healing component. Add it's effective healing.
                // Power Word: Shield is included as a heal, since there is no functional difference for the purpose of this calculation.
                if (spell.type === 'heal') {
                    runHeal(state, spell, spellName)
                }
                
                // The spell has a damage component. Add it to our damage meter, and heal based on how many atonements are out.
                else if (spell.type === 'damage') {
                    //const activeAtonements = getActiveAtone(atonementApp, t); // Get number of active atonements.

                    runDamage(state, spell, spellName)
                }

                // The spell adds a buff to our player.
                // We'll track what kind of buff, and when it expires.
                else if (spell.type === "buff") {
                    if (spell.buffType === "stats" || spell.buffType == "statsMult") {
                        state.activeBuffs.push({name: spellName, expiration: state.t + spell.buffDuration, buffType: spell.buffType, value: spell.value, stat: spell.stat});
                    }
                    else if (spell.buffType === "heal") {
                        const newBuff = {name: spellName, buffType: "heal", attSpell: spell,
                            tickRate: spell.tickRate, next: state.t + (spell.tickRate / getHaste(state.currentStats))}
                        newBuff['expiration'] = spell.hastedDuration ? state.t + (spell.buffDuration / getHaste(currentStats)) : state.t + spell.buffDuration

                        state.activeBuffs.push(newBuff)
                    }
                    else if (spell.buffType === "function") {
                        const newBuff = {name: spellName, buffType: "function", attFunction: spell.function,
                            tickRate: spell.tickRate, next: state.t + (spell.tickRate / getHaste(state.currentStats))}
                        newBuff['expiration'] = spell.hastedDuration ? state.t + (spell.buffDuration / getHaste(state.currentStats)) : state.t + spell.buffDuration

                        state.activeBuffs.push(newBuff)
                    }
                    else {
                        state.activeBuffs.push({name: spellName, expiration: state.t + spell.buffDuration});
                    }
                }
                else if (spell.type === "special") {
                    
                    spell.runFunc(state);
                }
   

            });   

            // This represents the next timestamp we are able to cast a spell. This is equal to whatever is higher of a spells cast time or the GCD.
            if (!('offGCD' in fullSpell[0])) nextSpell += fullSpell[0].castTime > 0 ? (fullSpell[0].castTime / getHaste(state.currentStats)) : 1.5 / getHaste(state.currentStats);
            //console.log("Current spell: " + spellName + ". Next spell at: " + nextSpell);
        }

        // Get the "real time" of the sequence's casts
        if (seq.length === 0 && state.sequenceLength === undefined) {
            state.sequenceLength = state.t; 
        }
    }


    // Add up our healing values (including atonement) and return it.

    const sumValues = obj => {
        if (Object.values(obj).length > 0) return Object.values(obj).reduce((a, b) => a + b);
        else return 0;
    }
    //printHealing(state.healingDone, sumValues, sequenceLength, state.manaSpent * 50000 / 100);
    //printDamage(state.damageDone, sumValues, sequenceLength, state.manaSpent * 50000 / 100)

    const totalHealing = sumValues(state.healingDone);
    const totalDamage = sumValues(state.damageDone);
    const manaSpent = state.manaSpent * 50000 / 100


    state.hpm = Math.round(totalHealing / manaSpent*100)/100; // Round to 2dp
    state.hps = Math.round(totalHealing / state.sequenceLength * 100)/100;  // Round to 2dp
    state.dps = Math.round(totalDamage / state.sequenceLength * 100)/100;  // Round to 2dp
    state.sequenceLength /= runcount;
    state.tierhits /= runcount;
    state.totalHealing = Math.round(totalHealing)
    state.total4pcWindow = Math.round(sumValues(state.T284pcwindow))
    state.totalDamage = Math.round(totalDamage)
    return state;

}

const printHealing = (healingDone, sumValues, duration, manaSpent) => {
    const totalHealing = sumValues(healingDone);
    const sources = {}

    for (const heal in healingDone) {
        sources[heal] = (Math.round(healingDone[heal]) + " (" + Math.round(healingDone[heal] / totalHealing * 10000)/100 + "%)")
    }
    console.log(sources);
    console.log("HPS: " + totalHealing / duration + ". HPM: " + totalHealing / manaSpent)
    console.log("Total Mana Spend: " + manaSpent + " (net " + ((duration / 5 * 2000) - manaSpent) + ")");
}

const printDamage = (damageDone, sumValues, duration, manaSpent) => {
    const totalDamage = sumValues(damageDone);
    const sources = {}

    for (const dam in damageDone) {
        sources[dam] = (Math.round(damageDone[dam]) + " (" + Math.round(damageDone[dam] / totalDamage * 10000)/100 + "%)")
    }
    console.log(sources);
    console.log("DPS: " + totalDamage / duration + ". DPM: " + totalDamage / manaSpent)
}

// This is a boilerplate function that'll let us clone our spell database to avoid making permanent changes.
const deepCopyFunction = (inObject) => {
    let outObject, value, key;
  
    if (typeof inObject !== "object" || inObject === null) {
      return inObject; // Return the value if inObject is not an object
    }
  
    // Create an array or object to hold the values
    outObject = Array.isArray(inObject) ? [] : {};
  
    for (key in inObject) {
      value = inObject[key];
  
      // Recursively (deep) copy for nested objects, including arrays
      outObject[key] = deepCopyFunction(value);
    }
  
    return outObject;
  };

