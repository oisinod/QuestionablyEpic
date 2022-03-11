import { getSiTHPS, applyConduit } from "./FallenOrderFormulas";
import { convertPPMToUptime } from "Retail/Engine/EffectFormulas/EffectUtilities"

const ID_VIVIFY = 116670;
const ID_RENEWING_MIST = 119611;
const ID_ENVELOPING_MIST = 124682;
const ID_ESSENCE_FONT = 191840;
const ID_CHI_JI_GOM = 343819;
const ID_SOOTHING_BREATH = 343737;
const ID_ENVELOPING_BREATH_ID = 325209;
const ID_FLS_EFHOT = 344006;
const ID_FLS = 345727;

export const getMonkSpecEffect = (effectName, player, contentType) => {
  let bonus_stats = {};

  // Tier Sets
  if (effectName === "Mistweaver T28-2") {
    // Mistweaver Monk Sepulcher tier set 2pc
    // -- This is a draft formula and it can be improved upon. --

    // NOTE: The extra hot duration afforded by the 2pc will be buffed by the 4pc. That should be included in the 4pc formula, NOT the 2pc formula. That way we can
    // avoid double dipping.
    const essenceFontCPM = player.getSpellCPM(191840, contentType) // EF Casts per minute.
    const extraHoT = 0.042 * 2 * 1.05 * player.getStatMultiplier("CRITVERS") * player.getStatPerc("Haste") * player.getInt();  
    const hotIncrease = 0.042 * 4 * 0.05 * player.getStatMultiplier("CRITVERS") * player.getStatPerc("Haste") * player.getInt();
    // Coefficient x num Ticks x 5% multi x avgHots per EF 
    // We automatically include the Rising Mist extension in the calculation
    const expectedOverhealing = 0.24;

    const oneRisingMist = 0.28 * player.getStatMultiplier("CRITVERS") * player.getInt() * 0.7; // 30% expected overhealing. Reasonably conservative.
    const risingMistDirect = oneRisingMist * essenceFontCPM * (1); // The additional healing from Rising Mist. We model this as 1 extra RM hit per Essence Font cast.
    const additionalGusts = 0; // The additional Gust of Mists afforded by the extra 2/4s of HoT uptime. This is of low value.    
    
    bonus_stats.hps = (((hotIncrease + extraHoT) * essenceFontCPM * 14 * (1 - expectedOverhealing))+risingMistDirect+additionalGusts) / 60;
  }
  else if (effectName === "Mistweaver T28-4") {
    // Mistweaver Monk Sepulcher tier set 2pc
    // -- This is a draft formula. --
    // We can also sequence this directly if necessary, but the numbers here are already heavily based around that model.
    const singleEvent = 450 * player.getStatMultiplier("CRITVERS"); // The amount of healing from a single 4pc proc.
    const avgEvents = 90 * player.getStatPerc("Haste"); // Average number of healing events in a 4pc window.
    const covMulti = {"night_fae": 1, "venthyr": 1, "necrolord": 1, "kyrian": 1}; // The average multiplier to the 4pc window for the chosen covenant. This is a combination of logs and spell sequencing. 

    bonus_stats.hps = singleEvent * avgEvents * covMulti[player.getCovenant()] / 60
  }

  else if (effectName === "Ancient Teachings of the Monastery") {
    const essenceFontCPM = player.getSpellCPM(ID_ESSENCE_FONT, contentType);
    const dpsDuringDuration = 1710; // this is a 75% parse
    const percentDPSApplied = 0.75; // Excluse things that don't apply to AtotM
    const multiplier = 2.5;
    const buffUptime = Math.min(1, (15 * essenceFontCPM) / 60); // Buff is given at the end of EF channel, so always gets full 15s
    const expectedOverhealing = 0.4; // Overhealing to match spell DB
    
    bonus_stats.hps = buffUptime * multiplier * percentDPSApplied * dpsDuringDuration * (1 - expectedOverhealing);
  } else if (effectName === "Clouded Focus") {
    // Do Math
    bonus_stats.hps = 0;
  } else if (effectName === "Tear of Morning") {
    const vivify = {
      cpm: player.getSpellCPM(ID_VIVIFY, contentType),
      hps: player.getSpellHPS(ID_VIVIFY, contentType),
      percentOnRemTargets: player.getSpecialQuery("percentVivifyOnRemTargets", contentType),
    };
    const envelopingMist = { cpm: player.getSpellCPM(ID_ENVELOPING_MIST, contentType), singleCast: player.getSingleCast(ID_ENVELOPING_MIST, contentType) };
    const renewingMist = {
      // might want to bump this up since people should be averaging more than 2.9
      avgStacks: 3.5, // Can be closely modelled as VivifyHits / VivifyCasts - 1
      oneSpread: player.getSingleCast(ID_RENEWING_MIST, contentType) / 1.5,
    }; // ReMs spread at their current duration, assume targets are picked based on ReM duration slightly.

    const HPSRem = (vivify.percentOnRemTargets * renewingMist.oneSpread * vivify.cpm) / 60;
    const vivifyCleaveRatio = (0.738 * renewingMist.avgStacks) / (0.738 * renewingMist.avgStacks + 1);
    const HPSViv = vivifyCleaveRatio * vivify.hps * 0.2;

    const HPSEnv = (envelopingMist.singleCast * renewingMist.avgStacks * envelopingMist.cpm * 0.2) / 60;

    bonus_stats.hps = HPSRem + HPSViv + HPSEnv;
    
  } else if (effectName === "Yu'lon's Whisper") {
    const thunderFocusTeaCPM = 1.8;
    const yulonSP = 1.8;
    const yulonExpectedOverhealing = 0.22;
    const yulonTargets = { Raid: 5.9, Dungeon: 3.2 };
    const yulonOneHeal = yulonSP * player.activeStats.intellect * player.getStatMultiplier("CRITVERS")  * (1 - yulonExpectedOverhealing);

    // TODO: Add toggle for 4pc
    const t284pcsethealing = 450 * player.getStatMultiplier("CRITVERS")  * (1 - yulonExpectedOverhealing);
    //const total4pchealing = t284pcsethealing * 2 * yulonTargets[contentType] * thunderFocusTeaCPM;
    const total4pchealing = 0;

    bonus_stats.hps = ((yulonOneHeal * yulonTargets[contentType] * thunderFocusTeaCPM) + total4pchealing) / 60;
  } else if (effectName === "Invoker's Delight") {
    // This is an attempt to model the extra casts you get in the Celestial window against it's mana cost.
    // It is an imperfect, but solid formula for a legendary that really only should be used in niche situations.

    const celestialUptime = (0.3 * 25) / 60;
    const celestialHPS = player.getSpecialQuery("HPSDuringCelestial", contentType);
    const celestialManaCostPerSecond = 1100;

    bonus_stats.hps = (celestialHPS - celestialManaCostPerSecond * player.getSpecialQuery("OneManaHealing", contentType)) * celestialUptime * 0.33;

  } else if (effectName === "Sinister Teachings") {

    // Since SiT is the standard playstyle and conduit power is also tied to it
    // SiT math has been moved to a different file in order to keep the code DRY
    const netHPS = applyConduit(getSiTHPS(player, contentType), 11);
    
    bonus_stats.hps = netHPS;

  } else if (effectName === "Call to Arms"){
    const envbHealing = player.getSpellHPS(ID_ENVELOPING_BREATH_ID, contentType);
    const celestialDuration = .5;
    const hotDuration = .5;
    const envbHealingBoost = .05;
    // ~50% hot duration
    // ~50% of the casts
    const ctaEnvbHealing = envbHealing * celestialDuration * hotDuration;

    // Boosts all enveloping breath healing by 5%
    const healingDueToBoost = envbHealing * celestialDuration * envbHealingBoost + ctaEnvbHealing * (1 + envbHealingBoost);

    // deal with chi-ji
    // data will need to be updated to make this work
    // These are at full power so we just can assume 50% hits
    const chijiGOMHealing = player.getSpellHPS(ID_CHI_JI_GOM, contentType) * celestialDuration;
    
    bonus_stats.hps = ctaEnvbHealing + healingDueToBoost + chijiGOMHealing;
  } else if(effectName === "Faeline Harmony") {
    // Number of extra casts due to having legendary.
    // TODO: If already using the legendary set this to 0.
    const expectedFLSCPM = 6;
    const extraCastMulti = 0.6;
    let directHealingBonus = 0;
    if (player.getSpellCasts(ID_FLS, contentType)) directHealingBonus += player.getSpellCasts(ID_FLS, contentType) * extraCastMulti;
    if (player.getSpellCasts(ID_FLS_EFHOT, contentType)) directHealingBonus += player.getSpellCasts(ID_FLS_EFHOT, contentType) * extraCastMulti;
    
    // Get an approximation of healing from FLS and how many extra you get from the legendary itself (assuming you weren't using it before)
    const oneFLS = (0.416 * 0.45 + 0.472 * player.getStatMultiplier("HASTE") * 0.75) * player.activeStats.intellect * player.getStatMultiplier("CRITVERS") * 5; 
    const estimatedBonusCPM = expectedFLSCPM / 2; // 6 CPM, 3 from legendary bonus
    if (directHealingBonus < oneFLS * estimatedBonusCPM / 60) directHealingBonus = oneFLS * estimatedBonusCPM / 60;

    let flsCPM = 0;
    if (player.getSpellCPM(ID_FLS, contentType)) flsCPM += player.getSpellCPM(ID_FLS, contentType) * (1 + extraCastMulti);
    if (flsCPM < expectedFLSCPM) flsCPM = expectedFLSCPM; // Set to 6 avg if not being used at all

    const targetsHit = contentType === "Raid" ? 5/20 : 3/5; // Optimistc targets for dungeon, factors hitting tank being more value.
    const wastage = 0.7; // 30% of buff is wasted
    const buffHealingBonus = player.getHPS(contentType) * wastage * (0.08 * targetsHit * convertPPMToUptime(flsCPM, 10));

    bonus_stats.hps = buffHealingBonus + directHealingBonus;
  } else if (effectName === "Bountiful Brew") {
    //TODO apply conduit

    // 88% conduit, 25.6% uptime, 75% raid hit
    const emenibonus = player.getHPS(contentType) * (0.13 * convertPPMToUptime(1.5, 10));
    const effectData = {
      dupChance: 0.5,
      dupAmount: 0.4 * 1.88, // Includes conduit
      percRaidHit: 0.56,
      expectedUptime: 0.256,
    }
    const bonedustDam = (player.getHPS(contentType) + emenibonus) * effectData.dupChance * effectData.dupAmount * effectData.expectedUptime * effectData.percRaidHit;
    bonus_stats.hps = bonedustDam + emenibonus; 
  }else {
    bonus_stats.hps = -1;
  }

  return bonus_stats;
};
