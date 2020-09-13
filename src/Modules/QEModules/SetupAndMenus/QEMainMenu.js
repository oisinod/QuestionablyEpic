import React, { Component } from "react";
import ReactDOM from "react-dom";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";

import logo from "../../../Images/QeAssets/QELogo.png";
import MenuIcon from "@material-ui/icons/Menu";
import "./QEMainMenu.css";
import Avatar from "@material-ui/core/Avatar";

import Box from "@material-ui/core/Box";
import Player from "../Player/Player";
import QEHeader from "./QEHeader";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CharComponent from "./CharComponent";
import CharCards from "./CharComponentGen";
import { Grid } from "@material-ui/core";
import AddNewChar from "./CharCreator";

// Warning: If a button name has to change, do it in the translation files. Consider the titles here to be ID's rather than strings.
const mainMenuOptions = {
  "Top Gear": "/topgear",
  "Gear Quick Compare": "/quickcompare",
  "Trinket Quick Compare": "/trinkets",
  "Legendary Analysis": "/legendaries",
  "Explore Covenants": "/soulbinds",
  "Cooldown Planner": "/holydiver",
};

// <p>{props.pl.getSpec()}</p>

export default function QEMainMenu(props) {
  const { t, i18n } = useTranslation();

  return (
    <div style={{ backgroundColor: "#353535" }}>
      <div
        style={{
          margin: "auto",
          width: "45%",
          justifyContent: "center",
          display: "block",
        }}
      >
        <p className="headers">{t("MainMenuItemsH")}</p>
        <Grid container spacing={1}>
          {Object.keys(mainMenuOptions).map((key, index) => (
            // Buttons are translated and printed from a dictionary.
            <Grid item xs={6} key={index}>
              <Button
                key={index}
                variant="contained"
                color="primary"
                style={{
                  width: "100%",
                  height: "40px",
                  backgroundColor: "#c8b054",
                }}
                component={Link}
                to={mainMenuOptions[key]}
              >
                {t(key)}
              </Button>
            </Grid>
          ))}
        </Grid>

        <p className="headers">{t("MainMenuCharactersH")}</p>

        <Grid container spacing={2}>
          {props.allChars.getAllChar().length > 0
            ? props.allChars
                .getAllChar()
                .map((char, index) => (
                  <CharCards
                    key={index}
                    name={char.charName}
                    char={char}
                    cardType="Char"
                    allChars={props.allChars}
                    charUpdate={props.charUpdate}
                    isActive={index === props.allChars.activeChar}
                  />
                ))
            : ""}
          {props.allChars.getAllChar().length < 9 ? (
            <AddNewChar
              allChars={props.allChars}
              charUpdate={props.charUpdate}
            />
          ) : (
            ""
          )}
        </Grid>
      </div>
    </div>
  );
}