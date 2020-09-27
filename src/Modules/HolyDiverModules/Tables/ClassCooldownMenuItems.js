import React from "react";
import { MenuItem } from "@material-ui/core";
import AuraMasteryIcon from "../../../Images/Classes/Paladin/Specialisation/Holy/Icons/AuraMastery.jpg";
import AvengingWrathIcon from "../../../Images/Classes/Paladin/Specialisation/Holy/Icons/AvengingWrath.jpg";
import DivineHymnIcon from "../../../Images/Classes/Priest/Specialisation/Holy/Icons/DivineHymn.jpg";
import EvangelismIcon from "../../../Images/Classes/Priest/Specialisation/Discipline/Icons/Evangelism.jpg";
import HealingTideTotemIcon from "../../../Images/Classes/Shaman/Specialisation/Restoration/Icons/HealingTideTotem.jpg";
import PowerWordBarrierIcon from "../../../Images/Classes/Priest/Specialisation/Discipline/Icons/PowerWordBarrier.jpg";
import RevivalIcon from "../../../Images/Classes/Monk/Specialisation/Mistweaver/Icons/Revival.jpg";
import SalvationIcon from "../../../Images/Classes/Priest/Specialisation/Holy/Icons/Salvation.jpg";
import SpiritLinkTotemIcon from "../../../Images/Classes/Shaman/Specialisation/Restoration/Icons/SpiritLinkTotem.jpg";
import TranquilityIcon from "../../../Images/Classes/Druid/Specialisation/Restoration/Icons/Tranquility.jpg";
import TreeofLifeIcon from "../../../Images/Classes/Druid/Specialisation/Restoration/Icons/TreeofLife.jpg";
import Divider from "@material-ui/core/Divider";

export default function ClassCooldownMenuItems(props) {
  // Paladin Cooldowns
  if (props === "Holy Paladin") {
    return [
      <MenuItem value={"Aura Mastery"}>
        <a data-wowhead="spell=31821">
          <img
            style={{
              height: 20,
              width: 20,
              padding: "0px 5px 0px 5px",
              verticalAlign: "middle",
            }}
            src={AuraMasteryIcon}
            alt="Aura Mastery"
          />
        </a>
        Aura Mastery
      </MenuItem>,
      <Divider />,
      <MenuItem value={"Avenging Wrath"}>
        <a data-wowhead="spell=31884">
          <img
            style={{
              height: 20,
              width: 20,
              padding: "0px 5px 0px 5px",
              verticalAlign: "middle",
            }}
            src={AvengingWrathIcon}
            alt="Avenging Wrath"
          />
        </a>
        Avenging Wrath
      </MenuItem>,
    ];
  }
  // Restoration Druid
  if (props === "Restoration Druid") {
    return [
      <MenuItem value={"Tranquility"}>
        <a data-wowhead="spell=740">
          <img
            style={{
              height: 20,
              width: 20,
              padding: "0px 5px 0px 5px",
              verticalAlign: "middle",
            }}
            src={TranquilityIcon}
            alt="Tranquility"
          />
        </a>
        Tranquility
      </MenuItem>,
      <Divider />,
      <MenuItem value={"Incarnation: Tree of Life"}>
        <a data-wowhead="spell=33891">
          <img
            style={{
              height: 20,
              width: 20,
              padding: "0px 5px 0px 5px",
              verticalAlign: "middle",
            }}
            src={TreeofLifeIcon}
            alt="Incarnation: Tree of Life"
          />
        </a>
        Incarnation: Tree of Life
      </MenuItem>,
    ];
  }
  // Holy Priest
  if (props === "Holy Priest") {
    return [
      <MenuItem value={"Holy Word: Salvation"}>
        <a data-wowhead="spell=265202">
          <img
            style={{
              height: 20,
              width: 20,
              padding: "0px 5px 0px 5px",
              verticalAlign: "middle",
            }}
            src={SalvationIcon}
            alt="Holy Word: Salvation"
          />
        </a>
        Holy Word: Salvation
      </MenuItem>,
      <Divider />,
      <MenuItem value={"Divine Hymn"}>
        <a data-wowhead="spell=64843">
          <img
            style={{
              height: 20,
              width: 20,
              padding: "0px 5px 0px 5px",
              verticalAlign: "middle",
            }}
            src={DivineHymnIcon}
            alt="Divine Hymn"
          />
        </a>
        Divine Hymn
      </MenuItem>,
    ];
  }
  // Discipline Priest
  if (props === "Discispline Priest") {
    return [
      <MenuItem value={"Power Word: Barrier"}>
        <a data-wowhead="spell=62618">
          <img
            style={{
              height: 20,
              width: 20,
              padding: "0px 5px 0px 5px",
              verticalAlign: "middle",
            }}
            src={PowerWordBarrierIcon}
            alt="Power Word: Barrier"
          />
        </a>
        Power Word: Barrier
      </MenuItem>,
      <Divider />,
      <MenuItem value={"Evangelism"}>
        <a data-wowhead="spell=246287">
          <img
            style={{
              height: 20,
              width: 20,
              padding: "0px 5px 0px 5px",
              verticalAlign: "middle",
            }}
            src={EvangelismIcon}
            alt="Evangelism"
          />
        </a>
        Evangelism
      </MenuItem>,
    ];
  }
  // Restoration Shaman
  if (props === "Restoration Shaman") {
    return [
      <MenuItem value={"Healing Tide Totem"}>
        <a data-wowhead="spell=108280">
          <img
            style={{
              height: 20,
              width: 20,
              padding: "0px 5px 0px 5px",
              verticalAlign: "middle",
            }}
            src={HealingTideTotemIcon}
            alt="Healing Tide Totem"
          />
        </a>
        Healing Tide Totem
      </MenuItem>,
      <Divider />,
      <MenuItem value={"Spirit Link Totem"}>
        <a data-wowhead="spell=98008">
          <img
            style={{
              height: 20,
              width: 20,
              padding: "0px 5px 0px 5px",
              verticalAlign: "middle",
            }}
            src={SpiritLinkTotemIcon}
            alt="Spirit Link Totem"
          />
        </a>
        Spirit Link Totem
      </MenuItem>,
    ];
  }
  // Mistweaver Monk
  if (props === "Mistweaver Monk") {
    return [
      <MenuItem value={"Revival"}>
        <a data-wowhead="spell=98008">
          <img
            style={{
              height: 20,
              width: 20,
              padding: "0px 5px 0px 5px",
              verticalAlign: "middle",
            }}
            src={RevivalIcon}
            alt="Revival"
          />
        </a>
        Revival
      </MenuItem>,
    ];
  }
  if (props === 0) {
    return [<MenuItem> No Class Selected </MenuItem>];
  }
}